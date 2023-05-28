import { ReactElement } from 'shared/ReactTypes'
import { FiberNode, createFiberFromElement } from './fiber'
import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols'
import { HostText } from './workTags'
import { Placement } from './fiberFlags'

// generate reconcileChildFibers according to shouldTrackEffects
function ChildReconciler(shouldTrackEffects: boolean) {
  function reconcileSingleElement(
    returnFiber: FiberNode,
    currentFiber: FiberNode | null,
    newChild: ReactElement
  ) {
    const fiber = createFiberFromElement(newChild)
    fiber.return = returnFiber
    return fiber
  }

  function reconcileSingleTextNode(
    returnFiber: FiberNode,
    currentFiber: FiberNode | null,
    newChild: string | number
  ) {
    const fiber = new FiberNode(HostText, { content: newChild }, null)
    fiber.return = returnFiber
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

export const reconcileChildFibers = ChildReconciler(true)
export const mountChildFibers = ChildReconciler(false)
