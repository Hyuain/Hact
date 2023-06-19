import { beginWork } from './beginWork'
import { completeWork } from './completeWork'
import {
  FiberNode,
  FiberRootNode,
  createWorkInProgress,
  PendingPassiveEffects
} from './fiber'
import { HostRoot } from './workTags'
import { MutationMask, NoFlags, PassiveMask } from './fiberFlags'
import {
  commitHookEffectListCreate,
  commitHookEffectListDestroy,
  commitHookEffectListUnmount,
  commitMutationEffects
} from './commitWork'
import {
  getHighestPriorityLane,
  Lane,
  lanesToSchedulerPriority,
  markRootFinished,
  mergeLanes,
  NoLane,
  SyncLane
} from './fiberLanes'
import { flushSyncCallbacks, scheduleSyncCallback } from './syncTaskQueue'
import { scheduleMicroTask } from 'hostConfig'
import {
  unstable_scheduleCallback as scheduleCallback,
  unstable_NormalPriority as NormalPriority,
  unstable_shouldYield,
  unstable_cancelCallback
} from 'scheduler'
import { HookHasEffect, Passive } from './hookEffectTags'

type RootExitStatus = number
const RootIncomplete = 1
const RootCompleted = 2

let workInProgress: FiberNode | null = null
let wipRootRenderLane: Lane = NoLane
let rootHasPassiveEffects = false

// initialization
function prepareRefreshStack(root: FiberRootNode, lane: Lane) {
  root.finishedLane = NoLane
  root.finishedWork = null
  workInProgress = createWorkInProgress(root.current, {})
  wipRootRenderLane = lane
}

export function scheduleUpdateOnFiber(fiber: FiberNode, lane: Lane) {
  const root = markUpdateFromFiberToRoot(fiber)
  if (root === null) {
    throw new Error('root is null')
  }
  markRootUpdated(root, lane)
  ensureRootIsScheduled(root)
}

// entrance of schedule phase
function ensureRootIsScheduled(root: FiberRootNode) {
  const updateLane = getHighestPriorityLane(root.pendingLanes)
  const existingCallback = root.callbackNode

  if (updateLane === NoLane) {
    if (existingCallback !== null) {
      unstable_cancelCallback(existingCallback)
    }
    root.callbackNode = null
    root.callbackPriority = NoLane
    return
  }

  const curPriority = updateLane
  const prevPriority = root.callbackPriority
  // new task (cur) has the same priority as the running task (prev), do not need new schedule
  // curPriority will remain the same as previously running task (prev)
  if (prevPriority === curPriority) {
    return
  }

  if (existingCallback !== null) {
    unstable_cancelCallback(existingCallback)
  }
  let newCallback = null

  if (updateLane === SyncLane) {
    // sync priority, use micro task to schedule
    if (__DEV__) {
      console.log('use micro task to schedule, priority:', updateLane)
    }
    scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root))
    scheduleMicroTask(flushSyncCallbacks)
  } else {
    // other priority, use macro task to schedule
    const schedulerPriority = lanesToSchedulerPriority(updateLane)
    newCallback = scheduleCallback(
      schedulerPriority,
      performConcurrentWorkOnRoot.bind(null, root)
    )
  }

  root.callbackNode = newCallback
  root.callbackPriority = curPriority
}

// mark lanes on root
function markRootUpdated(root: FiberRootNode, lane: Lane) {
  root.pendingLanes = mergeLanes(root.pendingLanes, lane)
}

// traverse from fiber to fiberRootNode
function markUpdateFromFiberToRoot(fiber: FiberNode): FiberRootNode | null {
  let node = fiber
  let parent = node.return
  while (parent) {
    node = parent
    parent = node.return
  }
  if (node.tag === HostRoot) {
    return node.stateNode
  }
  return null
}

// entrance of render phase (async)
function performConcurrentWorkOnRoot(
  root: FiberRootNode,
  didTimeout: boolean
): any {
  // ensure effect has been flushed, because useEffect may cause updates
  let curCallback = root.callbackNode
  const didFlushPassiveEffect = flushPassiveEffects(root.pendingPassiveEffects)
  if (didFlushPassiveEffect) {
    // a task with higher priority is scheduled in effect, stop current task
    if (root.callbackNode !== curCallback) {
      return null
    }
  }

  const lane = getHighestPriorityLane(root.pendingLanes)
  curCallback = root.callbackNode
  if (lane === NoLane) {
    return null
  }

  const needSync = lane === SyncLane || didTimeout
  const exitStatus = renderRoot(root, lane, !needSync)

  ensureRootIsScheduled(root)

  if (exitStatus === RootIncomplete) {
    if (root.callbackNode === curCallback) {
      // if after schedule, curCallback is the same as before schedule, it means no higher priority task is scheduled
      // and if we return a function, it will be scheduled again (according to scheduler implementation)
      // in this case, we continue scheduling current task
      return performConcurrentWorkOnRoot.bind(null, root)
    } else {
      // a task with higher priority is scheduled
      return null
    }
    // continue scheduling current task
  } else if (exitStatus === RootCompleted) {
    // the whole wip FiberNode tree
    const finishedWork = root.current.alternate
    root.finishedWork = finishedWork
    root.finishedLane = lane
    wipRootRenderLane = NoLane

    // commit using flags in wip FiberNode tree
    commitRoot(root)
  } else if (__DEV__) {
    console.error('unhandled async render exit status')
  }
}

