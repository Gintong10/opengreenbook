import { useEffect, useMemo, useState } from 'react'
import Rich from '../components/Rich.jsx'
import { Icon } from '../components/Icons.jsx'
import { FlipCard, MODE_LIST, StarButton, Toggle } from '../components/Study.jsx'
import { scopeCards } from '../lib/data.js'
import { useStore, getScope, setScope, statusCounts, resetProgress } from '../lib/store.js'
import { useKey } from '../lib/util.js'

function Stat({ label, value, total, tone }) {
  return (
    <div className={`stat stat-${tone}`}>
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        <span className="stat-value">{value}</span>
      </div>
      <div className="stat-bar">
        <span style={{ width: `${total ? (value / total) * 100 : 0}%` }} />
      </div>
    </div>
  )
}

function TermRow({ card, status, open, onToggle, highlight }) {
  return (
    <li id={`card-${card.id}`} className={`term-row ${open ? 'open' : ''} ${highlight ? 'highlight' : ''}`}>
      <button className="term-main" onClick={onToggle} aria-expanded={open}>
        <div className="term-left">
          <span className="term-name">
            <span className={`status-dot ${status ?? 'fresh'}`} title={status === 'known' ? 'Mastered' : status === 'learning' ? 'Still learning' : 'Not studied'} />
            {card.name}
            {card.kind === 'concept' && <span className="kind-tag">concept</span>}
          </span>
          <Rich text={card.prompt} className="term-prompt" />
        </div>
        <div className="term-right">
          <Rich text={card.answer} className="term-answer" big />
        </div>
      </button>
      <div className="term-actions">
        <StarButton id={card.id} size={20} />
      </div>
      {open && (
        <div className="term-explain">
          <Rich text={card.explanation} />
          <span className="muted small">Book page {card.page}</span>
        </div>
      )}
    </li>
  )
}

export default function SetPage({ set, focus }) {
  const scopes = useStore((s) => s.scopes)
  const stars = useStore((s) => s.stars)
  const progress = useStore((s) => s.progress)
  const scope = getScope(scopes, set.id)
  const scoped = useMemo(() => scopeCards(set, scope, stars), [set, scope, stars])
  const deck = scoped.length ? scoped : set.cards
  const starredCount = set.cards.filter((c) => stars[c.id]).length

  const [i, setI] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [open, setOpen] = useState(() => (focus ? { [focus]: true } : {}))
  const idx = Math.min(i, deck.length - 1)
  const card = deck[idx]

  useEffect(() => {
    if (!focus) return
    const el = document.getElementById(`card-${focus}`)
    if (el) el.scrollIntoView({ block: 'center' })
  }, [focus])

  const move = (d) => {
    setFlipped(false)
    setI((idx + d + deck.length) % deck.length)
  }
  useKey(
    (e) => {
      if (e.key === 'ArrowRight') move(1)
      else if (e.key === 'ArrowLeft') move(-1)
      else if (e.key === ' ') {
        e.preventDefault()
        setFlipped((f) => !f)
      }
    },
    [idx, deck.length],
  )

  const toggleSection = (id) => {
    const has = scope.sections.includes(id)
    const sections = has ? scope.sections.filter((s) => s !== id) : [...scope.sections, id]
    setScope(set.id, { ...scope, sections })
    setI(0)
    setFlipped(false)
  }
  const counts = statusCounts(deck, progress)

  const grouped = set.sections
    .map((s) => ({ ...s, cards: deck.filter((c) => c.section === s.id) }))
    .filter((g) => g.cards.length)

  return (
    <div className="set-page">
      <a href="#/" className="back-link">
        <Icon.ArrowLeft width={18} height={18} /> All study sets
      </a>
      <p className="eyebrow">{set.chapter ? `Chapter ${set.chapter}` : `${set.sections.length} sections · 6 chapters`}</p>
      <h1 className="set-title">{set.title}</h1>

      <nav className="mode-grid" aria-label="Study modes">
        {MODE_LIST.map((m) => (
          <a key={m.key} className="mode-tile" href={`#/set/${set.id}/${m.key}`}>
            <m.icon className="mode-ico" />
            <span>{m.label}</span>
          </a>
        ))}
      </nav>

      <div className="scope-bar">
        <div className="chips" role="group" aria-label="Filter by section">
          <button className={`chip ${scope.sections.length ? '' : 'on'}`} onClick={() => setScope(set.id, { ...scope, sections: [] })}>
            All sections
          </button>
          {set.sections.map((s) => (
            <button key={s.id} className={`chip ${scope.sections.includes(s.id) ? 'on' : ''}`} onClick={() => toggleSection(s.id)} title={s.title}>
              <b>{s.id}</b> {s.title}
            </button>
          ))}
        </div>
        <Toggle
          checked={scope.starred}
          onChange={(v) => {
            setScope(set.id, { ...scope, starred: v })
            setI(0)
          }}
          label={`Starred only (${starredCount})`}
        />
      </div>
      {scope.starred && !scoped.length && <p className="scope-note">No starred cards match this filter yet, so showing every card.</p>}

      {card && (
        <section className="preview">
          <FlipCard card={card} flipped={flipped} onFlip={() => setFlipped((f) => !f)} />
          <div className="deck-controls">
            <span className="muted small kbd-hint">Space to flip · ← → to move</span>
            <div className="deck-nav">
              <button className="circle-btn" onClick={() => move(-1)} aria-label="Previous card">
                <Icon.ArrowLeft />
              </button>
              <span className="deck-count">
                {idx + 1} / {deck.length}
              </span>
              <button className="circle-btn" onClick={() => move(1)} aria-label="Next card">
                <Icon.ArrowRight />
              </button>
            </div>
            <a className="btn btn-ghost btn-sm" href={`#/set/${set.id}/flashcards`}>
              Full screen
            </a>
          </div>
        </section>
      )}

      <section className="stats">
        <div className="section-head">
          <h2>Your progress</h2>
          <button className="link-btn" onClick={() => resetProgress(deck.map((c) => c.id))}>
            <Icon.Reset width={16} height={16} /> Reset
          </button>
        </div>
        <div className="stat-grid">
          <Stat label="Not studied" value={counts.fresh} total={deck.length} tone="fresh" />
          <Stat label="Still learning" value={counts.learning} total={deck.length} tone="learning" />
          <Stat label="Mastered" value={counts.known} total={deck.length} tone="known" />
        </div>
      </section>

      <section className="terms">
        <div className="section-head">
          <h2>Cards in this set ({deck.length})</h2>
          <span className="muted small">Click a card to see the full solution</span>
        </div>
        {grouped.map((g) => (
          <div key={g.id} className="term-group">
            <h3 className="term-group-title">
              <span>{g.id}</span> {g.title}
            </h3>
            <ul className="term-list">
              {g.cards.map((c) => (
                <TermRow key={c.id} card={c} status={progress[c.id]} open={!!open[c.id]} highlight={focus === c.id} onToggle={() => setOpen((o) => ({ ...o, [c.id]: !o[c.id] }))} />
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  )
}
