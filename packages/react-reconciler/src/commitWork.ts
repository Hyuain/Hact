import { FiberNode, FiberRootNode } from './fiber'
import {
  ChildDeletion,
  MutationMask,
  NoFlags,
  Placement,
  Update
} from './fiberFlags'
import {
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText
} from './workTags'
import {
  appendChildToContainer,
  commitUpdate,
  Container,
  insertChildToContainer,
  Instance,
  removeChild
} from 'hostConfig'

let nextEffect: FiberNode | null = null
export const commitMutationEffects = (finishedWork: FiberNode) => {
  // find children with flags recursively
  nextEffect = finishedWork
  while (nextEffect !== null) {
    // traverse down
    const child: FiberNode | null = nextEffect.child
    if (
      (nextEffect.subtreeFlags & MutationMask) !== NoFlags &&
      child !== null
    ) {
      nextEffect = child
    } else {
      // traverse up
      while (nextEffect !== null) {
        commitMutationEffectsOnFiber(nextEffect)
        const sibling: FiberNode | null = nextEffect.sibling
        if (sibling !== null) {
          nextEffect = sibling
          break
        }
        nextEffect = nextEffect.return
      }
    }
  }
}

const commitMutationEffectsOnFiber = (finishedWork: FiberNode) => {
  const flags = finishedWork.flags
  if ((flags & Placement) !== NoFlags) {
    commitPlacement(finishedWork)
    // reset flag
    finishedWork.flags &= ~Placement
  }
  if ((flags & Update) !== NoFlags) {
    commitUpdate(finishedWork)
    finishedWork.flags &= ~Update
  }
  if ((flags & ChildDeletion) !== NoFlags) {
    const deletions = finishedWork.deletions
    if (deletions !== null) {
      deletions.forEach((childToDelete) => {
        commitDeletion(childToDelete)
      })
    }
    finishedWork.flags &= ~ChildDeletion
  }
}

const commitDeletion = (childToDelete: FiberNode) => {
  let rootHost: FiberNode | null = null
  // traverse subtree
  commitNestedComponent(childToDelete, (unmountFiber) => {
    switch (unmountFiber.tag) {
      case HostComponent:
        if (rootHost === null) {
          rootHost = unmountFiber
        }
        // TODO: unmount ref
        return
      case HostText:
        if (rootHost === null) {
          rootHost = unmountFiber
        }
        return
      case FunctionComponent:
        // TODO useEffect unmount
        return
      default:
        if (__DEV__) {
          console.error('unhandled fiber tag: ', unmountFiber)
        }
    }
  })

  // remove host
  if (rootHost !== null) {
    const hostParent = getHostParent(rootHost)
    if (hostParent !== null) {
      removeChild((rootHost as FiberNode).stateNode, hostParent)
    }
  }
  childToDelete.return = null
  childToDelete.child = null
}

const commitNestedComponent = (
  root: FiberNode,
  onCommitUnmount: (fiber: FiberNode) => void
) => {
  let node = root
  while (true) {
    onCommitUnmount(node)
    // traverse down
    if (node.child !== null) {
      node.child.return = node
      node = node.child
      continue
    }
    if (node === root) {
      return
    }
    // traverse up
    while (node.sibling === null) {
      if (node.return === null || node.return === root) {
        return
      }
      node = node.return
    }
    node.sibling.return = node.return
    node = node.sibling
  }
}

const commitPlacement = (finishedWork: FiberNode) => {
  if (__DEV__) {
    console.warn('commitPlacement: ', finishedWork)
  }
  const hostParent = getHostParent(finishedWork) as Container
  const hostSibling = getHostSibling(finishedWork)

  appendChildOrInsertBeforeIntoContainer(finishedWork, hostParent, hostSibling)
}

function getHostSibling(fiber: FiberNode) {
  let node: FiberNode = fiber
  findSibling: while (true) {
    // if no siblings, traverse up to find host sibling
    while (node.sibling === null) {
      const parent = node.return
      if (
        parent === null ||
        parent.tag === HostComponent ||
        parent.tag === HostRoot
      ) {
        return null
      }
      node = parent
    }
    node.sibling.return = node.return
    node = node.sibling
    // if direct sibling is not host, traverse down to find host sibling
    while (node.tag !== HostText && node.tag !== HostComponent) {
      if ((node.flags & Placement) !== NoFlags) {
        // unstable host can not be host sibling
        continue findSibling
      }
      if (node.child === null) {
        continue findSibling
      } else {
        node.child.return = node
        node = node.child
      }
    }
    if ((node.flags & Placement) === NoFlags) {
      return node.stateNode
    }
  }
}

function getHostParent(fiber: FiberNode): Container | null {
  let parent = fiber.return
  while (parent) {
    const parentTag = parent.tag
    if (parentTag === HostComponent) {
      return parent.stateNode as Container
    }
    if (parentTag === HostRoot) {
      return (parent.stateNode as FiberRootNode).container
    }
    parent = parent.return
  }
  if (__DEV__) {
    console.error('No HostParent: ', parent)
  }
  return null
}

function appendChildOrInsertBeforeIntoContainer(
  finishedWork: FiberNode,
  hostParent: Container,
  before?: Instance
) {
  if (finishedWork.tag === HostComponent || finishedWork.tag === HostText) {
    if (before) {
      insertChildToContainer(finishedWork.stateNode, hostParent, before)
    } else {
      appendChildToContainer(hostParent, finishedWork.stateNode)
    }
    return
  }
  // traverse down to find the first host node to append
  const child = finishedWork.child
  if (child !== null) {
    appendChildOrInsertBeforeIntoContainer(child, hostParent)
    let sibling = child.sibling
    while (sibling !== null) {
      appendChildOrInsertBeforeIntoContainer(sibling, hostParent)
      sibling = sibling.sibling
    }
  }
}
