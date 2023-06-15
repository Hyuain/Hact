import { beginWork } from './beginWork'
import { completeWork } from './completeWork'
import { FiberNode, FiberRootNode, createWorkInProgress } from './fiber'
import { HostRoot } from './workTags'
import { MutationMask, NoFlags } from './fiberFlags'
import { commitMutationEffects } from './commitWork'
import {
  getHighestPriorityLane,
  Lane,
  markRootFinished,
  mergeLanes,
  NoLane,
  SyncLane
} from './fiberLanes'
import { flushSyncCallbacks, scheduleSyncCallback } from './syncTaskQueue'
import { scheduleMicroTask } from 'hostConfig'

let workInProgress: FiberNode | null = null
let wipRootRenderLane: Lane = NoLane

// initialization
function prepareRefreshStack(root: FiberRootNode, lane: Lane) {
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
  if (updateLane === NoLane) {
    return
  }
  if (updateLane === SyncLane) {
    // sync priority, use micro task to schedule
    if (__DEV__) {
      console.log('use micro task to schedule, priority:', updateLane)
    }
    scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root, updateLane))
    scheduleMicroTask(flushSyncCallbacks)
  } else {
    // other priority, use macro task to schedule
  }
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

// entrance of render phase
function performSyncWorkOnRoot(root: FiberRootNode | null, lane: Lane) {
  if (root === null) {
    console.error('root is null')
    return
  }
  const nextLane = getHighestPriorityLane(root.pendingLanes)
  if (nextLane !== SyncLane) {
    // others priority lower than sync, or NoLane
    ensureRootIsScheduled(root)
    return
  }

  console.warn('RENDER! performSyncWorkOnRoot, lane: ', lane)

  prepareRefreshStack(root, lane)
  while (true) {
    try {
      workLoop()
      break
    } catch (e) {
      if (__DEV__) {
        console.warn('workLoop error: ', e)
      }
      workInProgress = null
    }
  }
  // the whole wip FiberNode tree
  const finishedWork = root.current.alternate
  root.finishedWork = finishedWork
  root.finishedLane = lane
  wipRootRenderLane = NoLane

  // commit using flags in wip FiberNode tree
  commitRoot(root)
}

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

  // check flags and subtreeFlags to determinate whether to run 3 phases:
  // beforeMutation, mutation, layout
  const subtreeHasEffects =
    (finishedWork.subtreeFlags & MutationMask) !== NoFlags
  const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags
  if (subtreeHasEffects || rootHasEffect) {
    // beforeMutation
    // mutation
    commitMutationEffects(finishedWork)
    // let finishedWork Fiber tree be current Fiber tree (double cache)
    root.current = finishedWork
    // layout
  } else {
    root.current = finishedWork
  }
}

function workLoop() {
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
