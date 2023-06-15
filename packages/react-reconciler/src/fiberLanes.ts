import { FiberRootNode } from './fiber'

export type Lane = number
export type Lanes = number

export const SyncLane = 0b0001
export const NoLane = 0b0000
export const NoLanes = 0b0000

export function mergeLanes(a: Lane, b: Lane): Lanes {
  return a | b
}

export function requestUpdateLane() {
  return SyncLane
}

export function getHighestPriorityLane(lanes: Lanes): Lane {
  // the highest priority lane is the one with the lowest numeric value
  return lanes & -lanes
}

export function markRootFinished(root: FiberRootNode, lane: Lane) {
  root.pendingLanes &= ~lane
}
