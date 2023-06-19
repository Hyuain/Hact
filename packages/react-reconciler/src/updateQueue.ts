import { Action } from 'shared/ReactTypes'
import { Dispatch } from 'react/src/currentDispatcher'
import { isSubsetOfLanes, Lane } from './fiberLanes'

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
): {
  // the state calculated by updates whose lane is subset of renderLane
  memorizedState: State
  // the state calculated before the first skipped update (whose lane is not subset of renderLane)
  baseState: State
  // the first skipped update and all the updates after it
  baseQueue: Update<State> | null
} => {
  const result: ReturnType<typeof processUpdateQueue<State>> = {
    memorizedState: baseState,
    baseState,
    baseQueue: null
  }
  if (pendingUpdate !== null) {
    let newBaseState = baseState
    let newBaseQueueFirst: Update<State> | null = null
    let newBaseQueueLast: Update<State> | null = null
    let tempState = baseState

    // the first update is the next of last update
    const first = pendingUpdate.next as Update<any>
    let pending = pendingUpdate.next as Update<any>
    // traverse the circular linked list of updates
    do {
      const updateLane = pending.lane
      if (!isSubsetOfLanes(renderLane, updateLane)) {
        // current update has lower priority than the current render, do skip it
        const clone = createUpdate(pending.action, pending.lane)
        if (newBaseQueueFirst === null) {
          newBaseQueueFirst = newBaseQueueLast = clone
          newBaseState = tempState
        } else {
          newBaseQueueLast!.next = clone
          newBaseQueueLast = clone
        }
      } else {
        // current update has enough priority to be executed
        if (newBaseQueueLast !== null) {
          const clone = createUpdate(pending.action, pending.lane)
          newBaseQueueLast.next = clone
          newBaseQueueLast = clone
        }
        const action = pendingUpdate.action
        if (action instanceof Function) {
          tempState = action(baseState)
        } else {
          tempState = action
        }
      }
      pending = pending.next as Update<any>
    } while (pending !== first)

    if (newBaseQueueLast === null) {
      // no update is skipped
      newBaseState = tempState
    } else {
      newBaseQueueLast.next = newBaseQueueFirst
    }

    result.memorizedState = tempState
    result.baseState = newBaseState
    result.baseQueue = newBaseQueueLast
  }
  return result
}
