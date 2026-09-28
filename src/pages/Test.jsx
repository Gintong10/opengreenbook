import { useMemo, useState } from 'react'
import Rich from '../components/Rich.jsx'
import { Icon } from '../components/Icons.jsx'
import { ModeHeader, ScopeNote, Toggle, Donut, useScopedCards } from '../components/Study.jsx'
import { setStatus } from '../lib/store.js'
import { choicesFor, sample, shuffle, formatTime } from '../lib/util.js'

const LETTERS = ['A', 'B', 'C', 'D', 'E']

function buildTest(cards, count, types) {
  const picked = sample(cards, count)
  const qs = []
  let k = 0
  // Matching blocks take four cards at a time; the rest alternate MC / true-false.
  const matchBlocks = types.match ? Math.floor(picked.length / 4 / 3) : 0
  for (let b = 0; b < matchBlocks; b++) {
    const group = picked.slice(k, k + 4)
    k += 4
    qs.push({ kind: 'match', cards: group, right: shuffle(group.map((c) => c.id)) })
  }
  const rest = picked.slice(k)
  const kinds = [types.mc && 'mc', types.tf && 'tf'].filter(Boolean)
  rest.forEach((card, j) => {
    const kind = kinds[j % kinds.length] ?? 'mc'
    if (kind === 'mc') qs.push({ kind, card, choices: choicesFor(card) })
    else {
      const truthful = Math.random() < 0.5
      qs.push({ kind, card, shown: truthful ? card.answer : card.distractors[Math.floor(Math.random() * 3)], truthful })
    }
  })
  return shuffle(qs)
}

function score(q, a) {
  if (q.kind === 'mc') return a != null && q.choices[a].correct ? 1 : 0
  if (q.kind === 'tf') return a != null && a === q.truthful ? 1 : 0
  return q.cards.filter((c) => a?.[c.id] === c.id).length
}
const worth = (q) => (q.kind === 'match' ? q.cards.length : 1)
const answered = (q, a) => (q.kind === 'match' ? q.cards.every((c) => a?.[c.id]) : a != null)

function Setup({ set, cards, scope, onStart }) {
  const [count, setCount] = useState(Math.min(20, cards.length))
  const [types, setTypes] = useState({ mc: true, tf: true, match: true })
  const toggle = (k) => (v) => {
    const next = { ...types, [k]: v }
    if (next.mc || next.tf || next.match) setTypes(next)
  }
  return (
    <div className="mode-body narrow">
      <ScopeNote set={set} scope={scope} count={cards.length} />
      <div className="setup-card">
        <div className="setup-head">
          <div>
            <p className="eyebrow">{set.title}</p>
            <h2>Set up your test</h2>
          </div>
          <Icon.Test className="setup-ico" />
        </div>
        <label className="setup-row">
          <span>
            Questions <span className="muted">(max {cards.length})</span>
          </span>
          <input type="number" min={1} max={cards.length} value={count} onChange={(e) => setCount(Math.max(1, Math.min(cards.length, Number(e.target.value) || 1)))} />
        </label>
        <div className="setup-row">
          <span>Multiple choice</span>
          <Toggle checked={types.mc} onChange={toggle('mc')} label="" />
        </div>
        <div className="setup-row">
          <span>True / False</span>
          <Toggle checked={types.tf} onChange={toggle('tf')} label="" />
        </div>
        <div className="setup-row">
          <span>
            Matching <span className="muted">(needs 12+ questions)</span>
          </span>
          <Toggle checked={types.match} onChange={toggle('match')} label="" />
        </div>
        <button className="btn btn-primary btn-lg btn-block" onClick={() => onStart(buildTest(cards, count, types))}>
          Start test
        </button>
      </div>
    </div>
  )
}

function MCQuestion({ q, a, onAnswer, graded }) {
  return (
    <div className="choices">
      {q.choices.map((ch, k) => {
        let state = a === k ? 'selected' : ''
        if (graded) state = ch.correct ? 'right' : a === k ? 'wrong' : 'dim'
        return (
          <button key={k} className={`choice ${state}`} onClick={() => onAnswer(k)} disabled={graded}>
            <span className="choice-key">{LETTERS[k]}</span>
            <Rich inline big text={ch.text} />
          </button>
        )
      })}
    </div>
  )
}

function TFQuestion({ q, a, onAnswer, graded }) {
  return (
    <>
      <div className="tf-shown">
        <span className="reveal-label">Proposed answer</span>
        <Rich text={q.shown} big />
      </div>
      <div className="tf-btns">
        {[true, false].map((v) => {
          let state = a === v ? 'selected' : ''
          if (graded) state = v === q.truthful ? 'right' : a === v ? 'wrong' : 'dim'
          return (
            <button key={String(v)} className={`choice tf ${state}`} onClick={() => onAnswer(v)} disabled={graded}>
              {v ? 'True' : 'False'}
            </button>
          )
        })}
      </div>
      {graded && !q.truthful && (
        <div className="reveal-row right">
          <span className="reveal-label">Correct answer</span>
          <Rich text={q.card.answer} big />
        </div>
      )}
    </>
  )
}

