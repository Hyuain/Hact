import './style.css'
import {
  unstable_ImmediatePriority as ImmediatePriority,
  unstable_UserBlockingPriority as UserBlockingPriority,
  unstable_NormalPriority as NormalPriority,
  unstable_LowPriority as LowPriority,
  unstable_IdlePriority as IdlePriority,
  unstable_scheduleCallback as scheduleCallback,
  unstable_shouldYield as shouldYield,
  unstable_getFirstCallbackNode as getFirstCallbackNode,
  unstable_cancelCallback as cancelCallback,
  CallbackNode
} from 'scheduler'

type Priority =
  | typeof ImmediatePriority
  | typeof UserBlockingPriority
  | typeof NormalPriority
  | typeof LowPriority
  | typeof IdlePriority

interface Work {
  // 工作要执行的次数，类比于 React 的组件数量
  count: number
  priority: Priority
}

const workQueue: Work[] = []
let prevPriority: Priority = IdlePriority
let curCallback: CallbackNode | null = null

;[LowPriority, NormalPriority, UserBlockingPriority, ImmediatePriority].forEach(
  (priority) => {
    const btn = document.createElement('button')
    btn.innerText = [
      '',
      'ImmediatePriority',
      'UserBlockingPriority',
      'NormalPriority',
      'LowPriority'
    ][priority]
    btn.onclick = () => {
      workQueue.unshift({
        count: 100,
        priority: priority as Priority
      })
      schedule()
    }
    root.appendChild(btn)
  }
)

function schedule() {
  const cbNode = getFirstCallbackNode()
  const curWork = workQueue.sort((w1, w2) => w1.priority - w2.priority)[0]

  // 没有任务了，取消之前的调度
  if (!curWork) {
    curCallback = null
    cbNode && cancelCallback(cbNode)
    return
  }

  const { priority: curPriority } = curWork
  // 新任务（cur）与正在执行的任务（prev）优先级相同时，不需要新的调度，继续执行原有任务即可
  // 此时 curCallback 仍然为之前正在执行的任务，不会被赋为新值
  if (curPriority === prevPriority) {
    return
  }

  // 更高优先级的 work 需要被调度，取消之前的调度
  cbNode && cancelCallback(cbNode)
  curCallback = scheduleCallback(curPriority, perform.bind(null, curWork))
}

function perform(work: Work, didTimeout?: boolean) {
  /*
   * 1. work.priority
   * 2. 饥饿问题（某个 work 一直得不到执行）
   * 3. 时间切片
   */
  const needSync = work.priority === ImmediatePriority || didTimeout
  while ((needSync || !shouldYield()) && work.count > 0) {
    work.count--
    insertSpan(work.priority)
  }

  // 中断执行或执行完
  prevPriority = work.priority
  // 执行完
  if (!work.count) {
    const workIndex = workQueue.indexOf(work)
    workQueue.splice(workIndex, 1)
    prevPriority = IdlePriority
  }

  const prevCallback = curCallback
  schedule()
  const newCallback = curCallback

  // 如果经过调度之后，curCallback 仍然是之前的任务，说明没有新的任务需要插队执行
  // 此外，如果此函数返回值是一个函数，则会继续调度该函数
  // 在这种情况下，就是让 Scheduler 继续调度之前的任务
  if (newCallback && newCallback === prevCallback) {
    return perform.bind(null, work)
  }
}

function insertSpan(content) {
  const span = document.createElement('span')
  span.className = `priority-${content}`
  span.innerText = content
  doSomeBusyWork(10000000)
  root.appendChild(span)
}

function doSomeBusyWork(len: number) {
  let result = 0
  while (len--) {
    result += len
  }
}
