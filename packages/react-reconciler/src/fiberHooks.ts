import { FiberNode } from './fiber'
import internals from 'shared/internals'
import { Dispatcher, Dispatch } from 'react/src/currentDispatcher'
import {
  createUpdate,
  createUpdateQueue,
  enqueueUpdate,
  processUpdateQueue,
  UpdateQueue
} from './updateQueue'
import { Action } from 'shared/ReactTypes'
import { scheduleUpdateOnFiber } from './workLoop'

let currentlyRenderingFiber: FiberNode | null = null
let workInProgressHook: Hook | null = null
// only use in update
// trace hook in current FiberNode corresponding to currentlyRenderingFiber
// workInProgressHook is a newly created hook according to currentHook
let currentHook: Hook | null = null

const { currentDispatcher } = internals

interface Hook {
  memoizedState: any
  updateQueue: unknown
  next: Hook | null
}

export function renderWithHooks(wip: FiberNode) {
  currentlyRenderingFiber = wip
  // reset hooks linked list
  wip.memorizedState = null

  const current = wip.alternate

  if (current !== null) {
    // update
    currentDispatcher.current = HooksDispatcherOnUpdate
  } else {
    // mount
    currentDispatcher.current = HooksDispatcherOnMount
  }

  const Component = wip.type
  const props = wip.pendingProps
  const children = Component(props)

  // reset global variables
  currentlyRenderingFiber = null
  workInProgressHook = null
  currentHook = null
  return children
}

const HooksDispatcherOnMount: Dispatcher = {
  useState: mountState
}

const HooksDispatcherOnUpdate: Dispatcher = {
  useState: updateState
}

function updateState<State>(): [State, Dispatch<State>] {
  const hook = updateWorkInProgressHook()

  const queue = hook.updateQueue as UpdateQueue<State>
  const pending = queue.shared.pending

  if (pending !== null) {
    const { memorizedState } = processUpdateQueue(hook.memoizedState, pending)
    hook.memoizedState = memorizedState
  }

  return [hook.memoizedState, queue.dispatch as Dispatch<State>]
}

function mountState<State>(
  initialState: State | (() => State)
): [State, Dispatch<State>] {
  const hook = mountWorkInProgressHook()

  let memorizedState
  if (initialState instanceof Function) {
    memorizedState = initialState()
  } else {
    memorizedState = initialState
  }

  const queue = createUpdateQueue<State>()
  hook.updateQueue = queue
  hook.memoizedState = memorizedState

  // @ts-ignore
  const dispatch: Dispatch<State> = dispatchSetState.bind(
    null,
    currentlyRenderingFiber,
    queue
  )
  queue.dispatch = dispatch
  return [memorizedState, dispatch]
}

function dispatchSetState<State>(
  fiber: FiberNode,
  updateQueue: UpdateQueue<State>,
  action: Action<State>
) {
  const update = createUpdate(action)
  enqueueUpdate(updateQueue, update)
  scheduleUpdateOnFiber(fiber)
}

// find currently workInProgressHook
// actually return a newly created hook on mount
function mountWorkInProgressHook(): Hook {
  const hook: Hook = {
    memoizedState: null,
    updateQueue: null,
    next: null
  }
  // first hook in mount
  if (workInProgressHook === null) {
    // hook is not executed in a function component
    if (currentlyRenderingFiber === null) {
      throw new Error('Hooks can only be executed inside a function component')
    } else {
      workInProgressHook = hook
      currentlyRenderingFiber.memorizedState = hook
    }
  } else {
    // subsequent hook in mount
    workInProgressHook.next = hook
    workInProgressHook = hook
  }
  return workInProgressHook
}

function updateWorkInProgressHook(): Hook {
  let nextCurrentHook: Hook | null = null
  if (currentHook === null) {
    if (currentlyRenderingFiber === null) {
      throw new Error('Hooks can only be executed inside a function component')
    }
    // first hook in update
    const current = currentlyRenderingFiber.alternate
    if (current !== null) {
      nextCurrentHook = current.memorizedState
    } else {
      // only when currentlyRenderingFiber.alternate is null (onMount)
      nextCurrentHook = null
    }
  } else {
    // subsequent hook in update
    nextCurrentHook = currentHook.next
  }

  if (nextCurrentHook === null) {
    // number of hooks in this render is more than last render
    throw new Error(
      `${currentlyRenderingFiber?.type} rendered more hooks than during the previous render`
    )
  }

  currentHook = nextCurrentHook
  const newHook: Hook = {
    memoizedState: currentHook.memoizedState,
    updateQueue: currentHook.updateQueue,
    next: null
  }
  // first hook in update
  if (workInProgressHook === null) {
    // hook is not executed in a function component
    if (currentlyRenderingFiber === null) {
      throw new Error('Hooks can only be executed inside a function component')
    } else {
      workInProgressHook = newHook
      currentlyRenderingFiber.memorizedState = newHook
    }
  } else {
    // subsequent hook in mount
    workInProgressHook.next = newHook
    workInProgressHook = newHook
  }
  return workInProgressHook
}