function MatchQuestion({ q, a = {}, onAnswer, graded }) {
  const letterOf = (id) => LETTERS[q.right.indexOf(id)]
  return (
    <div className="tmatch">
      <div className="tmatch-answers">
        {q.right.map((id, k) => (
          <div key={id} className="tmatch-answer">
            <span className="choice-key">{LETTERS[k]}</span>
            <Rich inline big text={q.cards.find((c) => c.id === id).answer} />
          </div>
        ))}
      </div>
      <div className="tmatch-rows">
        {q.cards.map((c) => (
          <div key={c.id} className="tmatch-row">
            <span className="tmatch-name">{c.name}</span>
            <div className="letter-btns">
              {q.right.map((id, k) => {
                let state = a[c.id] === id ? 'selected' : ''
                if (graded) state = id === c.id ? 'right' : a[c.id] === id ? 'wrong' : 'dim'
                return (
                  <button key={id} className={`letter ${state}`} disabled={graded} onClick={() => onAnswer({ ...a, [c.id]: id })} aria-label={`${c.name}: ${LETTERS[k]}`}>
                    {LETTERS[k]}
                  </button>
                )
              })}
            </div>
            {graded && a[c.id] !== c.id && <span className="tmatch-fix small">→ {letterOf(c.id)}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Test({ set }) {
  const { cards, scope } = useScopedCards(set)
  const [qs, setQs] = useState(null)
  const [answers, setAnswers] = useState({})
  const [graded, setGraded] = useState(false)
  const [started, setStarted] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [open, setOpen] = useState({})

  const totalPoints = useMemo(() => (qs ? qs.reduce((n, q) => n + worth(q), 0) : 0), [qs])
  const points = qs ? qs.reduce((n, q, i) => n + score(q, answers[i]), 0) : 0
  const done = qs ? qs.filter((q, i) => answered(q, answers[i])).length : 0

  const start = (built) => {
    setQs(built)
    setAnswers({})
    setGraded(false)
    setOpen({})
    setStarted(Date.now())
    window.scrollTo(0, 0)
  }
  const submit = () => {
    setGraded(true)
    setElapsed(Date.now() - started)
    // Missed cards go back to "still learning"; correct ones keep their status.
    qs.forEach((q, i) => {
      const a = answers[i]
      if (q.kind === 'match') q.cards.forEach((c) => a?.[c.id] !== c.id && setStatus(c.id, 'learning'))
      else if (!score(q, a)) setStatus(q.card.id, 'learning')
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const pct = totalPoints ? points / totalPoints : 0
  const verdict = pct >= 0.9 ? 'Outstanding — you are interview-ready on these.' : pct >= 0.7 ? "You're doing great! Keep practicing." : pct >= 0.5 ? 'Solid start. Review the misses below.' : 'Keep at it — Learn mode will get you there.'

  return (
    <div className="mode-page">
      <ModeHeader set={set} mode="test" center={qs && <span className="mode-count">{graded ? `${points} / ${totalPoints}` : `${done} / ${qs.length} answered`}</span>} />
      {!qs ? (
        <Setup set={set} cards={cards} scope={scope} onStart={start} />
      ) : (
        <div className="mode-body narrow">
          {graded && (
            <div className="summary results">
              <div className="summary-head">
                <Donut value={points} total={totalPoints} />
                <div>
                  <h2>{verdict}</h2>
                  <p className="muted">
                    <span className="tone-known">{points} correct</span> · <span className="tone-wrong">{totalPoints - points} incorrect</span> · {formatTime(elapsed)}
                  </p>
                </div>
              </div>
              <div className="summary-actions">
                <button className="btn btn-primary btn-lg" onClick={() => setQs(null)}>
                  Take a new test
                </button>
                <a className="btn btn-ghost btn-lg" href={`#/set/${set.id}/learn`}>
                  <Icon.Learn /> Practice in Learn
                </a>
              </div>
            </div>
          )}

          {qs.map((q, i) => {
            const a = answers[i]
            const ok = graded && score(q, a) === worth(q)
            const card = q.card ?? q.cards[0]
            return (
              <section key={i} className={`question-card test-q ${graded ? (ok ? 'is-correct' : 'is-wrong') : ''}`}>
                <div className="face-head">
                  <span className="card-label">
                    <span className="card-label-name">{q.kind === 'match' ? 'Match each problem to its answer' : q.card.name}</span>
                    <span className="card-label-meta">{q.kind === 'match' ? `${q.cards.length} items` : `§${card.section} · p.${card.page}`}</span>
                  </span>
                  <span className="q-type">
                    {i + 1} of {qs.length} · {q.kind === 'mc' ? 'Multiple choice' : q.kind === 'tf' ? 'True / False' : 'Matching'}
                  </span>
                </div>
                {q.kind !== 'match' && <Rich text={q.card.prompt} className="q-prompt fs-md" />}
                {q.kind === 'mc' && <MCQuestion q={q} a={a} graded={graded} onAnswer={(v) => setAnswers((s) => ({ ...s, [i]: v }))} />}
                {q.kind === 'tf' && <TFQuestion q={q} a={a} graded={graded} onAnswer={(v) => setAnswers((s) => ({ ...s, [i]: v }))} />}
                {q.kind === 'match' && <MatchQuestion q={q} a={a} graded={graded} onAnswer={(v) => setAnswers((s) => ({ ...s, [i]: v }))} />}
                {graded && q.kind !== 'match' && (
                  <div className="feedback">
                    <button className="link-btn" onClick={() => setOpen((o) => ({ ...o, [i]: !o[i] }))}>
                      <Icon.Bulb width={18} height={18} /> {open[i] ? 'Hide explanation' : 'Show explanation'}
                    </button>
                    {open[i] && <Rich text={q.card.explanation} className="feedback-explain" />}
                  </div>
                )}
              </section>
            )
          })}

          {!graded && (
            <div className="submit-bar">
              <span className="muted">
                {done === qs.length ? 'All questions answered.' : `${qs.length - done} unanswered`}
              </span>
              <button className="btn btn-primary btn-lg" onClick={submit}>
                Submit test
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
