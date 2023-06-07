import { FiberNode } from './fiber'
import internals from 'shared/internals'
import { Dispatcher, Dispatch } from 'react/src/currentDispatcher'
import {
  createUpdate,
  createUpdateQueue,
  enqueueUpdate,
  UpdateQueue
} from './updateQueue'
import { Action } from 'shared/ReactTypes'
import { scheduleUpdateOnFiber } from './workLoop'

let currentlyRenderingFiber: FiberNode | null = null
let workInProgressHook: Hook | null = null

const { currentDispatcher } = internals

interface Hook {
  memoizedState: any
  updateQueue: unknown
  next: Hook | null
}

export function renderWithHooks(wip: FiberNode) {
  currentlyRenderingFiber = wip
  wip.memorizedState = null

  const current = wip.alternate

  if (current !== null) {
    // update
  } else {
    // mount
    currentDispatcher.current = HooksDispatcherOnMount
  }

  const Component = wip.type
  const props = wip.pendingProps
  const children = Component(props)

  currentlyRenderingFiber = null
  return children
}

const HooksDispatcherOnMount: Dispatcher = {
  useState: mountState
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
