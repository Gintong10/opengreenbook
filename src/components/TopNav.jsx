import { useState } from 'react'
import { Icon, Die } from './Icons.jsx'
import { go } from '../lib/util.js'

function currentTheme() {
  const set = document.documentElement.dataset.theme
  if (set) return set
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function TopNav({ query = '' }) {
  const [q, setQ] = useState(query)
  const [theme, setTheme] = useState(currentTheme)

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
        <form className="search" onSubmit={submit} role="search">
          <Icon.Search width={18} height={18} />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search problems, formulas, topics"
            aria-label="Search cards"
          />
        </form>
        <div className="topnav-actions">
          <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle dark mode" title="Toggle dark mode">
            {theme === 'dark' ? <Icon.Sun /> : <Icon.Moon />}
          </button>
          <a className="icon-btn" href="https://github.com/Gintong10/opengreenbook" target="_blank" rel="noreferrer" aria-label="Source on GitHub" title="Source on GitHub">
            <Icon.GitHub />
          </a>
        </div>
      </div>
    </header>
  )
}