// entrance of render phase (sync)
function performSyncWorkOnRoot(root: FiberRootNode | null) {
  if (root === null) {
    console.error('root is null')
    return
  }
  const nextLane = getHighestPriorityLane(root.pendingLanes)
  // other priorities lower than sync, or NoLane
  if (nextLane !== SyncLane) {
    ensureRootIsScheduled(root)
    return
  }

  const exitStatus = renderRoot(root, nextLane, false)
  if (exitStatus === RootCompleted) {
    // the whole wip FiberNode tree
    const finishedWork = root.current.alternate
    root.finishedWork = finishedWork
    root.finishedLane = nextLane
    wipRootRenderLane = NoLane

    // commit using flags in wip FiberNode tree
    commitRoot(root)
  } else {
    console.error('unhandled sync render exit status')
  }
}

function renderRoot(
  root: FiberRootNode,
  lane: Lane,
  shouldTimeSlice: boolean
): RootExitStatus {
  if (__DEV__) {
    console.warn(
      `RENDER! RenderRoot, lane: ${lane.toString(2)}. ${
        shouldTimeSlice ? 'Concurrent' : 'Sync'
      } update`
    )
  }

  if (wipRootRenderLane !== lane) {
    prepareRefreshStack(root, lane)
  }

  while (true) {
    try {
      shouldTimeSlice ? workLoopConcurrent() : workLoopSync()
      break
    } catch (e) {
      if (__DEV__) {
        console.warn('workLoop error: ', e)
      }
      workInProgress = null
    }
  }

  // execution has been interrupted
  if (shouldTimeSlice && workInProgress !== null) {
    return RootIncomplete
  }
  // error
  if (!shouldTimeSlice && workInProgress !== null && __DEV__) {
    console.error('wip should be null after renderRoot')
  }
  // TODO: error caught
  // execution has been completed
  return RootCompleted
}

// entrance of commit phase
function commitRoot(root: FiberRootNode) {
  const finishedWork = root.finishedWork
  if (finishedWork === null) {
    return
  }
  const lane = root.finishedLane
  if (lane === NoLane && __DEV__) {
    console.error('commitRoot: lane is NoLane')
  }
  if (__DEV__) {
    console.warn('COMMIT! commitRootStart: ', finishedWork)
  }

  // reset finishedWork and finishedLane
  root.finishedWork = null
  root.finishedLane = NoLane
  markRootFinished(root, lane)

  // check and schedule passive effects
  if (
    (finishedWork.flags & PassiveMask) !== NoFlags ||
    (finishedWork.subtreeFlags & PassiveMask) !== NoFlags
  ) {
    // prevent from executing multiple times
    if (!rootHasPassiveEffects) {
      rootHasPassiveEffects = true
      // schedule an async task, priority is NormalPriority
      scheduleCallback(NormalPriority, () => {
        // execute passive effects
        flushPassiveEffects(root.pendingPassiveEffects)
        return
      })
    }
  }

  // check flags and subtreeFlags to determinate whether to run 3 phases:
  // beforeMutation, mutation, layout
  const subtreeHasEffects =
    (finishedWork.subtreeFlags & (MutationMask | PassiveMask)) !== NoFlags
  const rootHasEffect =
    (finishedWork.flags & (MutationMask | PassiveMask)) !== NoFlags
  if (subtreeHasEffects || rootHasEffect) {
    // 1. beforeMutation
    // 2. mutation
    commitMutationEffects(finishedWork, root)
    // let finishedWork Fiber tree be current Fiber tree (double cache)
    root.current = finishedWork
    // 3. layout
  } else {
    root.current = finishedWork
  }

  rootHasPassiveEffects = false
  ensureRootIsScheduled(root)
}

function flushPassiveEffects(pendingPassiveEffects: PendingPassiveEffects) {
  let didFlushPassiveEffects = false
  pendingPassiveEffects.unmount.forEach((effect) => {
    didFlushPassiveEffects = true
    commitHookEffectListUnmount(Passive, effect)
  })
  pendingPassiveEffects.unmount = []

  pendingPassiveEffects.update.forEach((effect) => {
    didFlushPassiveEffects = true
    // only those effect marked as Passive and HookHasEffect will trigger destroy
    commitHookEffectListDestroy(Passive | HookHasEffect, effect)
  })
  // all the 'create' callback need to be executed after all the 'destroy' callback
  pendingPassiveEffects.update.forEach((effect) => {
    didFlushPassiveEffects = true
    commitHookEffectListCreate(Passive | HookHasEffect, effect)
  })
  pendingPassiveEffects.update = []

  // we may setState and dispatch update in callbacks of effects, so we need to flush
  flushSyncCallbacks()
  return didFlushPassiveEffects
}

function workLoopConcurrent() {
  while (workInProgress !== null && !unstable_shouldYield()) {
    performUnitOfWork(workInProgress)
  }
}

function workLoopSync() {
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress)
  }
}

function performUnitOfWork(fiber: FiberNode) {
  const next = beginWork(fiber, wipRootRenderLane)
  fiber.memoizedProps = fiber.pendingProps
  if (next === null) {
    completeUnitOfWork(fiber)
  } else {
    workInProgress = next
  }
}

function completeUnitOfWork(fiber: FiberNode) {
  let node: FiberNode | null = fiber
  while (node) {
    completeWork(node)
    const sibling = node.sibling
    if (sibling !== null) {
      workInProgress = sibling
      return
    }
    node = node.return
    workInProgress = node
  }
}
