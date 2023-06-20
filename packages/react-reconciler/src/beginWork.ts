import { ReactElement, ReactProvider } from 'shared/ReactTypes'
import { FiberNode } from './fiber'
import { processUpdateQueue, UpdateQueue } from './updateQueue'
import {
  ContextProvider,
  Fragment,
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText
} from './workTags'
import { mountChildFibers, reconcileChildFibers } from './childFibers'
import { renderWithHooks } from './fiberHooks'
import { Lane } from './fiberLanes'
import { Ref } from './fiberFlags'
import { pushProvider } from './fiberContext'

// dfs 递归中的“递”
export const beginWork = (
  wip: FiberNode,
  renderLane: Lane
): FiberNode | null => {
  // compare and return child FiberNode
  switch (wip.tag) {
    case HostRoot:
      return updateHostRoot(wip, renderLane)
    case HostComponent:
      return updateHostComponent(wip)
    case HostText:
      // HostText ReactElement has no children
      return null
    case FunctionComponent:
      return updateFunctionComponent(wip, renderLane)
    case Fragment:
      return updateFragment(wip)
    case ContextProvider:
      return updateContextProvider(wip)
    default:
      if (__DEV__) {
        console.error('No corresponding tag in beginWork: ', wip.tag)
      }
  }
  return null
}

// ReactDOM.root().render(<App />)
// -> updateContainer(<App />, root), enqueueUpdate, update is ReactElement <App />
// -> ...
// -> beginWork(wip), wip is HostRoot
// -> updateHostRoot(wip), pending is update, update is ReactElement <App />
// -> processUpdateQueue, new memorizedState is ReactElement <App />
function updateHostRoot(wip: FiberNode, renderLane: Lane) {
  const baseState = wip.memorizedState
  const updateQueue = wip.updateQueue as UpdateQueue<ReactElement | null>
  const pending = updateQueue.shared.pending
  updateQueue.shared.pending = null
  const { memorizedState } = processUpdateQueue(baseState, pending, renderLane)
  wip.memorizedState = memorizedState

  const nextChildren = wip.memorizedState
  reconcileChildren(wip, nextChildren)
  return wip.child
}

// different from HostRoot, HostComponent can not trigger and process update
function updateHostComponent(wip: FiberNode) {
  const nextProps = wip.pendingProps
  const nextChildren = nextProps.children
  markRef(wip.alternate, wip)
  reconcileChildren(wip, nextChildren)
  return wip.child
}

function updateFunctionComponent(wip: FiberNode, renderLane: Lane) {
  const nextChildren = renderWithHooks(wip, renderLane)
  reconcileChildren(wip, nextChildren)
  return wip.child
}

function updateFragment(wip: FiberNode) {
  const nextChildren = wip.pendingProps
  reconcileChildren(wip, nextChildren)
  return wip.child
}

function updateContextProvider(wip: FiberNode) {
  const provider: ReactProvider<any> = wip.type
  const context = provider._context
  const oldProps = wip.memoizedProps
  const newProps = wip.pendingProps
  const newValue = newProps.value

  if (__DEV__ && !('value' in newProps)) {
    console.error('Missing value in context provider: ', provider)
  }

  if (newValue !== oldProps.value) {
    // TODO: dfs if any children consume context, mark component update, to make children of shouldComponentUpdate=false still update
  }

  pushProvider(context, newValue)

  const nextChildren = wip.pendingProps.children
  reconcileChildren(wip, nextChildren)
  return wip.child
}

// compare child's current FiberNode and ReactElement
// and generate wip FiberNode corresponding to child
function reconcileChildren(wip: FiberNode, children?: ReactElement) {
  // double buffering, the alternate is the current
  const current = wip.alternate
  // a small optimize for first render, side effect 'Placement' only happen once:
  // for <App />, current is null, go to mount
  // but for HostRoot Fiber (whose new memorized state, or child is <App />), current is not null, go to update
  // this help first render to mount children several times, without side effect such as 'Placement'
  // but update HostRoot only once, with side effect such as 'Placement'
  if (current !== null) {
    // update, with side effect
    wip.child = reconcileChildFibers(wip, current.child, children)
  } else {
    // mount, no side effect
    wip.child = mountChildFibers(wip, null, children)
  }
}

function markRef(current: FiberNode | null, wip: FiberNode) {
  const ref = wip.ref
  if (
    (current === null && ref !== null) ||
    (current !== null && current.ref !== ref)
  ) {
    wip.flags |= Ref
  }
}
