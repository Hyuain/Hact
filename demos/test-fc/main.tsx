import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
// import ReactNoopRenderer from 'react-noop-renderer'

// function App() {
//   return (
//     <>
//       <Child />
//       <div>hello world</div>
//     </>
//   )
// }
//
// function Child() {
//   return <div>I am child</div>
// }
//
// const root = ReactNoopRenderer.createRoot()
//
// root.render(<App />)
//
// window.root = root

function App() {
  const [num, updateNum] = useState(100)

  return (
    <>
      <ul onClick={() => updateNum(50)}>
        {new Array(num).fill(null).map((_, i) => (
          <Child key={i}>{i}</Child>
        ))}
      </ul>
    </>
  )
}

function Child({ children }) {
  const now = performance.now()
  while (performance.now() - now < 4) {}

  return <li>{children}</li>
}

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

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <App />
)
