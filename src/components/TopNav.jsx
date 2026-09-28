import { useState } from 'react'
import { Icon, Die } from './Icons.jsx'
import { go, goRandom } from '../lib/util.js'
import { useStore } from '../lib/store.js'

function currentTheme() {
  const set = document.documentElement.dataset.theme
  if (set) return set
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function TopNav({ query = '', page }) {
  const [q, setQ] = useState(query)
  const [theme, setTheme] = useState(currentTheme)
  const progress = useStore((s) => s.progress)
  const streak = useStore((s) => s.streak)

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem('ogb:theme', next)
    } catch {
      // ignore
    }
    setTheme(next)
  }

  const submit = (e) => {
    e.preventDefault()
    go(q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : '/')
  }

  return (
    <header className="topnav">
      <div className="topnav-inner">
        <a href="#/" className="brand" aria-label="OpenGreenBook home">
          <Die n={5} className="brand-die" />
          <span className="brand-word">
            Open<span>GreenBook</span>
          </span>
        </a>
        <nav className="topnav-links" aria-label="Main">
          <a href="#/" className={page === '' || page === 'ch' ? 'active' : ''}>
            Chapters
          </a>
          <a href="#/practice" className={page === 'practice' ? 'active' : ''}>
            Practice
          </a>
        </nav>
        <form className="search" onSubmit={submit} role="search">
          <Icon.Search width={18} height={18} />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search problems" aria-label="Search problems" />
        </form>
        <div className="topnav-actions">
          {streak > 1 && (
            <span className="streak" title={`${streak} first-try solves in a row`}>
              <Icon.Flame width={18} height={18} /> {streak}
            </span>
          )}
          <a className="icon-btn show-sm" href="#/practice" aria-label="Practice" title="Practice">
            <Icon.Target />
          </a>
          <button className="icon-btn" onClick={() => goRandom(progress)} aria-label="Random problem" title="Random unsolved problem">
            <Die n={3} className="nav-die" />
          </button>
          <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle dark mode" title="Toggle dark mode">
            {theme === 'dark' ? <Icon.Sun /> : <Icon.Moon />}
          </button>
          <a className="icon-btn hide-sm" href="https://github.com/Gintong10/opengreenbook" target="_blank" rel="noreferrer" aria-label="Source on GitHub" title="Source on GitHub">
            <Icon.GitHub />
          </a>
        </div>
      </div>
    </header>
  )
}
