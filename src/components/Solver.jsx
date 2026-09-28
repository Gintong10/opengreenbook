import { useEffect, useMemo, useRef, useState } from 'react'
import Rich from './Rich.jsx'
import { Icon } from './Icons.jsx'
import { StarButton, StatusIcon, TypeTag } from './Bits.jsx'
import { answerType, grade, preview } from '../lib/grade.js'
import { recordCorrect, recordReveal, recordWrong, useStore } from '../lib/store.js'
import { choicesFor, useKey } from '../lib/util.js'

const TRY_AGAIN = ['Not quite. Try again.', "That's not it. Give it another go.", 'Close? Check your work and try again.']
const LETTERS = ['A', 'B', 'C', 'D']
const finePointer = () => window.matchMedia?.('(pointer: fine)').matches

// One problem: prompt, answer box (or choices), feedback and the worked solution.
// Parents remount it per problem with key={card.id}.
export default function Solver({ card, onNext, nextLabel = 'Next problem', onResult, header }) {
  const type = answerType(card)
  const prior = useStore((s) => s.progress[card.id])
  const [initial] = useState(prior) // status when the problem was opened
  const [input, setInput] = useState('')
  const [phase, setPhase] = useState('answering') // answering | correct | revealed
  const [wrong, setWrong] = useState(0)
  const [feedback, setFeedback] = useState(null)
  const [shake, setShake] = useState(0)
  const [hint, setHint] = useState(false)
  const [rounded, setRounded] = useState(false)
  const [badChoices, setBadChoices] = useState([])
  const choices = useMemo(() => (type === 'choice' ? choicesFor(card) : []), [card, type])
  const inputRef = useRef(null)
  const nextRef = useRef(null)
  const done = phase !== 'answering'

  useEffect(() => {
    if (type !== 'choice' && finePointer()) inputRef.current?.focus()
  }, [type])
  useEffect(() => {
    if (done) nextRef.current?.focus({ preventScroll: true })
  }, [done])

  const succeed = (wasRounded = false) => {
    recordCorrect(card.id)
    setRounded(wasRounded)
    setPhase('correct')
    setFeedback(null)
    onResult?.(wrong === 0 ? 'first' : 'retry')
  }
  const fail = () => {
    recordWrong(card.id)
    setWrong((w) => w + 1)
    setShake((s) => s + 1)
    setFeedback({ kind: 'wrong', text: TRY_AGAIN[wrong % TRY_AGAIN.length] })
  }
  const reveal = () => {
    recordReveal(card.id)
    setPhase('revealed')
    setFeedback(null)
    onResult?.('revealed')
  }

  const submit = (e) => {
    e?.preventDefault()
    if (done) return
    if (!input.trim()) {
      setFeedback({ kind: 'invalid', text: 'Type an answer first.' })
      return
    }
    const r = grade(card, input)
    if (r.status === 'invalid') setFeedback({ kind: 'invalid', text: r.message })
    else if (r.status === 'correct') succeed(!!r.rounded)
    else fail()
  }
  const pick = (ch) => {
    if (done || badChoices.includes(ch)) return
    if (ch.correct) succeed()
    else {
      setBadChoices((b) => [...b, ch])
      fail()
    }
  }

  useKey(
    (e) => {
      if (e.key === 'Enter' && done && onNext && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'A') {
        e.preventDefault()
        onNext()
      }
      if (!done && type === 'choice' && ['1', '2', '3', '4', 'a', 'b', 'c', 'd'].includes(e.key.toLowerCase())) {
        const k = /\d/.test(e.key) ? Number(e.key) - 1 : 'abcd'.indexOf(e.key.toLowerCase())
        if (choices[k]) pick(choices[k])
      }
    },
    [done, onNext, type, choices, badChoices],
  )

  const live = type === 'number' && !done ? preview(input) : null
  const unit = card.check?.unit

  return (
    <article className={`problem ${phase}`}>
      {header}
      <div className="problem-head">
        <span className="pnum">{card.num}</span>
        <h1 className="pname">{card.name}</h1>
        <StarButton id={card.id} />
      </div>
      <div className="problem-meta">
        <TypeTag card={card} />
        {card.kind === 'concept' && <span className="type-tag tt-concept">Concept</span>}
        <span className="muted small">Book p.{card.page}</span>
        {initial && (
          <span className={`prior prior-${initial.s}`}>
            <StatusIcon status={initial.s} size={16} />
            {initial.s === 'solved' ? 'You solved this before' : initial.s === 'revealed' ? 'You revealed this before' : 'You tried this before'}
          </span>
        )}
      </div>

      <Rich text={card.prompt} className="problem-prompt" />

      {card.hint && !done && (
        <div className="hint-row">
          {hint ? (
            <p className="hint-text">
              <Icon.Bulb width={18} height={18} /> <Rich inline text={card.hint} />
            </p>
          ) : (
            <button className="link-btn" onClick={() => setHint(true)}>
              <Icon.Bulb width={18} height={18} /> Show hint
            </button>
          )}
        </div>
      )}

      {type === 'choice' ? (
        <div className="choices" role="group" aria-label="Answer choices">
          {choices.map((ch, k) => {
            let state = ''
            if (badChoices.includes(ch)) state = 'wrong'
            if (done && ch.correct) state = 'right'
            else if (done && !badChoices.includes(ch)) state = 'dim'
            return (
              <button key={k} className={`choice ${state}`} onClick={() => pick(ch)} disabled={done || badChoices.includes(ch)}>
                <span className="choice-key">{state === 'right' ? <Icon.Check width={16} height={16} /> : state === 'wrong' ? <Icon.Close width={16} height={16} /> : LETTERS[k]}</span>
                <Rich inline big text={ch.text} />
              </button>
            )
          })}
        </div>
      ) : (
        <form className="answer-form" onSubmit={submit}>
          <label className="answer-label" htmlFor={`ans-${card.id}`}>
            Your answer
          </label>
          <div className="answer-row">
            <div key={shake} className={`answer-box ${phase === 'correct' ? 'ok' : feedback?.kind === 'wrong' ? 'bad' : ''} ${shake ? 'shake' : ''}`}>
              <input
                id={`ans-${card.id}`}
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  if (feedback?.kind === 'invalid') setFeedback(null)
                }}
                readOnly={done}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                inputMode="text"
                placeholder={type === 'number' ? 'e.g. 5/11, 0.4545 or sqrt(2)/2' : 'Type a word or short phrase'}
              />
              {unit && <span className="answer-unit">{unit}</span>}
              {phase === 'correct' && <Icon.Check className="answer-ok" width={22} height={22} strokeWidth={3} />}
            </div>
            {!done && (
              <button type="submit" className="btn btn-primary btn-lg">
                Submit
              </button>
            )}
          </div>
          {!done && (
            <p className={`answer-help ${live ? 'live' : ''}`}>
              {live ? (
                <>
                  Reads as <b>{live}</b>
                </>
              ) : type === 'number' ? (
                'Fractions, decimals, % and expressions like C(52,5) or 1-(5/6)^2 all work.'
              ) : (
                'Spelling and capitalization are forgiven.'
              )}
            </p>
          )}
        </form>
      )}

      {feedback && !done && (
        <div className={`feedback-msg fb-${feedback.kind}`} role="status">
          {feedback.kind === 'wrong' && <Icon.Close width={18} height={18} strokeWidth={2.6} />}
          <span>{feedback.text}</span>
          {wrong > 0 && feedback.kind === 'wrong' && (
            <span className="muted small">
              {wrong} {wrong === 1 ? 'try' : 'tries'}
            </span>
          )}
          {type === 'text' && feedback.kind === 'wrong' && (
            <button className="link-btn" onClick={() => succeed()}>
              I was right
            </button>
          )}
        </div>
      )}

      {!done && (
        <div className="problem-actions">
          <button className="link-btn" onClick={reveal}>
            <Icon.Eye width={18} height={18} /> Show answer
          </button>
          {onNext && (
            <button className="link-btn muted-link" onClick={onNext}>
              Skip <Icon.ArrowRight width={16} height={16} />
            </button>
          )}
        </div>
      )}

      {done && (
        <div className="solution">
          {phase === 'correct' ? (
            <div className="result-banner ok">
              <span className="rb-icon">
                <Icon.Check width={22} height={22} strokeWidth={3} />
              </span>
              <div>
                <strong>Correct!</strong>
                <span>{wrong === 0 ? 'First try.' : `Solved after ${wrong + 1} tries.`}</span>
              </div>
            </div>
          ) : (
            <div className="result-banner shown">
              <span className="rb-icon">
                <Icon.Eye width={20} height={20} />
              </span>
              <div>
                <strong>Here's the answer.</strong>
                <span>Read the solution, then come back to this one later.</span>
              </div>
            </div>
          )}
          <div className="solution-body">
            <p className="sol-label">Answer{rounded ? ' (your rounded value was accepted)' : ''}</p>
            <Rich text={card.answer} className="sol-answer" big />
            <p className="sol-label">Solution</p>
            <Rich text={card.explanation} className="sol-explain" />
          </div>
          {onNext && (
            <div className="next-row">
              <span className="muted small kbd-hint">Press Enter</span>
              <button ref={nextRef} className="btn btn-primary btn-lg" onClick={onNext}>
                {nextLabel} <Icon.ArrowRight />
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  )
}
