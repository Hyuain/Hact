import { Key, Props, Ref } from 'shared/ReactTypes'
import { WorkTag } from './workTags'
import { Flags, NoFlags } from './fiberFlags'
import { Container } from 'hostConfig'

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

  public flags: Flags

  constructor(tag: WorkTag, pendingProps: Props, key: Key) {
    // e.g. for functional component, this is FunctionalComponent(0)
    this.tag = tag
    this.key = key
    // e.g. point to fiberRootNode
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
  }
}

export class FiberRootNode {
  public container: Container
  public current: FiberNode
  public finishedWork: FiberNode | null

  constructor(container: Container, hostRootFiber: FiberNode) {
    this.container = container
    this.current = hostRootFiber
    hostRootFiber.stateNode = this
    this.finishedWork = null
  }
}

export const createWorkInProgress = (
  current: FiberNode,
  pendingProps: Props
): FiberNode => {
  // double buffering, the alternate is the workInProgress
  let wip = current.alternate
  if (!wip) {
    // mount
    wip = new FiberNode(current.tag, pendingProps, current.key)
    wip.stateNode = current.stateNode
    wip.alternate = current
    current.alternate = wip
  } else {
    // update
    wip.pendingProps = pendingProps
    wip.flags = NoFlags
  }
  wip.type = current.type
  wip.updateQueue = current.updateQueue
  wip.child = current.child
  wip.memoizedProps = current.memoizedProps
  wip.memorizedState = current.memorizedState
  return wip
}
