import { useEffect, useState } from 'react'
import { Icon } from '../components/Icons.jsx'
import { ProgressBar, StarButton, StatusIcon, TypeTag } from '../components/Bits.jsx'
import { useStore, tally } from '../lib/store.js'
import { answerType } from '../lib/grade.js'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'unsolved', label: 'Unsolved' },
  { key: 'starred', label: 'Bookmarked' },
  { key: 'typed', label: 'Typed answers' },
]

export default function Chapter({ chapter, focusSection }) {
  const progress = useStore((s) => s.progress)
  const stars = useStore((s) => s.stars)
  const [filter, setFilter] = useState('all')
  const t = tally(chapter.cards, progress)
  const firstOpen = chapter.cards.find((c) => progress[c.id]?.s !== 'solved')

  useEffect(() => {
    if (!focusSection) return
    document.getElementById(`sec-${focusSection}`)?.scrollIntoView({ block: 'start' })
  }, [focusSection])

  const keep = (c) => {
    if (filter === 'unsolved') return progress[c.id]?.s !== 'solved'
    if (filter === 'starred') return !!stars[c.id]
    if (filter === 'typed') return answerType(c) !== 'choice'
    return true
  }

  return (
    <div className="page">
      <a href="#/" className="back-link">
        <Icon.ArrowLeft width={18} height={18} /> All chapters
      </a>
      <header className="chapter-head">
        <div>
          <p className="eyebrow">Chapter {chapter.chapter}</p>
          <h1 className="page-title">{chapter.title}</h1>
          <p className="muted">
            {chapter.cards.length} problems · {chapter.sections.length} sections
          </p>
        </div>
        <div className="chapter-actions">
          {firstOpen && (
            <a className="btn btn-primary btn-lg" href={`#/p/${firstOpen.id}`}>
              {t.solved ? 'Continue' : 'Start'} at {firstOpen.num} <Icon.ArrowRight />
            </a>
          )}
          <a className="btn btn-ghost btn-lg" href={`#/practice?scope=ch${chapter.chapter}`}>
            <Icon.Target /> Practice set
          </a>
        </div>
      </header>

      <div className="chapter-progress">
        <ProgressBar cards={chapter.cards} />
        <div className="legend">
          <span>
            <StatusIcon status="solved" size={14} /> {t.solved} solved
          </span>
          <span>
            <StatusIcon status="tried" size={14} /> {t.tried} attempted
          </span>
          <span>
            <StatusIcon status="revealed" size={14} /> {t.revealed} revealed
          </span>
          <span>
            <StatusIcon status="new" size={14} /> {t.new} new
          </span>
        </div>
      </div>

      <div className="chips" role="group" aria-label="Filter problems">
        {FILTERS.map((f) => (
          <button key={f.key} className={`chip ${filter === f.key ? 'on' : ''}`} onClick={() => setFilter(f.key)} aria-pressed={filter === f.key}>
            {f.label}
          </button>
        ))}
      </div>

      {chapter.sections.map((s) => {
        const rows = s.cards.filter(keep)
        const st = tally(s.cards, progress)
        return (
          <section key={s.id} id={`sec-${s.id}`} className={`sec-block ${focusSection === s.id ? 'focus' : ''}`}>
            <div className="sec-head">
              <h2>
                <span>{s.id}</span> {s.title}
              </h2>
              <span className="sec-count">
                {st.solved}/{s.cards.length}
              </span>
              <a className="btn btn-ghost btn-sm" href={`#/practice?scope=${s.id}`}>
                Practice
              </a>
            </div>
            <ProgressBar cards={s.cards} thin />
            {rows.length ? (
              <ol className="prob-list">
                {rows.map((c) => (
                  <li key={c.id} className="prob-row">
                    <a className="pr-link" href={`#/p/${c.id}`}>
                      <StatusIcon status={progress[c.id]?.s ?? 'new'} first={progress[c.id]?.first} />
                      <span className="pr-num">{c.num}</span>
                      <span className="pr-name">
                        {c.name}
                        {c.kind === 'concept' && <span className="type-tag tt-concept">Concept</span>}
                      </span>
                      <TypeTag card={c} />
                      <span className="pr-page muted small">p.{c.page}</span>
                    </a>
                    <StarButton id={c.id} size={18} />
                  </li>
                ))}
              </ol>
            ) : (
              <p className="muted small empty-note">No problems match this filter.</p>
            )}
          </section>
        )
      })}
    </div>
  )
}
