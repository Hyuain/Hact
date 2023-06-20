import {
  appendInitialChild,
  Container,
  createInstance,
  createTextInstance,
  Instance
} from 'hostConfig'
import { FiberNode } from './fiber'
import {
  ContextProvider,
  Fragment,
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText
} from './workTags'
import { NoFlags, Ref, Update } from './fiberFlags'
import { popProvider } from './fiberContext'

// dfs 递归中的“归”
// construct off-screen DOM tree for Host
export const completeWork = (wip: FiberNode) => {
  const newProps = wip.pendingProps
  const current = wip.alternate

  switch (wip.tag) {
    case HostComponent:
      if (current !== null && wip.stateNode) {
        // update
        // TODO: need to check whether to markUpdate
        markUpdate(wip)
        // mark ref
        if (current.ref !== wip.ref) {
          markRef(wip)
        }
      } else {
        // mount
        // 1. construct DOM
        const instance = createInstance(wip.type, newProps)
        // 2. append DOM into DOM Tree
        appendAllChildren(instance, wip)
        wip.stateNode = instance
        // 3. mark ref
        if (wip.ref !== null) {
          markRef(wip)
        }
      }
      bubbleProperties(wip)
      return null
    case HostText:
      if (current !== null && wip.stateNode) {
        // update
        const oldText = current.memoizedProps.content
        const newText = newProps.content
        if (oldText !== newText) {
          markUpdate(wip)
        }
      } else {
        // mount
        const instance = createTextInstance(newProps.content)
        wip.stateNode = instance
      }
      bubbleProperties(wip)
      return null
    case HostRoot:
    case FunctionComponent:
    case Fragment:
      bubbleProperties(wip)
      return null
    case ContextProvider:
      const context = wip.type._context
      popProvider(context)
      bubbleProperties(wip)
      return null
    default:
      if (__DEV__) {
        console.error('No corresponding tag in completeWork: ', wip.tag)
      }
  }
}

function appendAllChildren(parent: Instance | Container, wip: FiberNode) {
  // get A's child, div
  let node = wip.child
  while (node !== null) {
    // just append nearest child DOM elements (Host), use constructed stateNode in child
    // will not append child's child DOM elements (Host), but will traverse child's sibling
    if (node.tag === HostComponent || node.tag === HostText) {
      appendInitialChild(parent, node?.stateNode)
    } else if (node.child) {
      // if not DOM element, traverse it's child
      node.child.return = node
      node = node.child
      continue
    }
    if (node === wip) {
      return
    }
    // when there is no more child, traverse sibling
    // if no sibling, traverse back to wip
    while (node.sibling === null) {
      if (node.return === null || node.return === wip) {
        return
      }
      node = node?.return
    }
    node.sibling.return = node.return
    node = node.sibling
  }
}

function bubbleProperties(wip: FiberNode) {
  let subtreeFlags = NoFlags
  let child = wip.child
  while (child !== null) {
    // bitOR
    subtreeFlags |= child.subtreeFlags
    subtreeFlags |= child.flags
    child.return = wip
    child = child.sibling
  }
  wip.subtreeFlags |= subtreeFlags
}

function markUpdate(fiber: FiberNode) {
  fiber.flags |= Update
}

function markRef(fiber: FiberNode) {
  fiber.flags |= Ref
}
