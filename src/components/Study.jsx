import { useEffect, useRef, useState } from 'react'
import Rich from './Rich.jsx'
import { Icon } from './Icons.jsx'
import { plain } from '../lib/tokenize.js'
import { useStore, toggleStar, getScope } from '../lib/store.js'
import { scopeCards, sectionTitle } from '../lib/data.js'

export const MODE_LIST = [
  { key: 'flashcards', label: 'Flashcards', icon: Icon.Flashcards },
  { key: 'learn', label: 'Learn', icon: Icon.Learn },
  { key: 'test', label: 'Test', icon: Icon.Test },
  { key: 'match', label: 'Match', icon: Icon.Match },
]

export function sizeClass(text) {
  const n = plain(text ?? '').length
  if (n < 70) return 'fs-xl'
  if (n < 160) return 'fs-lg'
  if (n < 320) return 'fs-md'
  return 'fs-sm'
}

// Cards for a study mode after the set page's section / starred filter.
export function useScopedCards(set) {
  const scopes = useStore((s) => s.scopes)
  const stars = useStore((s) => s.stars)
  const scope = getScope(scopes, set.id)
  const cards = scopeCards(set, scope, stars)
  return { cards: cards.length ? cards : set.cards, scope, filtered: cards.length > 0 && cards.length !== set.cards.length }
}

export function StarButton({ id, size = 22 }) {
  const starred = useStore((s) => !!s.stars[id])
  return (
    <button
      className={`star-btn ${starred ? 'on' : ''}`}
      onClick={(e) => {
        e.stopPropagation()
        toggleStar(id)
      }}
      aria-pressed={starred}
      aria-label={starred ? 'Unstar card' : 'Star card'}
      title={starred ? 'Unstar' : 'Star'}
    >
      <Icon.Star filled={starred} width={size} height={size} />
    </button>
  )
}

export function CardLabel({ card }) {
  return (
    <span className="card-label">
      <span className="card-label-name">{card.name}</span>
      <span className="card-label-meta">
        §{card.section} · p.{card.page}
      </span>
    </span>
  )
}

export function FlipCard({ card, flipped, onFlip, answerFirst = false, className = '' }) {
  const [hint, setHint] = useState(false)
  const [prevId, setPrevId] = useState(card.id)
  if (prevId !== card.id) {
    setPrevId(card.id)
    setHint(false)
  }
  const backRef = useRef(null)
  useEffect(() => {
    if (backRef.current) backRef.current.scrollTop = 0
  }, [card.id, flipped])

  const question = (
    <>
      <div className="face-head">
        <CardLabel card={card} />
        <StarButton id={card.id} />
      </div>
      <div className="face-body center">
        <Rich text={card.prompt} className={sizeClass(card.prompt)} />
      </div>
      {card.hint && (
        <div className="face-foot">
          {hint ? (
            <span className="hint-text">
              <Icon.Bulb width={18} height={18} /> <Rich inline text={card.hint} />
            </span>
          ) : (
            <button
              className="link-btn"
              onClick={(e) => {
                e.stopPropagation()
                setHint(true)
              }}
            >
              <Icon.Bulb width={18} height={18} /> Get a hint
            </button>
          )}
        </div>
      )}
    </>
  )
  const answer = (
    <>
      <div className="face-head">
        <span className="card-label">
          <span className="card-label-name">Answer</span>
          <span className="card-label-meta">{card.name}</span>
        </span>
        <StarButton id={card.id} />
      </div>
      <div className="face-body" ref={backRef}>
        <Rich text={card.answer} className="answer-text" big />
        <div className="explain-rule" />
        <Rich text={card.explanation} className="explain-text" />
      </div>
    </>
  )

  return (
    <div
      className={`flip ${flipped ? 'is-flipped' : ''} ${className}`}
      onClick={onFlip}
      role="button"
      tabIndex={0}
      aria-label={flipped ? 'Show question' : 'Show answer'}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onFlip()
      }}
    >
      <div className="flip-inner">
        <div className="face face-front">{answerFirst ? answer : question}</div>
        <div className="face face-back">{answerFirst ? question : answer}</div>
      </div>
    </div>
  )
}

export function ModeHeader({ set, mode, center, children }) {
  const [open, setOpen] = useState(false)
  const current = MODE_LIST.find((m) => m.key === mode)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const close = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false)
    }
    window.addEventListener('pointerdown', close)
    return () => window.removeEventListener('pointerdown', close)
  }, [open])

  return (
    <header className="mode-header">
      <div className="mode-switch" ref={ref}>
        <button className="mode-switch-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <current.icon className="mode-ico" />
          <span>{current.label}</span>
          <Icon.Chevron width={18} height={18} />
        </button>
        {open && (
          <div className="menu" role="menu">
            {MODE_LIST.map((m) => (
              <a key={m.key} role="menuitem" className={`menu-item ${m.key === mode ? 'active' : ''}`} href={`#/set/${set.id}/${m.key}`} onClick={() => setOpen(false)}>
                <m.icon className="mode-ico" /> {m.label}
              </a>
            ))}
            <div className="menu-sep" />
            <a className="menu-item" href="#/">
              Home
            </a>
          </div>
        )}
      </div>
      <div className="mode-center">
        {center}
        <span className="mode-set-title">{set.title}</span>
      </div>
      <div className="mode-actions">
        {children}
        <a className="icon-btn" href={`#/set/${set.id}`} aria-label="Close" title="Back to set">
          <Icon.Close />
        </a>
      </div>
    </header>
  )
}

export function ScopeNote({ set, scope, count }) {
  if (!scope.sections.length && !scope.starred) return null
  const parts = []
  if (scope.sections.length) parts.push(scope.sections.map((s) => `§${s} ${sectionTitle.get(s) ?? ''}`).join(', '))
  if (scope.starred) parts.push('starred only')
  return (
    <p className="scope-note">
      Studying {count} cards · {parts.join(' · ')} · <a href={`#/set/${set.id}`}>change</a>
    </p>
  )
}

export function Toggle({ checked, onChange, label }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track" aria-hidden>
        <span className="toggle-thumb" />
      </span>
      <span>{label}</span>
    </label>
  )
}

export function Donut({ value, total, size = 120, label }) {
  const r = 46
  const c = 2 * Math.PI * r
  const pct = total ? value / total : 0
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className="donut" role="img" aria-label={label ?? `${Math.round(pct * 100)}%`}>
      <circle cx="60" cy="60" r={r} className="donut-track" />
      <circle cx="60" cy="60" r={r} className="donut-fill" strokeDasharray={`${c * pct} ${c}`} transform="rotate(-90 60 60)" />
      <text x="60" y="60" textAnchor="middle" dominantBaseline="central" className="donut-text">
        {Math.round(pct * 100)}%
      </text>
    </svg>
  )
}
