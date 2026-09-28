import { useMemo, useState } from 'react'
import Solver from '../components/Solver.jsx'
import Rich from '../components/Rich.jsx'
import { Icon } from '../components/Icons.jsx'
import { StatusIcon, Toggle } from '../components/Bits.jsx'
import { chapters, cardById, sectionById } from '../lib/data.js'
import { answerType } from '../lib/grade.js'
import { useStore } from '../lib/store.js'
import { go, sample } from '../lib/util.js'

const SKEY = 'ogb:session'
let memorySession = null

export function loadSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SKEY)) ?? memorySession
  } catch {
    return memorySession
  }
}
function saveSession(s) {
  memorySession = s
  try {
    sessionStorage.setItem(SKEY, JSON.stringify(s))
  } catch {
    // in-memory copy is enough for this tab
  }
}

const TYPES = [
  { key: 'number', label: 'Numeric' },
  { key: 'text', label: 'Short answer' },
  { key: 'choice', label: 'Multiple choice' },
]
const COUNTS = [5, 10, 20, 0]

function initialSections(scope) {
  if (scope?.startsWith('ch')) return new Set(chapters.find((c) => c.id === scope)?.sections.map((s) => s.id) ?? [])
  if (scope && sectionById.has(scope)) return new Set([scope])
  return new Set(chapters.flatMap((c) => c.sections.map((s) => s.id)))
}

function buildPool(settings, progress, stars) {
  return chapters
    .flatMap((c) => c.cards)
    .filter((c) => settings.sections.includes(c.section))
    .filter((c) => settings.types.includes(answerType(c)))
    .filter((c) => !settings.unsolved || progress[c.id]?.s !== 'solved')
    .filter((c) => !settings.starred || stars[c.id])
}

function start(settings, pool) {
  const ids = (settings.count ? sample(pool, settings.count) : sample(pool, pool.length)).map((c) => c.id)
  saveSession({ ids, i: 0, results: {}, settings })
  go('/practice/run')
}

