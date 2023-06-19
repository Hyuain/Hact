export type Type = any
export type Key = any
export type Ref<T = any> = { current: T | null } | ((instance: T) => void)
export type Props = any
export type ElementType = any

export interface ReactElement {
  $$typeof: symbol | number
  type: ElementType
  key: Key
  props: Props
  ref: Ref
  __mark: string
}

export type Action<State> = State | ((prevState: State) => State)
