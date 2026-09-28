import { useEffect } from 'react'
import TopNav from './components/TopNav.jsx'
import Home from './pages/Home.jsx'
import Chapter from './pages/Chapter.jsx'
import Problem from './pages/Problem.jsx'
import Search from './pages/Search.jsx'
import { PracticeRun, PracticeSetup } from './pages/Practice.jsx'
import { cardById, chapterByNum } from './lib/data.js'
import { useRoute } from './lib/util.js'

export default function App() {
  const { parts, query } = useRoute()
  const [page = '', arg] = parts

  let body
  let title = 'OpenGreenBook · Green Book problem trainer'
  let wide = false
  if (page === 'p' && cardById.has(arg)) {
    const card = cardById.get(arg)
    body = <Problem card={card} />
    title = `${card.num} ${card.name} · OpenGreenBook`
    wide = true
  } else if (page === 'ch' && chapterByNum.has(Number(arg))) {
    const ch = chapterByNum.get(Number(arg))
    body = <Chapter key={ch.id} chapter={ch} focusSection={query.get('s')} />
    title = `${ch.title} · OpenGreenBook`
  } else if (page === 'practice') {
    body = arg === 'run' ? <PracticeRun /> : <PracticeSetup key={query.get('scope') ?? 'all'} scope={query.get('scope')} />
    title = 'Practice · OpenGreenBook'
  } else if (page === 'search') {
    body = <Search q={query.get('q') ?? ''} />
  } else {
    body = <Home />
  }

  useEffect(() => {
    document.title = title
  }, [title])

  return (
    <>
      <TopNav key={page === 'search' ? query.get('q') : 'nav'} page={page} query={page === 'search' ? query.get('q') ?? '' : ''} />
      <main className={wide ? 'wide' : ''}>{body}</main>
      {!wide && (
        <footer className="footer">
          <p>
            OpenGreenBook is an unofficial, free study companion to <em>A Practical Guide to Quantitative Finance Interviews</em> by Xinfeng Zhou.
          </p>
        </footer>
      )}
    </>
  )
}
