import { Props, ReactElement } from 'shared/ReactTypes'
import {
  FiberNode,
  createFiberFromElement,
  createWorkInProgress
} from './fiber'
import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols'
import { HostText } from './workTags'
import { ChildDeletion, Placement } from './fiberFlags'

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

  function reconcileSingleElement(
    returnFiber: FiberNode,
    currentFiber: FiberNode | null,
    newChild: ReactElement
  ) {
    const key = newChild.key
    // update
    reuseProcess: if (currentFiber !== null) {
      if (currentFiber.key === key) {
        if (newChild.$$typeof === REACT_ELEMENT_TYPE) {
          if (currentFiber.type === newChild.type) {
            const existing = useFiber(currentFiber, newChild.props)
            existing.return = returnFiber
            return existing
          }
          deleteChild(returnFiber, currentFiber)
          break reuseProcess
        } else {
          if (__DEV__) {
            console.error(
              'No corresponding type in reconcileSingleElement: ',
              newChild.type
            )
          }
          break reuseProcess
        }
      } else {
        deleteChild(returnFiber, currentFiber)
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
    if (currentFiber !== null) {
      if (currentFiber.tag === HostText) {
        const existing = useFiber(currentFiber, { content: newChild })
        existing.return = returnFiber
        return existing
      }
      deleteChild(returnFiber, currentFiber)
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

  return function reconcileChildFibers(
    returnFiber: FiberNode,
    currentFiber: FiberNode | null,
    newChild?: ReactElement
  ): FiberNode | null {
    if (typeof newChild === 'object' && newChild !== null) {
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
