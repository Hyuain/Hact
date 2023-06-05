export type Container = Element
export type Instance = Element

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