import { FiberNode, FiberRootNode, PendingPassiveEffects } from './fiber'
import {
  ChildDeletion,
  Flags,
  LayoutMask,
  MutationMask,
  NoFlags,
  PassiveEffect,
  PassiveMask,
  Placement,
  Ref,
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
import { Effect, FCUpdateQueue } from './fiberHooks'
import { HookHasEffect } from './hookEffectTags'

let nextEffect: FiberNode | null = null
export const commitEffects = (
  phase: 'mutation' | 'layout',
  mask: Flags,
  callback: (fiber: FiberNode, root: FiberRootNode) => void
) => {
  return (finishedWork: FiberNode, root: FiberRootNode) => {
    // find children with flags recursively
    nextEffect = finishedWork
    while (nextEffect !== null) {
      // traverse down
      const child: FiberNode | null = nextEffect.child
      if ((nextEffect.subtreeFlags & mask) !== NoFlags && child !== null) {
        nextEffect = child
      } else {
        // traverse up
        while (nextEffect !== null) {
          callback(nextEffect, root)
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
}

const commitMutationEffectsOnFiber = (
  finishedWork: FiberNode,
  root: FiberRootNode
) => {
  const { flags, tag } = finishedWork
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
        commitDeletion(childToDelete, root)
      })
    }
    finishedWork.flags &= ~ChildDeletion
  }
  if ((flags & PassiveEffect) !== NoFlags) {
    commitPassiveEffect(finishedWork, root, 'update')
    finishedWork.flags &= ~PassiveEffect
  }
  if ((flags & Ref) !== NoFlags && tag === HostComponent) {
    safelyDetachRef(finishedWork)
    finishedWork.flags &= ~Ref
  }
}

function safelyDetachRef(fiber: FiberNode) {
  const ref = fiber.ref
  if (ref !== null) {
    if (typeof ref === 'function') {
      ref(null)
    } else {
      ref.current = null
    }
  }
}

export const commitMutationEffects = commitEffects(
  'mutation',
  MutationMask | PassiveMask,
  commitMutationEffectsOnFiber
)

const commitLayoutEffectsOnFiber = (finishedWork: FiberNode) => {
  const { flags, tag } = finishedWork
  if ((flags & Ref) !== NoFlags && tag === HostComponent) {
    safelyAttachRef(finishedWork)
    finishedWork.flags &= ~Ref
  }
}

function safelyAttachRef(fiber: FiberNode) {
  const ref = fiber.ref
  if (ref !== null) {
    const instance = fiber.stateNode
    if (typeof ref === 'function') {
      ref(instance)
    } else {
      ref.current = instance
    }
  }
}

export const commitLayoutEffects = commitEffects(
  'layout',
  LayoutMask,
  commitLayoutEffectsOnFiber
)

// collect passive callback of passive effects in to FiberRootNode
function commitPassiveEffect(
  fiber: FiberNode,
  root: FiberRootNode,
  type: keyof PendingPassiveEffects
) {
  if (
    fiber.tag !== FunctionComponent ||
    (type === 'update' && (fiber.flags & PassiveEffect) === NoFlags)
  ) {
    return
  }
  const updateQueue = fiber.updateQueue as FCUpdateQueue<any>
  if (updateQueue !== null) {
    if (updateQueue.lastEffect === null) {
      if (__DEV__) {
        console.error(
          'When FC has PassiveEffect flag, it should have effect list'
        )
      }
      return
    }
    root.pendingPassiveEffects[type].push(updateQueue.lastEffect)
  }
}

function commitHookEffectList(
  flags: Flags,
  lastEffect: Effect,
  callback: (effect: Effect) => void
) {
  let effect = lastEffect.next!
  do {
    if ((effect.tag & flags) === flags) {
      callback(effect)
    }
    effect = effect.next!
  } while (effect !== lastEffect.next)
}

export function commitHookEffectListUnmount(flags: Flags, lastEffect: Effect) {
  commitHookEffectList(flags, lastEffect, (effect) => {
    const destroy = effect.destroy
    if (typeof destroy === 'function') {
      destroy()
    }
    effect.tag &= ~HookHasEffect
  })
}

export function commitHookEffectListDestroy(flags: Flags, lastEffect: Effect) {
  commitHookEffectList(flags, lastEffect, (effect) => {
    const destroy = effect.destroy
    if (typeof destroy === 'function') {
      destroy()
    }
  })
}

export function commitHookEffectListCreate(flags: Flags, lastEffect: Effect) {
  commitHookEffectList(flags, lastEffect, (effect) => {
    const create = effect.create
    if (typeof create === 'function') {
      effect.destroy = create()
    }
  })
}

const recordHostsToDelete = (
  hostsToDelete: FiberNode[],
  unmountFiber: FiberNode
) => {
  const lastHost = hostsToDelete[hostsToDelete.length - 1]
  if (!lastHost) {
    // 1. push first host found
    hostsToDelete.push(unmountFiber)
  } else {
    // 2. check if unmountFiber is a sibling of lastHost
    let node = lastHost.sibling
    while (node !== null) {
      if (unmountFiber === node) {
        hostsToDelete.push(unmountFiber)
      }
      node = node.sibling
    }
  }
}

const commitDeletion = (childToDelete: FiberNode, root: FiberRootNode) => {
  // need to delete first host in the subtree and it's siblings:
  // e.g. we need delete <p>xxx</p> and it's sibling <p>yyy</p>:
  // <div>
  //   <><p>xxx</p><p>yyy</p><>
  // </div>
  const rootHostsToDelete: FiberNode[] = []
  // traverse subtree to find hosts of children to delete
  commitNestedComponent(childToDelete, (unmountFiber) => {
    switch (unmountFiber.tag) {
      case HostComponent:
        recordHostsToDelete(rootHostsToDelete, unmountFiber)
        safelyDetachRef(unmountFiber)
        return
      case HostText:
        recordHostsToDelete(rootHostsToDelete, unmountFiber)
        return
      case FunctionComponent:
        // TODO unmount ref
        commitPassiveEffect(unmountFiber, root, 'unmount')
        return
      default:
        if (__DEV__) {
          console.error('unhandled fiber tag: ', unmountFiber)
        }
    }
  })

  // remove hosts
  if (rootHostsToDelete.length) {
    const hostParent = getHostParent(childToDelete)
    if (hostParent !== null) {
      rootHostsToDelete.forEach((host) => {
        removeChild(host.stateNode, hostParent)
      })
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
