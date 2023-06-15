import { Container } from 'hostConfig'
import { HostRoot } from './workTags'
import { FiberNode, FiberRootNode } from './fiber'
import {
  UpdateQueue,
  createUpdate,
  createUpdateQueue,
  enqueueUpdate
} from './updateQueue'
import { ReactElement } from 'shared/ReactTypes'
import { scheduleUpdateOnFiber } from './workLoop'
import { requestUpdateLane } from './fiberLanes'

export function createContainer(container: Container) {
  const hostRootFiber = new FiberNode(HostRoot, {}, null)
  const root = new FiberRootNode(container, hostRootFiber)
  hostRootFiber.updateQueue = createUpdateQueue()
  return root
}

export function updateContainer(
  element: ReactElement | null,
  root: FiberRootNode
) {
  const hostRootFiber = root.current
  const lane = requestUpdateLane()
  const update = createUpdate<ReactElement | null>(element, lane)
  enqueueUpdate(
    hostRootFiber.updateQueue as UpdateQueue<ReactElement | null>,
    update
  )
  scheduleUpdateOnFiber(hostRootFiber, lane)
  return element
}
