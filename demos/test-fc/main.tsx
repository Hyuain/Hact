import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'

function App() {
  const [num, setNum] = useState(100)
  const arr =
    num % 2 === 0
      ? [<li key="1">1</li>, <li key="2">2</li>, <li key="3">3</li>]
      : [<li key="1">3</li>, <li key="2">2</li>, <li key="3">1</li>]
  return (
    <ul
      onClickCapture={() => {
        setNum((num) => num + 1)
        setNum((num) => num + 1)
        setNum((num) => num + 1)
      }}
    >
      {num}
    </ul>
  )
}

// FIXME: 无法正常工作
// function App() {
//   const [num, setNum] = useState(100)
//   const arr =
//     num % 2 === 0
//       ? [<li key="1">1</li>, <li key="2">2</li>, <li key="3">3</li>]
//       : [<li key="1">3</li>, <li key="2">2</li>, <li key="3">1</li>]
//   return (
//     <ul onClickCapture={() => setNum(num + 1)}>
//       {/*<>*/}
//       {/*  <li>1</li>*/}
//       {/*  <li>2</li>*/}
//       {/*</>*/}
//       {arr}
//       <li key="10">6</li>
//     </ul>
//   )
// }

function Child() {
  return <div>I am child!</div>
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <App />
)
