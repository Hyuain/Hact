import React, { useState, useEffect } from 'react'
// import ReactDOM from 'react-dom/client'
import ReactNoopRenderer from 'react-noop-renderer'

function App() {
  return (
    <>
      <Child />
      <div>hello world</div>
    </>
  )
}

function Child() {
  return <div>I am child</div>
}

const root = ReactNoopRenderer.createRoot()

root.render(<App />)

window.root = root

// function App() {
//   const [num, updateNum] = useState(0)
//   useEffect(() => {
//     console.log('App mount')
//   }, [])
//
//   useEffect(() => {
//     console.log('num change create', num)
//     return () => {
//       console.log('num change destroy', num)
//     }
//   }, [num])
//
//   return (
//     <div onClick={() => updateNum(num + 1)}>
//       {num === 0 ? <Child /> : 'noop'}
//     </div>
//   )
// }
//
// function Child() {
//   useEffect(() => {
//     console.log('Child mount')
//     return () => console.log('Child unmount')
//   }, [])
//
//   return <>'i am child'</>
// }

// function App() {
//   const [num, setNum] = useState(100)
//   const arr =
//     num % 2 === 0
//       ? [<li key="1">1</li>, <li key="2">2</li>, <li key="3">3</li>]
//       : [<li key="1">3</li>, <li key="2">2</li>, <li key="3">1</li>]
//   return (
//     <ul
//       onClickCapture={() => {
//         setNum((num) => num + 1)
//         setNum((num) => num + 1)
//         setNum((num) => num + 1)
//       }}
//     >
//       {num}
//     </ul>
//   )
// }

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

// function Child() {
//   return <div>I am child!</div>
// }

// ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
//   <App />
// )
