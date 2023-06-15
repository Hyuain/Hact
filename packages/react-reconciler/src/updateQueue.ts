import { Action } from 'shared/ReactTypes'
import { Dispatch } from 'react/src/currentDispatcher'
import { Lane } from './fiberLanes'

export interface Update<State> {
  action: Action<State>
  lane: Lane
  next: Update<any> | null
}

export interface UpdateQueue<State> {
  shared: {
    pending: Update<State> | null
  }
  dispatch: Dispatch<State> | null
}

export const createUpdate = <State>(
  action: Action<State>,
  lane: Lane
): Update<State> => {
  return {
    action,
    lane,
    next: null
  }
}

export const createUpdateQueue = <State>(): UpdateQueue<State> => {
  return {
    shared: {
      pending: null
    },
    dispatch: null
  }
}

export const enqueueUpdate = <State>(
  updateQueue: UpdateQueue<State>,
  update: Update<State>
) => {
  const pending = updateQueue.shared.pending
  // all updates will be arranged in a circular linked list,
  // and pending always points to the last update
  if (pending === null) {
    // a -> b
    // pending -> a
    update.next = update
  } else {
    /*
      b.next ->  a.next(a)
      a.next -> b
      pending -> b -> a -> b
     */
    /*
      c.next -> b.next(a)
      b.next -> c
      pending -> c -> a -> b -> c
     */
    update.next = pending.next
    pending.next = update
  }
  updateQueue.shared.pending = update
}

export const processUpdateQueue = <State>(
  baseState: State,
  pendingUpdate: Update<State> | null,
  renderLane: Lane
): { memorizedState: State } => {
  const result: ReturnType<typeof processUpdateQueue<State>> = {
    memorizedState: baseState
  }
  if (pendingUpdate !== null) {
    // the first update is the next of last update
    const first = pendingUpdate.next as Update<any>
    let pending = pendingUpdate.next as Update<any>
    // traverse the circular linked list of updates
    do {
      const updateLane = pending.lane
      if (updateLane === renderLane) {
        const action = pendingUpdate.action
        if (action instanceof Function) {
          baseState = action(baseState)
        } else {
          baseState = action
        }
      } else {
        if (__DEV__) {
          console.warn('processUpdateQueue: Unexpected lane:', updateLane)
        }
      }
      pending = pending.next as Update<any>
    } while (pending !== first)
  }
  result.memorizedState = baseState
  return result
}
