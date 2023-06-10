import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'

function App() {
  const [num, setNum] = useState(100)
  window.setNum = setNum
  return <div>{num === 2 ? <Child /> : <div>{num}</div>}</div>
}

function Child() {
  return <div>I am child!</div>
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <App />
)