export function PracticeSetup({ scope }) {
  const progress = useStore((s) => s.progress)
  const stars = useStore((s) => s.stars)
  const [sections, setSections] = useState(() => initialSections(scope))
  const [expanded, setExpanded] = useState(() => new Set(scope ? [scope.startsWith('ch') ? Number(scope.slice(2)) : Number(scope.split('.')[0])] : []))
  const [types, setTypes] = useState(['number', 'text', 'choice'])
  const [unsolved, setUnsolved] = useState(true)
  const [starred, setStarred] = useState(false)
  const [count, setCount] = useState(10)

  const settings = { sections: [...sections], types, unsolved, starred, count }
  const pool = buildPool(settings, progress, stars)

  const setMany = (ids, on) =>
    setSections((prev) => {
      const n = new Set(prev)
      ids.forEach((id) => (on ? n.add(id) : n.delete(id)))
      return n
    })
  const toggleType = (k) => setTypes((t) => (t.includes(k) ? (t.length > 1 ? t.filter((x) => x !== k) : t) : [...t, k]))
  const allIds = chapters.flatMap((c) => c.sections.map((s) => s.id))

  return (
    <div className="page narrow">
      <p className="eyebrow">Practice</p>
      <h1 className="page-title">Build a problem set</h1>
      <p className="muted lead">Pick topics, and the trainer serves random problems one at a time. Your score counts first-try answers.</p>

      <section className="panel">
        <div className="panel-head">
          <h2>Topics</h2>
          <div className="panel-tools">
            <button className="link-btn" onClick={() => setSections(new Set(allIds))}>
              Select all
            </button>
            <button className="link-btn" onClick={() => setSections(new Set())}>
              Clear
            </button>
          </div>
        </div>
        <ul className="topic-tree">
          {chapters.map((c) => {
            const ids = c.sections.map((s) => s.id)
            const on = ids.filter((id) => sections.has(id)).length
            const open = expanded.has(c.chapter)
            return (
              <li key={c.id}>
                <div className="topic-row">
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={on === ids.length}
                      ref={(el) => el && (el.indeterminate = on > 0 && on < ids.length)}
                      onChange={(e) => setMany(ids, e.target.checked)}
                    />
                    <span>
                      <b>{c.chapter}.</b> {c.title}
                    </span>
                  </label>
                  <span className="muted small">{c.cards.length}</span>
                  <button
                    className="icon-btn sm"
                    onClick={() =>
                      setExpanded((x) => {
                        const n = new Set(x)
                        if (n.has(c.chapter)) n.delete(c.chapter)
                        else n.add(c.chapter)
                        return n
                      })
                    }
                    aria-expanded={open}
                    aria-label={`Sections of chapter ${c.chapter}`}
                  >
                    <Icon.Chevron width={18} height={18} className={open ? 'rot' : ''} />
                  </button>
                </div>
                {open && (
                  <div className="topic-sections">
                    {c.sections.map((s) => (
                      <button key={s.id} className={`chip ${sections.has(s.id) ? 'on' : ''}`} onClick={() => setMany([s.id], !sections.has(s.id))} aria-pressed={sections.has(s.id)}>
                        <b>{s.id}</b> {s.title}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      <section className="panel">
        <h2>Options</h2>
        <div className="opt-row">
          <span>Answer types</span>
          <div className="chips">
            {TYPES.map((t) => (
              <button key={t.key} className={`chip ${types.includes(t.key) ? 'on' : ''}`} onClick={() => toggleType(t.key)} aria-pressed={types.includes(t.key)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="opt-row">
          <span>Skip problems I've solved</span>
          <Toggle checked={unsolved} onChange={setUnsolved} />
        </div>
        <div className="opt-row">
          <span>Bookmarked only</span>
          <Toggle checked={starred} onChange={setStarred} />
        </div>
        <div className="opt-row">
          <span>Problems</span>
          <div className="segmented" role="radiogroup">
            {COUNTS.map((n) => (
              <button key={n} role="radio" aria-checked={count === n} className={count === n ? 'on' : ''} onClick={() => setCount(n)}>
                {n || 'All'}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="start-bar">
        <span className="muted">
          {pool.length} {pool.length === 1 ? 'problem matches' : 'problems match'}
        </span>
        <button className="btn btn-primary btn-lg" disabled={!pool.length} onClick={() => start(settings, pool)}>
          Start {count && pool.length ? Math.min(count, pool.length) : pool.length} problems <Icon.ArrowRight />
        </button>
      </div>
    </div>
  )
}

export function PracticeRun() {
  const [session, setSession] = useState(loadSession)
  const progress = useStore((s) => s.progress)
  const stars = useStore((s) => s.stars)

  const update = (s) => {
    saveSession(s)
    setSession(s)
  }
  const summary = useMemo(() => {
    if (!session) return null
    const r = Object.values(session.results)
    return { first: r.filter((x) => x === 'first').length, retry: r.filter((x) => x === 'retry').length, revealed: r.filter((x) => x === 'revealed').length }
  }, [session])

  if (!session?.ids?.length) {
    return (
      <div className="page narrow">
        <div className="panel center">
          <h2>No practice set in progress</h2>
          <p className="muted">Build one to get started.</p>
          <a className="btn btn-primary btn-lg" href="#/practice">
            Build a problem set
          </a>
        </div>
      </div>
    )
  }

  const total = session.ids.length
  const finished = session.i >= total
  const card = finished ? null : cardById.get(session.ids[session.i])
  const advance = () => update({ ...session, i: session.i + 1, results: { ...session.results, [card.id]: session.results[card.id] ?? 'skipped' } })
  const record = (res) => update({ ...session, results: { ...session.results, [card.id]: session.results[card.id] ?? res } })

  const bar = (
    <div className="session-bar">
      <div className="sb-top">
        <span className="session-title">
          <Icon.Target width={18} height={18} /> Practice
        </span>
        <span className="session-pos">{finished ? 'Done' : `Problem ${session.i + 1} of ${total}`}</span>
        <span className="session-score" title="Correct on the first try">
          <Icon.Check width={16} height={16} strokeWidth={3} /> {summary.first}
        </span>
        {!finished && (
          <button className="link-btn" onClick={() => update({ ...session, i: total })}>
            End
          </button>
        )}
      </div>
      <div className="session-track">
        <span style={{ width: `${(Math.min(session.i, total) / total) * 100}%` }} />
      </div>
    </div>
  )

  if (finished) {
    const missed = session.ids.filter((id) => session.results[id] !== 'first')
    const pct = Math.round((summary.first / total) * 100)
    return (
      <div className="page narrow">
        {bar}
        <section className="panel results">
          <div className="score-big">
            <span className="score-num">
              {summary.first}
              <small>/{total}</small>
            </span>
            <div>
              <h2>{pct >= 90 ? 'Excellent work.' : pct >= 70 ? 'Strong set.' : pct >= 40 ? 'Good practice.' : 'Keep at it.'}</h2>
              <p className="muted">
                {summary.first} first try · {summary.retry} after retries · {summary.revealed} revealed · {total - summary.first - summary.retry - summary.revealed} skipped
              </p>
            </div>
          </div>
          <ol className="prob-list">
            {session.ids.map((id) => {
              const c = cardById.get(id)
              const r = session.results[id]
              return (
                <li key={id} className="prob-row">
                  <a className="pr-link" href={`#/p/${id}`}>
                    <StatusIcon status={r === 'first' || r === 'retry' ? 'solved' : r === 'revealed' ? 'revealed' : progress[id] ? progress[id].s : 'new'} first={r === 'first'} />
                    <span className="pr-num">{c.num}</span>
                    <span className="pr-name">{c.name}</span>
                    <span className={`res-tag res-${r ?? 'skipped'}`}>{r === 'first' ? 'First try' : r === 'retry' ? 'Retried' : r === 'revealed' ? 'Revealed' : 'Skipped'}</span>
                  </a>
                </li>
              )
            })}
          </ol>
          <div className="summary-actions">
            {missed.length > 0 && (
              <button className="btn btn-primary btn-lg" onClick={() => update({ ids: sample(missed, missed.length), i: 0, results: {}, settings: session.settings })}>
                Retry {missed.length} missed
              </button>
            )}
            <button
              className="btn btn-ghost btn-lg"
              onClick={() => {
                const pool = buildPool(session.settings, progress, stars)
                if (pool.length) start(session.settings, pool)
                else go('/practice')
              }}
            >
              New set, same topics
            </button>
            <a className="btn btn-ghost btn-lg" href="#/practice">
              Change topics
            </a>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="page narrow">
      {bar}
      <Solver
        key={`${session.i}-${card.id}`}
        card={card}
        onNext={advance}
        nextLabel={session.i + 1 === total ? 'See results' : 'Next problem'}
        onResult={record}
        header={
          <p className="session-crumb muted small">
            <a href={`#/ch/${card.chapter}?s=${card.section}`}>
              {card.section} <Rich inline text={sectionById.get(card.section).title} />
            </a>
          </p>
        }
      />
    </div>
  )
}
