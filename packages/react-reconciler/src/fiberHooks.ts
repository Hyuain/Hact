import { FiberNode } from './fiber'
import internals from 'shared/internals'
import { Dispatcher, Dispatch } from 'react/src/currentDispatcher'
import currentBatchConfig from 'react/src/currentBatchConfig'
import {
  createUpdate,
  createUpdateQueue,
  enqueueUpdate,
  processUpdateQueue,
  Update,
  UpdateQueue
} from './updateQueue'
import { Action, Ref } from 'shared/ReactTypes'
import { scheduleUpdateOnFiber } from './workLoop'
import { Lane, NoLane, requestUpdateLane } from './fiberLanes'
import { Flags, PassiveEffect } from './fiberFlags'
import { HookHasEffect, Passive } from './hookEffectTags'

let currentlyRenderingFiber: FiberNode | null = null
let workInProgressHook: Hook | null = null
// only use in update
// trace hook in current FiberNode corresponding to currentlyRenderingFiber
// workInProgressHook is a newly created hook according to currentHook
let currentHook: Hook | null = null
let renderLane: Lane = NoLane

const { currentDispatcher } = internals

interface Hook {
  memoizedState: any
  updateQueue: unknown
  next: Hook | null
  baseState: any
  baseQueue: Update<any> | null
}

export interface Effect {
  tag: Flags
  create: EffectCallback | void
  // the return of last previously executed effect, used to destroy the previous effect
  destroy: EffectCallback | void
  deps: EffectDeps
  next: Effect | null
}

export interface FCUpdateQueue<State> extends UpdateQueue<State> {
  lastEffect: Effect | null
}

type EffectCallback = () => void
type EffectDeps = any[] | null

export function renderWithHooks(wip: FiberNode, lane: Lane) {
  currentlyRenderingFiber = wip
  // reset hooks linked list
  wip.memorizedState = null
  // rest effects linked list
  wip.updateQueue = null

  renderLane = lane

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
  renderLane = NoLane
  return children
}

const HooksDispatcherOnMount: Dispatcher = {
  useState: mountState,
  useEffect: mountEffect,
  useTransition: mountTransition,
  useRef: mountRef
}

const HooksDispatcherOnUpdate: Dispatcher = {
  useState: updateState,
  useEffect: updateEffect,
  useTransition: updateTransition,
  useRef: updateRef
}

// @ts-ignore
function updateRef<T>(initialValue: T | null): { current: T | null } {
  const hook = updateWorkInProgressHook()
  return hook.memoizedState
}

function mountRef<T>(initialValue: T | null): { current: T | null } {
  const hook = mountWorkInProgressHook()
  const ref: Ref<T> = { current: initialValue }
  hook.memoizedState = ref
  return ref
}

function updateTransition(): [boolean, (callback: () => void) => void] {
  const [isPending] = updateState<boolean>()
  const hook = updateWorkInProgressHook()
  const start = hook.memoizedState
  return [isPending, start]
}

function mountTransition(): [boolean, (callback: () => void) => void] {
  const [isPending, setPending] = mountState(false)
  const hook = mountWorkInProgressHook()
  const start = startTransition.bind(null, setPending)
  hook.memoizedState = start

  return [isPending, start]
}

function startTransition(setPending: Dispatch<boolean>, callback: () => void) {
  setPending(true)
  const prevTransition = currentBatchConfig.transition
  currentBatchConfig.transition = 1
  callback()
  setPending(false)
  currentBatchConfig.transition = prevTransition
}

function updateEffect(create: EffectCallback | void, deps: EffectDeps | void) {
  const hook = updateWorkInProgressHook()
  const nextDeps = deps === undefined ? null : deps
  let destory: EffectCallback | void

  if (currentHook !== null) {
    const prevEffect = currentHook.memoizedState!
    destory = prevEffect.destroy

    if (nextDeps !== null) {
      const prevDeps = prevEffect.deps
      if (areHookInputsEqual(nextDeps, prevDeps)) {
        hook.memoizedState = pushEffect(Passive, create, destory, nextDeps)
        return
      }
    }
    currentlyRenderingFiber!.flags |= PassiveEffect
    hook.memoizedState = pushEffect(
      Passive | HookHasEffect,
      create,
      destory,
      nextDeps
    )
  }
}

