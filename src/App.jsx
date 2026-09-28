import { useEffect } from 'react'
import TopNav from './components/TopNav.jsx'
import Home from './pages/Home.jsx'
import SetPage from './pages/SetPage.jsx'
import Flashcards from './pages/Flashcards.jsx'
import Learn from './pages/Learn.jsx'
import Test from './pages/Test.jsx'
import Match from './pages/Match.jsx'
import Search from './pages/Search.jsx'
import { getSet } from './lib/data.js'
import { useRoute } from './lib/util.js'

const MODES = { flashcards: Flashcards, learn: Learn, test: Test, match: Match }

export default function App() {
  const { parts, query } = useRoute()
  const [page, setId, mode] = parts
  const set = page === 'set' ? getSet(setId) : null

  useEffect(() => {
    document.title = set ? `${set.title} · OpenGreenBook` : 'OpenGreenBook · Green Book flashcards'
  }, [set])

  if (set && MODES[mode]) {
    const Mode = MODES[mode]
    // Keyed by set so switching sets remounts with fresh state.
    return <Mode key={`${set.id}-${mode}`} set={set} />
  }

  let body
  if (set) body = <SetPage key={set.id} set={set} focus={query.get('card')} />
  else if (page === 'search') body = <Search q={query.get('q') ?? ''} />
  else body = <Home />

  return (
    <>
      <TopNav key={page === 'search' ? query.get('q') : 'nav'} query={page === 'search' ? query.get('q') ?? '' : ''} />
      <main>{body}</main>
      <footer className="footer">
        <p>
          OpenGreenBook is an unofficial, free study companion to <em>A Practical Guide to Quantitative Finance Interviews</em> by Xinfeng Zhou.
        </p>
      </footer>
    </>
  )
}
