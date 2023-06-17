import { Props } from 'shared/ReactTypes'
import { Container } from 'hostConfig'
import {
  unstable_ImmediatePriority,
  unstable_NormalPriority,
  unstable_runWithPriority,
  unstable_UserBlockingPriority
} from 'scheduler'

export const elementPropsKey = '__props'
const validEventTypeList = ['click']

export interface DOMElement extends Element {
  [elementPropsKey]: Props
}

type EventCallback = (e: Event) => void

interface Paths {
  capture: EventCallback[]
  bubble: EventCallback[]
}

interface SyntheticEvent extends Event {
  // to prevent simulated event bubbling
  __stopPropagation: boolean
}

export function updateFiberProps(node: DOMElement, props: Props) {
  node[elementPropsKey] = props
}

export function listenEvent(container: Container, eventType: string) {
  if (!validEventTypeList.includes(eventType)) {
    console.error('event type is currently not valid: ', eventType)
    return
  }
  if (__DEV__) {
    console.log('init event: ', eventType)
  }
  container.addEventListener(eventType, (e) => {
    dispatchEvent(container, eventType, e)
  })
}

function dispatchEvent(container: Container, eventType: string, e: Event) {
  const targetElement = e.target
  if (targetElement === null) {
    console.warn('event has no target element', e)
    return
  }
  // 1. collect eventHandlers from target element to container
  const { bubble, capture } = collectPaths(
    targetElement as DOMElement,
    container,
    eventType
  )
  // 2. construct synthetic event object, this event will help us to control event bubbling
  const se = createSyntheticEvent(e)
  // 3. traverse capture handlers
  triggerEventFlow(capture, se)
  if (!se.__stopPropagation) {
    // 4. traverse bubble handlers
    triggerEventFlow(bubble, se)
  }
}

function triggerEventFlow(paths: EventCallback[], se: SyntheticEvent) {
  for (let i = 0; i < paths.length; i++) {
    const callback = paths[i]
    // save the current priority to context
    unstable_runWithPriority(eventTypeToSchedulerPriority(se.type), () => {
      callback.call(null, se)
    })
    if (se.__stopPropagation) {
      break
    }
  }
}

function createSyntheticEvent(e: Event) {
  const syntheticEvent = e as SyntheticEvent
  syntheticEvent.__stopPropagation = false
  const originalStopPropagation = e.stopPropagation
  syntheticEvent.stopPropagation = () => {
    syntheticEvent.__stopPropagation = true
    if (originalStopPropagation) {
      originalStopPropagation.call(e)
    }
  }
  return syntheticEvent
}

function getEventCallbackNameFromEventType(eventType: string): string[] | void {
  return {
    click: ['onClickCapture', 'onClick']
  }[eventType]
}

function collectPaths(
  targetElement: DOMElement,
  container: Container,
  eventType: string
) {
  const paths: Paths = {
    capture: [],
    bubble: []
  }
  while (targetElement && targetElement !== container) {
    const elementProps = targetElement[elementPropsKey]
    if (elementProps) {
      const callbackNameList = getEventCallbackNameFromEventType(eventType)
      if (callbackNameList) {
        callbackNameList.forEach((callbackName, i) => {
          const eventCallback = elementProps[callbackName]
          if (eventCallback) {
            if (i === 0) {
              paths.capture.unshift(eventCallback)
            } else {
              paths.bubble.push(eventCallback)
            }
          }
        })
      }
    }
    targetElement = targetElement.parentNode as DOMElement
  }
  return paths
}

function eventTypeToSchedulerPriority(eventType: string) {
  switch (eventType) {
    case 'click':
    case 'keydown':
    case 'keyup':
      return unstable_ImmediatePriority
    case 'scroll':
      return unstable_UserBlockingPriority
    default:
      return unstable_NormalPriority
  }
}
