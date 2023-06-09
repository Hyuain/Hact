import { jsx } from './src/jsx'
import currentDispatcher, {
  Dispatcher,
  resolveDispatcher
} from './src/currentDispatcher'
import currentBatchConfig from './src/currentBatchConfig'

export const useState: Dispatcher['useState'] = (initialState: any) => {
  const dispatcher = resolveDispatcher()
  return dispatcher.useState(initialState)
}

export const useEffect: Dispatcher['useEffect'] = (create, deps) => {
  const dispatcher = resolveDispatcher()
  return dispatcher.useEffect(create, deps)
}

export const useTransition: Dispatcher['useTransition'] = () => {
  const dispatcher = resolveDispatcher()
  return dispatcher.useTransition()
}

export const useRef: Dispatcher['useRef'] = (initialValue) => {
  const dispatcher = resolveDispatcher()
  return dispatcher.useRef(initialValue)
}

export const useContext: Dispatcher['useContext'] = (context) => {
  const dispatcher = resolveDispatcher()
  return dispatcher.useContext(context)
}

// internal data sharing layer
export const __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = {
  currentDispatcher,
  currentBatchConfig
}

export const version = '0.0.0'

// export jsx and jsxDEV according to the environment
export const createElement = jsx

export { createContext } from './src/context'
