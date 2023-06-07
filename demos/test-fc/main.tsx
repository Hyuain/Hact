import React from 'react'
import ReactDOM from 'react-dom/client'

function App() {
  return (
    <div>
      <Child />
    </div>
  )
}

function Child() {
  return <div>I am child!</div>
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <App />
)