// shallow compare deps
function areHookInputsEqual(
  nextDps: EffectDeps,
  prevDeps: EffectDeps
): boolean {
  if (prevDeps === null || nextDps === null) {
    return false
  }
  for (let i = 0; i < prevDeps.length && i < nextDps.length; i++) {
    if (Object.is(prevDeps[i], nextDps[i])) {
      continue
    }
    return false
  }
  return true
}

function mountEffect(create: EffectCallback | void, deps: EffectDeps | void) {
  const hook = mountWorkInProgressHook()
  const nextDeps = deps === undefined ? null : deps
  currentlyRenderingFiber!.flags |= PassiveEffect
  hook.memoizedState = pushEffect(
    Passive | HookHasEffect,
    create,
    undefined,
    nextDeps
  )
}

function pushEffect(
  hookFlags: Flags,
  create: EffectCallback | void,
  destroy: EffectCallback | void,
  deps: EffectDeps
): Effect {
  const effect: Effect = {
    tag: hookFlags,
    create,
    destroy,
    deps,
    next: null
  }
  const fiber = currentlyRenderingFiber!
  const updateQueue = fiber.updateQueue as FCUpdateQueue<any>
  if (updateQueue === null) {
    const updateQueue = createFCUpdateQueue()
    fiber.updateQueue = updateQueue
    effect.next = effect
    updateQueue.lastEffect = effect
  } else {
    const lastEffect = updateQueue.lastEffect
    if (lastEffect === null) {
      effect.next = effect
      updateQueue.lastEffect = effect
    } else {
      const firstEffect = lastEffect.next
      lastEffect.next = effect
      effect.next = firstEffect
      updateQueue.lastEffect = effect
    }
  }
  return effect
}

function createFCUpdateQueue<State>() {
  const updateQueue = createUpdateQueue<State>() as FCUpdateQueue<State>
  updateQueue.lastEffect = null
  return updateQueue
}

function updateState<State>(): [State, Dispatch<State>] {
  const hook = updateWorkInProgressHook()

  const queue = hook.updateQueue as UpdateQueue<State>
  const baseState = hook.baseState
  const pending = queue.shared.pending
  let baseQueue = currentHook!.baseQueue

  if (pending !== null) {
    // merge baseQueue and pending: pendingLast -> baseQueueFirst -> pendingFirst
    if (baseQueue !== null) {
      const baseFirst = baseQueue.next
      const pendingFirst = pending.next
      baseQueue.next = pendingFirst
      pending.next = baseFirst
    }
    baseQueue = pending
    // save update in current, to keep the skipped updates still alive after high priority tasks commit
    currentHook!.baseQueue = pending
    queue.shared.pending = null
  }

  if (baseQueue !== null) {
    const {
      memorizedState,
      baseState: newBaseState,
      baseQueue: newBaseQueue
    } = processUpdateQueue(baseState, baseQueue, renderLane)
    hook.memoizedState = memorizedState
    hook.baseState = newBaseState
    hook.baseQueue = newBaseQueue
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
  hook.baseState = memorizedState

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
  const lane = requestUpdateLane()
  const update = createUpdate(action, lane)
  enqueueUpdate(updateQueue, update)
  scheduleUpdateOnFiber(fiber, lane)
}

// find currently workInProgressHook
// actually return a newly created hook on mount
function mountWorkInProgressHook(): Hook {
  const hook: Hook = {
    memoizedState: null,
    updateQueue: null,
    next: null,
    baseState: null,
    baseQueue: null
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
    next: null,
    baseState: currentHook.baseState,
    baseQueue: currentHook.baseQueue
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
