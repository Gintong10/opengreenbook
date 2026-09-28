import { useMemo, useRef, useState, useEffect } from 'react'
import Rich from '../components/Rich.jsx'
import { Icon } from '../components/Icons.jsx'
import { ModeHeader, ScopeNote, Toggle, CardLabel, StarButton, sizeClass, useScopedCards } from '../components/Study.jsx'
import { setStatus, useStore } from '../lib/store.js'
import { choicesFor, shuffle, useKey } from '../lib/util.js'
import { plain } from '../lib/tokenize.js'

const ROUND = 7
const PRAISE = ['Nice work!', 'You got it!', 'Awesome!', 'Spot on!', 'Correct!', 'Nailed it!']
const COMFORT = ["No worries — that's how learning works.", 'Not quite. You will get it next time.', "Almost! Let's review it.", 'Keep going — this one will stick soon.']
const pick = (a) => a[Math.floor(Math.random() * a.length)]

const norm = (s) =>
  plain(s)
    .toLowerCase()
    .replace(/\\[a-z]+/g, '')
    .replace(/[\s{}^_*()[\],.;:'"`$\\]/g, '')

function nextRound(stages, order) {
  const active = order.filter((id) => stages[id] < 2)
  // Cards already in progress come first so the learner finishes what they started.
  const started = active.filter((id) => stages[id] === 1)
  const fresh = active.filter((id) => stages[id] === 0)
  return [...started, ...fresh].slice(0, ROUND).sort(() => Math.random() - 0.5)
}

export default function Learn({ set }) {
  const { cards, scope } = useScopedCards(set)
  const progress = useStore((s) => s.progress)
  const byId = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards])
  const [order] = useState(() => shuffle(cards.map((c) => c.id)))
  const [stages, setStages] = useState(() => Object.fromEntries(cards.map((c) => [c.id, progress[c.id] === 'known' ? 1 : 0])))
  const [written, setWritten] = useState(true)
  const [showOptions, setShowOptions] = useState(false)
  const [round, setRound] = useState(() => nextRound(stages, order))
  const [roundNo, setRoundNo] = useState(1)
  const [pos, setPos] = useState(0)
  const [roundResults, setRoundResults] = useState([])
  const [answer, setAnswer] = useState(null) // { correct, choice?, typed?, selfGrade? }
  const [typed, setTyped] = useState('')
  const [whyOpen, setWhyOpen] = useState(false)

  const total = cards.length
  const mastered = Object.values(stages).filter((s) => s === 2).length
  const familiar = Object.values(stages).filter((s) => s === 1).length
  const finished = mastered === total
  const inSummary = !finished && pos >= round.length
  const card = !finished && !inSummary ? byId.get(round[pos]) : null
  const stage = card ? stages[card.id] : 0
  const type = card && stage === 1 && written ? 'written' : 'mc'
  const choices = useMemo(() => (card ? choicesFor(card) : []), [card, pos, roundNo]) // eslint-disable-line react-hooks/exhaustive-deps

  const inputRef = useRef(null)
  useEffect(() => {
    if (type === 'written' && !answer) inputRef.current?.focus()
  }, [type, answer, card])

  const settle = (correct) => {
    const id = card.id
    const next = correct ? Math.min(2, stage + 1) : 0
    setStages((s) => ({ ...s, [id]: next }))
    setStatus(id, next === 2 ? 'known' : 'learning')
    setRoundResults((r) => [...r, { id, correct }])
  }

  const chooseMC = (choice) => {
    if (answer) return
    setAnswer({ correct: choice.correct, choice, msg: pick(choice.correct ? PRAISE : COMFORT) })
    settle(choice.correct)
  }
  const dontKnow = () => {
    if (answer) return
    setAnswer({ correct: false, skipped: true, msg: pick(COMFORT) })
    settle(false)
  }
  const submitWritten = (e) => {
    e?.preventDefault()
    if (answer) return
    if (!typed.trim()) return dontKnow()
    if (norm(typed) === norm(card.answer)) {
      setAnswer({ correct: true, typed, msg: pick(PRAISE) })
      settle(true)
    } else {
      setAnswer({ correct: null, typed }) // learner grades themselves
    }
  }
  const selfGrade = (correct) => {
    setAnswer((a) => ({ ...a, correct, selfGraded: true, msg: pick(correct ? PRAISE : COMFORT) }))
    settle(correct)
  }
  const advance = () => {
    setAnswer(null)
    setTyped('')
    setWhyOpen(false)
    setPos((p) => p + 1)
  }
  const startNextRound = () => {
    setRound(nextRound(stages, order))
    setRoundNo((n) => n + 1)
    setRoundResults([])
    setPos(0)
  }
  const restart = () => {
    const fresh = Object.fromEntries(cards.map((c) => [c.id, 0]))
    setStages(fresh)
    setRound(nextRound(fresh, order))
    setRoundNo(1)
    setRoundResults([])
    setPos(0)
    setAnswer(null)
  }

  useKey(
    (e) => {
      // Let a focused button handle its own Enter activation.
      if (e.target.tagName === 'BUTTON' && e.key === 'Enter') return
      if (inSummary && e.key === 'Enter') return startNextRound()
      if (!card) return
      if (answer && answer.correct !== null && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault()
        return advance()
      }
      if (!answer && type === 'mc' && ['1', '2', '3', '4'].includes(e.key)) chooseMC(choices[Number(e.key) - 1])
    },
    [card, answer, type, choices, inSummary],
  )

  const pctM = total ? (mastered / total) * 100 : 0
  const pctF = total ? (familiar / total) * 100 : 0

  return (
    <div className="mode-page">
      <ModeHeader set={set} mode="learn" center={<span className="mode-count">Round {roundNo}</span>}>
        <button className={`icon-btn ${showOptions ? 'on' : ''}`} onClick={() => setShowOptions((s) => !s)} aria-label="Options" title="Options">
          <Icon.Settings />
        </button>
      </ModeHeader>

      <div className="mode-body narrow">
        <ScopeNote set={set} scope={scope} count={total} />
        {showOptions && (
          <div className="options-panel">
            <Toggle checked={written} onChange={setWritten} label="Written recall after multiple choice" />
            <button className="link-btn" onClick={restart}>
              <Icon.Reset width={16} height={16} /> Restart Learn
            </button>
          </div>
        )}

        <div className="learn-progress">
          <span className="lp-num">{mastered}</span>
          <div className="lp-bar" aria-label={`${mastered} of ${total} mastered`}>
            <span className="lp-mastered" style={{ width: `${pctM}%` }} />
            <span className="lp-familiar" style={{ width: `${pctF}%` }} />
          </div>
          <span className="lp-num">{total}</span>
        </div>
        <div className="lp-legend muted small">
          <span>
            <i className="dot known" /> Mastered {mastered}
          </span>
          <span>
            <i className="dot familiar" /> Familiar {familiar}
          </span>
          <span>
            <i className="dot fresh" /> New {total - mastered - familiar}
          </span>
        </div>

        {finished && (
          <div className="summary">
            <div className="summary-head">
              <div className="trophy" aria-hidden>
                🎉
              </div>
              <div>
                <h2>You mastered all {total} cards!</h2>
                <p className="muted">Lock it in with a practice test, or race the clock in Match.</p>
              </div>
            </div>
            <div className="summary-actions">
              <a className="btn btn-primary btn-lg" href={`#/set/${set.id}/test`}>
                <Icon.Test /> Take a practice test
              </a>
              <a className="btn btn-ghost btn-lg" href={`#/set/${set.id}/match`}>
                <Icon.Match /> Play Match
              </a>
              <button className="btn btn-ghost btn-lg" onClick={restart}>
                Learn again
              </button>
            </div>
          </div>
        )}

        {inSummary && (
          <div className="summary">
            <h2>
              Round {roundNo} done — {roundResults.filter((r) => r.correct).length} of {roundResults.length} correct
            </h2>
            <p className="muted">
              {mastered} of {total} mastered so far. Keep going to lock in the rest.
            </p>
            <ul className="round-list">
              {round.map((id) => {
                const c = byId.get(id)
                const s = stages[id]
                return (
                  <li key={id}>
                    <span className={`status-dot ${s === 2 ? 'known' : s === 1 ? 'familiar' : 'learning'}`} />
                    <span className="rl-name">{c.name}</span>
                    <Rich inline big text={c.answer} className="rl-answer" />
                  </li>
                )
              })}
            </ul>
            <button className="btn btn-primary btn-lg" onClick={startNextRound}>
              Continue to round {roundNo + 1}
            </button>
          </div>
        )}

        {card && (
          <div className={`question-card ${answer ? (answer.correct ? 'is-correct' : answer.correct === false ? 'is-wrong' : '') : ''}`}>
            <div className="face-head">
              <CardLabel card={card} />
              <span className="q-type">{type === 'mc' ? 'Multiple choice' : 'Written'}</span>
              <StarButton id={card.id} />
            </div>
            <Rich text={card.prompt} className={`q-prompt ${sizeClass(card.prompt)}`} />

            {type === 'mc' ? (
              <>
                <p className="q-instr">{answer ? answer.msg : 'Choose the answer'}</p>
                <div className="choices">
                  {choices.map((ch, k) => {
                    let state = ''
                    if (answer) {
                      if (ch.correct) state = 'right'
                      else if (answer.choice === ch) state = 'wrong'
                      else state = 'dim'
                    }
                    return (
                      <button key={k} className={`choice ${state}`} onClick={() => chooseMC(ch)} disabled={!!answer}>
                        <span className="choice-key">{state === 'right' ? <Icon.Check width={16} height={16} /> : state === 'wrong' ? <Icon.Close width={16} height={16} /> : k + 1}</span>
                        <Rich inline big text={ch.text} />
                      </button>
                    )
                  })}
                </div>
              </>
            ) : (
              <>
                <p className="q-instr">{answer ? (answer.correct === null ? 'Compare with the answer — were you right?' : answer.msg) : 'Type the answer'}</p>
                {!answer ? (
                  <form onSubmit={submitWritten} className="written">
                    <textarea
                      ref={inputRef}
                      value={typed}
                      onChange={(e) => setTyped(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) submitWritten(e)
                      }}
                      placeholder="Type your answer (numbers, formulas or a short sentence)"
                      rows={2}
                    />
                    <div className="written-actions">
                      <button type="button" className="link-btn" onClick={dontKnow}>
                        Don&apos;t know?
                      </button>
                      <button type="submit" className="btn btn-primary">
                        Answer
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="reveal">
                    {answer.typed && (
                      <div className={`reveal-row yours ${answer.correct === false ? 'wrong' : answer.correct ? 'right' : ''}`}>
                        <span className="reveal-label">Your answer</span>
                        <span>{answer.typed}</span>
                      </div>
                    )}
                    <div className="reveal-row right">
                      <span className="reveal-label">Correct answer</span>
                      <Rich text={card.answer} big />
                    </div>
                    {answer.correct === null && (
                      <div className="grade-btns">
                        <button className="btn btn-learning" onClick={() => selfGrade(false)}>
                          <Icon.Close width={18} height={18} /> I was wrong
                        </button>
                        <button className="btn btn-known" onClick={() => selfGrade(true)}>
                          <Icon.Check width={18} height={18} /> I got it right
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {type === 'mc' && !answer && (
              <div className="q-foot">
                <button className="link-btn" onClick={dontKnow}>
                  Don&apos;t know?
                </button>
              </div>
            )}

            {answer && answer.correct !== null && (
              <div className="feedback">
                <button className="link-btn" onClick={() => setWhyOpen((w) => !w)} aria-expanded={whyOpen || !answer.correct}>
                  <Icon.Bulb width={18} height={18} /> {whyOpen || !answer.correct ? 'Explanation' : 'Why?'}
                </button>
                {(whyOpen || !answer.correct) && <Rich text={card.explanation} className="feedback-explain" />}
                <div className="feedback-bar">
                  <span className="muted small">Press Enter to continue</span>
                  <button className="btn btn-primary" onClick={advance}>
                    Continue
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
