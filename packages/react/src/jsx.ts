import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols'
import {
  ElementType,
  Key,
  Props,
  ReactElement,
  Ref,
  Type
} from 'shared/ReactTypes'

const ReactElement = function (
  type: Type,
  key: Key,
  ref: Ref,
  props: Props
): ReactElement {
  const element = {
    $$typeof: REACT_ELEMENT_TYPE,
    type,
    key,
    ref,
    props,
    __mark: 'MyReactElement'
  }
  return element
}

export const jsx = (type: ElementType, config: any, ...maybeChildren: any) => {
  let key: Key = null
  const props: Props = {}
  let ref: Ref = null
  // resolve config
  for (const propKey in config) {
    const value = config[propKey]
    if (propKey === 'key') {
      if (value !== undefined) {
        key = String(value)
      }
      continue
    }
    if (propKey === 'ref') {
      if (value !== undefined) {
        ref = value
      }
      continue
    }
    if (Object.hasOwnProperty.call(config, propKey)) {
      props[propKey] = value
    }
  }
  const maybeChildrenLength = maybeChildren.length
  if (maybeChildrenLength) {
    if (maybeChildrenLength === 1) {
      props.children = maybeChildren[0]
    } else {
      props.children = maybeChildren
    }
  }
  return ReactElement(type, key, ref, props)
}

export const jsxDEV = (type: ElementType, config: any) => {
  let key: Key = null
  const props: Props = {}
  let ref: Ref = null
  // resolve config
  for (const propKey in config) {
    const value = config[propKey]
    if (propKey === 'key') {
      if (value !== undefined) {
        key = String(value)
      }
      continue
    }
    if (propKey === 'ref') {
      if (value !== undefined) {
        ref = value
      }
      continue
    }
    if (Object.hasOwnProperty.call(config, propKey)) {
      props[propKey] = value
    }
  }
  return ReactElement(type, key, ref, props)
}
