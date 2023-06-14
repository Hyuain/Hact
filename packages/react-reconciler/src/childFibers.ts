import { Props, ReactElement } from 'shared/ReactTypes'
import {
  createFiberFromElement,
  createWorkInProgress,
  FiberNode
} from './fiber'
import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols'
import { HostText } from './workTags'
import { ChildDeletion, Placement } from './fiberFlags'

type ExistingChildren = Map<string | number, FiberNode>

// generate reconcileChildFibers according to shouldTrackEffects
function ChildReconciler(shouldTrackEffects: boolean) {
  function deleteChild(returnFiber: FiberNode, childToDelete: FiberNode) {
    if (!shouldTrackEffects) {
      return
    }
    const deletions = returnFiber.deletions
    // mark which children should be deleted
    if (deletions === null) {
      returnFiber.deletions = [childToDelete]
      returnFiber.flags |= ChildDeletion
    } else {
      deletions.push(childToDelete)
    }
  }

  function deleteChildAndSiblings(
    returnFiber: FiberNode,
    currentFirstChild: FiberNode | null
  ) {
    if (!shouldTrackEffects) {
      return
    }
    let childToDelete = currentFirstChild
    while (childToDelete !== null) {
      deleteChild(returnFiber, childToDelete)
      childToDelete = childToDelete.sibling
    }
  }

  // A -> B
  // ABC -> A
  function reconcileSingleElement(
    returnFiber: FiberNode,
    currentFiber: FiberNode | null,
    newChild: ReactElement
  ) {
    const key = newChild.key
    // update (check whether current fiber and its siblings can be reused)
    while (currentFiber !== null) {
      if (currentFiber.key === key) {
        if (newChild.$$typeof === REACT_ELEMENT_TYPE) {
          // both keys and types are same, current fiber can be reused
          // rest fibers (siblings of current fiber) will be deleted
          if (currentFiber.type === newChild.type) {
            const existing = useFiber(currentFiber, newChild.props)
            existing.return = returnFiber
            deleteChildAndSiblings(returnFiber, currentFiber.sibling)
            return existing
          }
          // keys are same but types are different, current fiber can't be reused
          // delete all old fibers
          deleteChildAndSiblings(returnFiber, currentFiber)
          break
        } else {
          if (__DEV__) {
            console.error(
              'No corresponding type in reconcileSingleElement: ',
              newChild.type
            )
          }
          break
        }
      } else {
        // keys are different, delete current fiber, and traverse to slibings
        deleteChild(returnFiber, currentFiber)
        currentFiber = currentFiber.sibling
      }
    }
    // mount (create new FiberNode from ReactElement)
    const fiber = createFiberFromElement(newChild)
    fiber.return = returnFiber
    // TODO currentFiber
    console.log(currentFiber)
    return fiber
  }

  function reconcileSingleTextNode(
    returnFiber: FiberNode,
    currentFiber: FiberNode | null,
    newChild: string | number
  ) {
    // update
    while (currentFiber !== null) {
      if (currentFiber.tag === HostText) {
        const existing = useFiber(currentFiber, { content: newChild })
        existing.return = returnFiber
        deleteChildAndSiblings(returnFiber, currentFiber.sibling)
        return existing
      }
      deleteChild(returnFiber, currentFiber)
      currentFiber = currentFiber.sibling
    }
    const fiber = new FiberNode(HostText, { content: newChild }, null)
    fiber.return = returnFiber
    // TODO currentFiber
    console.log(currentFiber)
    return fiber
  }

  function placeSingleChild(fiber: FiberNode) {
    // we will pass the fiber we just created
    // which is WIP fiber
    // whose alternate is current, and is null
    // this is first render, so Placement side effect will happen
    if (shouldTrackEffects && fiber.alternate === null) {
      fiber.flags |= Placement
    }
    return fiber
  }

  function reconcileChildrenArray(
    returnFiber: FiberNode,
    currentFirstChild: FiberNode | null,
    newChild: any[]
  ) {
    // index of last reusable fiber in current
    let lastPlacedIndex = 0
    // last fiber we created when we traversed newChild
    let lastNewFiber: FiberNode | null = null
    // first fiber we created when we traversed newChild
    let firstNewFiber: FiberNode | null = null

    // 1. store current into map
    const existingChildren: ExistingChildren = new Map()
    let current = currentFirstChild
    while (current !== null) {
      const key = current.key !== null ? current.key : current.index
      existingChildren.set(key, current)
      current = current.sibling
    }
    for (let i = 0; i < newChild.length; i++) {
      // 2. traverse newChild, check whether current can be reused
      const after = newChild[i]
      const newFiber = updateFromMap(returnFiber, existingChildren, i, after)
      // false, null ...
      if (newFiber === null) {
        continue
      }
      // 3. mark placement (insert or move)
      newFiber.index = i
      newFiber.return = returnFiber
      if (lastNewFiber === null) {
        firstNewFiber = newFiber
        lastNewFiber = newFiber
      } else {
        lastNewFiber.sibling = newFiber
        lastNewFiber = lastNewFiber.sibling
      }
      if (!shouldTrackEffects) {
        continue
      }
      const current = newFiber.alternate
      if (current !== null) {
        const oldIndex = current.index
        if (oldIndex < lastPlacedIndex) {
          // if new relative order is changed, mark move
          newFiber.flags |= Placement
        } else {
          lastPlacedIndex = oldIndex
        }
      } else {
        // mount, mark insert
        newFiber.flags |= Placement
      }
    }
    // 4. mark deletion to others in map
    existingChildren.forEach((child) => {
      deleteChild(returnFiber, child)
    })
    return firstNewFiber
  }

  function updateFromMap(
    returnFiber: FiberNode,
    existingChildren: ExistingChildren,
    index: number,
    element: any
  ): FiberNode | null {
    const key = element.key !== null ? element.key : index
    const before = existingChildren.get(key)
    // HostText
    if (typeof element === 'string' || typeof element === 'number') {
      if (before && before.tag === HostText) {
        existingChildren.delete(key)
        return useFiber(before, { content: String(element) })
      }
      return new FiberNode(HostText, { content: String(element) }, null)
    }
    // ReactElement
    if (typeof element === 'object' && element !== null) {
      switch (element.$$typeof) {
        case REACT_ELEMENT_TYPE:
          if (before && before.type === element.type) {
            existingChildren.delete(key)
            return useFiber(before, element.props)
          }
          return createFiberFromElement(element)
      }
    }
    // TODO: Array
    return null
  }

  return function reconcileChildFibers(
    returnFiber: FiberNode,
    currentFiber: FiberNode | null,
    newChild?: ReactElement
  ): FiberNode | null {
    if (typeof newChild === 'object' && newChild !== null) {
      if (Array.isArray(newChild)) {
        return reconcileChildrenArray(returnFiber, currentFiber, newChild)
      }
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE:
          return placeSingleChild(
            reconcileSingleElement(returnFiber, currentFiber, newChild)
          )
        default:
          if (__DEV__) {
            console.error(
              'No corresponding $$typeof in reconcileChildFibers: ',
              newChild.$$typeof
            )
          }
      }
    }

    if (typeof newChild === 'string' || typeof newChild === 'number') {
      return placeSingleChild(
        reconcileSingleTextNode(returnFiber, currentFiber, newChild)
      )
    }

    // fallback
    if (currentFiber) {
      deleteChild(returnFiber, currentFiber)
    }

    if (__DEV__) {
      console.error(
        'No corresponding child type in reconcileChildFibers: ',
        newChild
      )
    }
    // TODO: multiple children
    return null
  }
}

function useFiber(fiber: FiberNode, pendingProps: Props): FiberNode {
  // reuse alternate FiberNode, instead of create new FiberNode
  const clone = createWorkInProgress(fiber, pendingProps)
  clone.index = 0
  clone.sibling = null
  return clone
}

export const reconcileChildFibers = ChildReconciler(true)
export const mountChildFibers = ChildReconciler(false)
