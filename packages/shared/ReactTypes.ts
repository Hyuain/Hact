export type Type = any
export type Key = any
export type Ref<T = any> =
  | { current: T | null }
  | ((instance: T) => void)
  | null
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

export type ReactProvider<T> = {
  $$typeof: symbol | number
  _context: ReactContext<T>
}

export type ReactContext<T> = {
  $$typeof: symbol | number
  Provider: ReactProvider<T> | null
  _currentValue: T
}
