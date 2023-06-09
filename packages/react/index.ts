import { jsx } from './src/jsx'
import currentDispatcher, {
  Dispatcher,
  resolveDispatcher
} from './src/currentDispatcher'

export const useState: Dispatcher['useState'] = (initialState: any) => {
  const dispatcher = resolveDispatcher()
  return dispatcher.useState(initialState)
}

// internal data sharing layer
export const __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = {
  currentDispatcher
}

export const version = '0.0.0'

// export jsx and jsxDEV according to the environment
export const createElement = jsx
