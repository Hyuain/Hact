import { FiberNode } from 'react-reconciler/src/fiber'
import { HostText } from 'react-reconciler/src/workTags'
import { Props } from 'shared/ReactTypes'

export interface Container {
  rootID: number
  children: Array<Instance | TextInstance>
}
export interface Instance {
  id: number
  type: string
  children: Array<Instance | TextInstance>
  parent: number
  props: Props
}
export interface TextInstance {
  text: string
  id: number
  parent: number
}

let instanceCounter = 0

export const createInstance = (type: string, props: Props): Instance => {
  return {
    id: instanceCounter++,
    type,
    children: [],
    parent: -1,
    props
  }
}

export const appendInitialChild = (
  parent: Instance | Container,
  child: Instance
) => {
  const prevParentID = child.parent
  const parentID = 'rootID' in parent ? parent.rootID : parent.id
  if (prevParentID !== -1 && prevParentID !== parentID) {
    throw new Error('Parent id mismatch')
  }
  child.parent = parentID
  parent.children.push(child)
}

export const createTextInstance = (content: string): TextInstance => {
  return {
    text: content,
    id: instanceCounter++,
    parent: -1
  }
}

export const appendChildToContainer = (parent: Container, child: Instance) => {
  const prevParentID = child.parent
  const parentID = parent.rootID
  if (prevParentID !== -1 && prevParentID !== parentID) {
    throw new Error('Parent id mismatch')
  }
  child.parent = parentID
  parent.children.push(child)
}

export const insertChildToContainer = (
  child: Instance,
  container: Container,
  before: Instance
) => {
  const beforeIndex = container.children.indexOf(before)
  if (beforeIndex === -1) {
    throw new Error('Before child not found')
  }
  const index = container.children.indexOf(child)
  if (index !== -1) {
    container.children.splice(index, 1)
  }
  container.children.splice(beforeIndex, 0, child)
}

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
  textInstance.text = content
}

export const removeChild = (
  child: Instance | TextInstance,
  container: Container
) => {
  const index = container.children.indexOf(child)
  if (index === -1) {
    throw new Error('Child not found in container')
  }
  container.children.splice(index, 1)
}

export const scheduleMicroTask =
  typeof queueMicrotask === 'function'
    ? queueMicrotask
    : typeof Promise === 'function'
    ? (callback: (...args: any) => void) => Promise.resolve(null).then(callback)
    : setTimeout
