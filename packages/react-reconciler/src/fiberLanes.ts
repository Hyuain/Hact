import { FiberRootNode } from './fiber'
import {
  unstable_getCurrentPriorityLevel,
  unstable_IdlePriority,
  unstable_ImmediatePriority,
  unstable_NormalPriority,
  unstable_UserBlockingPriority
} from 'scheduler'
import currentBatchConfig from 'react/src/currentBatchConfig'

export type Lane = number
export type Lanes = number

export const IdleLane = 0b10000
export const TransitionLane = 0b01000
export const DefaultLane = 0b00100
export const InputContinuousLane = 0b00010
export const SyncLane = 0b00001
export const NoLane = 0b00000
export const NoLanes = 0b00000

export function mergeLanes(a: Lane, b: Lane): Lanes {
  return a | b
}

export function requestUpdateLane() {
  // check is transition
  const isTransition = currentBatchConfig.transition !== null
  if (isTransition) {
    return TransitionLane
  }

  // get the schedulerPriority from current context, and convert to lane
  const currentSchedulerPriority = unstable_getCurrentPriorityLevel()
  const lane = schedulerPriorityToLane(currentSchedulerPriority)
  return lane
}

export function getHighestPriorityLane(lanes: Lanes): Lane {
  // the highest priority lane is the one with the lowest numeric value
  return lanes & -lanes
}

export function isSubsetOfLanes(set: Lanes, subset: Lane) {
  return (set & subset) === subset
}

export function markRootFinished(root: FiberRootNode, lane: Lane) {
  root.pendingLanes &= ~lane
}

export function lanesToSchedulerPriority(lanes: Lanes) {
  const lane = getHighestPriorityLane(lanes)
  if (lane === SyncLane) {
    return unstable_ImmediatePriority
  }
  if (lane === InputContinuousLane) {
    return unstable_UserBlockingPriority
  }
  if (lane === DefaultLane) {
    return unstable_NormalPriority
  }
  return unstable_IdlePriority
}

export function schedulerPriorityToLane(schedulerPriority: number) {
  if (schedulerPriority === unstable_ImmediatePriority) {
    return SyncLane
  }
  if (schedulerPriority === unstable_UserBlockingPriority) {
    return InputContinuousLane
  }
  if (schedulerPriority === unstable_NormalPriority) {
    return DefaultLane
  }
  return NoLane
}
