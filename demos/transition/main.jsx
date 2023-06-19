import TabButton from './TabButton'
import AboutTab from './AboutTab'
import PostsTab from './PostsTab'
import ContactTab from './ContactTab'
import { useState, useEffect, useTransition } from 'react'
import ReactDOM from 'react-dom/client'

function App() {
  const [tab, setTab] = useState('about')
  const [isPending, startTransition] = useTransition()

  function selectTab(nextTab) {
    startTransition(() => {
      setTab(nextTab)
    })
  }

  return (
    <>
      <TabButton isActive={tab === 'about'} onClick={() => selectTab('about')}>
        About
      </TabButton>
      <TabButton isActive={tab === 'posts'} onClick={() => selectTab('posts')}>
        Posts (slow)
      </TabButton>
      <TabButton
        isActive={tab === 'contact'}
        onClick={() => selectTab('contact')}
      >
        Contact
      </TabButton>
      <hr />
      {tab === 'about' && <AboutTab />}
      {tab === 'posts' && <PostsTab />}
      {tab === 'contact' && <ContactTab />}
    </>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
