import { FiberNode } from 'react-reconciler/src/fiber'
import { HostText } from 'react-reconciler/src/workTags'

export type Container = Element
export type Instance = Element
export type TextInstance = Text

export const createInstance = (type: string, props: any): Instance => {
  // TODO process props
  const element = document.createElement(type)
  console.log(props)
  return element
}

export const appendInitialChild = (
  parent: Instance | Container,
  child: Instance
) => {
  parent.append(child)
}

export const createTextInstance = (content: string) => {
  return document.createTextNode(content)
}

export const appendChildToContainer = appendInitialChild

export const commitUpdate = (fiber: FiberNode) => {
  switch (fiber.tag) {
    case HostText:
      const text = fiber.memoizedProps.content
      return commitTextUpdate(fiber.stateNode, text)
    default:
      if (__DEV__) {
        console.error('No corresponding tag in commitUpdate: ', fiber.tag)
      }
      break
  }
}

export const commitTextUpdate = (
  textInstance: TextInstance,
  content: string
) => {
  textInstance.textContent = content
}

export const removeChild = (
  child: Instance | TextInstance,
  container: Container
) => {
  container.removeChild(child)
}
