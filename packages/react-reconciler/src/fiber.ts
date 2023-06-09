import { Key, Props, ReactElement, Ref } from 'shared/ReactTypes'
import {
  ContextProvider,
  Fragment,
  FunctionComponent,
  HostComponent,
  WorkTag
} from './workTags'
import { Flags, NoFlags } from './fiberFlags'
import { Container } from 'hostConfig'
import { Lane, Lanes, NoLane, NoLanes } from './fiberLanes'
import { Effect } from './fiberHooks'
import { CallbackNode } from 'scheduler'
import { REACT_PROVIDER_TYPE } from 'shared/ReactSymbols'

export class FiberNode {
  public tag: WorkTag
  public key: Key
  public stateNode: any
  public type: any
  public ref: Ref

  // construct tree
  public return: FiberNode | null
  public sibling: FiberNode | null
  public child: FiberNode | null
  public index: number

  // as work unit
  public pendingProps: Props | null
  public memoizedProps: Props | null
  public memorizedState: any
  public alternate: FiberNode | null
  public updateQueue: unknown
  public deletions: FiberNode[] | null

  public flags: Flags
  public subtreeFlags: Flags

  constructor(tag: WorkTag, pendingProps: Props, key: Key = null) {
    // e.g. for functional component, this is FunctionalComponent(0)
    this.tag = tag
    this.key = key
    // e.g. pointer for HostRoot to FiberRootNode (the parent of HostRoot FiberNode), or DOM Element
    this.stateNode = null
    // e.g. for functional component, this is the function itself
    this.type = null
    this.ref = null
    // parent FiberNode, where should it return when it finishes
    this.return = null
    // sibling FiberNode
    this.sibling = null
    // child FiberNode
    this.child = null
    // index in parent's children
    this.index = 0

    // props when work unit ready to work
    this.pendingProps = pendingProps
    // props when work unit finished work
    this.memoizedProps = null
    this.memorizedState = null
    // use double buffering, one is current and the other is workInProgress
    // alternate is for switch between current fiber node and workInProgress fiber node
    this.alternate = null
    // for update state
    this.updateQueue = null

    // side effect
    this.flags = NoFlags
    this.subtreeFlags = NoFlags
    this.deletions = null
  }
}

export interface PendingPassiveEffects {
  unmount: Effect[]
  update: Effect[]
}

export class FiberRootNode {
  public container: Container
  public current: FiberNode
  public finishedWork: FiberNode | null
  public pendingLanes: Lanes
  public finishedLane: Lane
  public pendingPassiveEffects: PendingPassiveEffects
  public callbackNode: CallbackNode | null
  public callbackPriority: Lane

  constructor(container: Container, hostRootFiber: FiberNode) {
    this.container = container
    this.current = hostRootFiber
    hostRootFiber.stateNode = this
    this.finishedWork = null
    this.pendingLanes = NoLanes
    this.finishedLane = NoLane
    this.pendingPassiveEffects = {
      unmount: [],
      update: []
    }
    this.callbackNode = null
    this.callbackPriority = NoLane
  }
}

export const createWorkInProgress = (
  current: FiberNode,
  pendingProps: Props
): FiberNode => {
  // double buffering, the alternate is the workInProgress
  let wip = current.alternate
  if (wip === null) {
    // mount
    wip = new FiberNode(current.tag, pendingProps, current.key)
    wip.stateNode = current.stateNode
    wip.alternate = current
    current.alternate = wip
  } else {
    // update
    wip.pendingProps = pendingProps
    wip.flags = NoFlags
    wip.deletions = null
  }
  wip.type = current.type
  wip.updateQueue = current.updateQueue
  wip.child = current.child

  wip.ref = current.ref
  wip.memoizedProps = current.memoizedProps
  wip.memorizedState = current.memorizedState
  return wip
}

export function createFiberFromElement(element: ReactElement) {
  const { type, key, props, ref } = element
  let fiberTag: WorkTag = FunctionComponent
  // such as 'div'
  if (typeof type === 'string') {
    fiberTag = HostComponent
  } else if (
    typeof type === 'object' &&
    type.$$typeof === REACT_PROVIDER_TYPE
  ) {
    fiberTag = ContextProvider
  } else if (typeof type !== 'function' && __DEV__) {
    console.error('Unknown element type: ', type)
  }
  const fiber = new FiberNode(fiberTag, props, key)
  fiber.type = type
  fiber.ref = ref
  return fiber
}

export function createFiberFromFragment(elements: any[], key: Key): FiberNode {
  const fiber = new FiberNode(Fragment, elements, key)
  return fiber
}
