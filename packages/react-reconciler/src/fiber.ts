import { Key, Props, Ref } from 'shared/ReactTypes'
import { WorkTag } from './workTags'
import { Flags, NoFlags } from './fiberFlags'

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
  public alternate: FiberNode | null
  public flags: Flags

  constructor(tag: WorkTag, pendingProps: Props, key: Key) {
    // e.g. for functional component, this is FunctionalComponent(0)
    this.tag = tag
    this.key = key
    // e.g. HostComponent <div>
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
    // use for switch between current fiber node and workInProgress fiber node
    this.alternate = null
    // side effect
    this.flags = NoFlags
  }
}
