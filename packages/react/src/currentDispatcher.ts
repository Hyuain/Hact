import { Action, ReactContext } from 'shared/ReactTypes'

export interface Dispatcher {
  useState: <T>(initialState: (() => T) | T) => [T, Dispatch<T>]
  useEffect: (callback: (() => void) | void, deps: any[] | void) => void
  useTransition: () => [boolean, (callback: () => void) => void]
  useRef: <T>(initialValue: T | null) => { current: T | null }
  useContext: <T>(context: ReactContext<T>) => T
}

export type Dispatch<State> = (action: Action<State>) => void

const currentDispatcher: { current: Dispatcher | null } = {
  current: null
}

export const resolveDispatcher = (): Dispatcher => {
  const dispatcher = currentDispatcher.current
  if (dispatcher === null) {
    throw new Error('Hooks can only be executed inside a function component')
  }
  return dispatcher
}

export default currentDispatcher
