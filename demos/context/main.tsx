import { useState, createContext, useContext } from 'react'
import ReactDOM from 'react-dom/client'

const ctx1 = createContext(null)
const ctx2 = createContext(null)

function App() {
  const [num1, setNum1] = useState(0)
  const [num2, setNum2] = useState(1)
  return (
    <ctx1.Provider value={num1}>
      <ctx2.Provider value={num2}>
        <div
          onClick={() => {
            setNum1(Math.random())
            setNum2(Math.random() + 1)
          }}
        >
          <Middle />
        </div>
      </ctx2.Provider>
    </ctx1.Provider>
  )
}

function Middle() {
  return <Child />
}

function Child() {
  const val1 = useContext(ctx1)
  const val2 = useContext(ctx2)
  return (
    <p>
      {val1}|{val2}
    </p>
  )
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <App />
)
