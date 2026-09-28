import { useRef, useState } from 'react'
import { FlipCard, ModeHeader, ScopeNote, Toggle, Donut, useScopedCards } from '../components/Study.jsx'
import { Icon } from '../components/Icons.jsx'
import { setStatus } from '../lib/store.js'
import { shuffle, useKey } from '../lib/util.js'

export default function Flashcards({ set }) {
  const { cards, scope } = useScopedCards(set)
  const [order, setOrder] = useState(cards)
  const [shuffled, setShuffled] = useState(false)
  const [i, setI] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [track, setTrack] = useState(true)
  const [answerFirst, setAnswerFirst] = useState(false)
  const [results, setResults] = useState({})
  const [showOptions, setShowOptions] = useState(false)
  const [exit, setExit] = useState(null)
  const busy = useRef(false) // true while a graded card animates out

  const done = i >= order.length
  const card = order[Math.min(i, order.length - 1)]
  const knowCount = Object.values(results).filter((r) => r === 'known').length
  const learnCount = Object.values(results).filter((r) => r === 'learning').length

  const go = (d) => {
    setFlipped(false)
    setI((x) => Math.max(0, Math.min(order.length - (track ? 0 : 1), x + d)))
  }
  const grade = (status) => {
    if (done || busy.current) return
    busy.current = true
    setResults((r) => ({ ...r, [card.id]: status }))
    setStatus(card.id, status)
    setExit(status)
    setTimeout(() => {
      busy.current = false
      setExit(null)
      setFlipped(false)
      setI((x) => x + 1)
    }, 180)
  }
  const undo = () => {
    if (i === 0 || busy.current) return
    const prev = order[i - 1]
    setResults((r) => {
      const n = { ...r }
      delete n[prev.id]
      return n
    })
    setFlipped(false)
    setI(i - 1)
  }
  const restart = (subset) => {
    const base = subset ?? cards
    setOrder(shuffled ? shuffle(base) : base)
    setResults({})
    setI(0)
    setFlipped(false)
  }
  const toggleShuffle = (v) => {
    setShuffled(v)
    const rest = order.slice(i)
    const head = order.slice(0, i)
    setOrder([...head, ...(v ? shuffle(rest) : cards.filter((c) => rest.includes(c)))])
  }

  useKey(
    (e) => {
      if (done) return
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault()
        setFlipped((f) => !f)
      } else if (e.key === 'ArrowRight') track ? grade('known') : go(1)
      else if (e.key === 'ArrowLeft') track ? grade('learning') : go(-1)
      else if (e.key === 'z' && track) undo()
    },
    [i, done, track, order],
  )

  // Horizontal swipe on touch devices: right = know, left = still learning.
  const touch = useRef(null)
  const onTouchStart = (e) => {
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  const onTouchEnd = (e) => {
    if (!touch.current) return
    const dx = e.changedTouches[0].clientX - touch.current.x
    const dy = e.changedTouches[0].clientY - touch.current.y
    touch.current = null
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (track) grade(dx > 0 ? 'known' : 'learning')
      else go(dx > 0 ? -1 : 1)
    }
  }

  const stillLearning = order.filter((c) => results[c.id] === 'learning')

  return (
    <div className="mode-page">
      <ModeHeader
        set={set}
        mode="flashcards"
        center={
          <span className="mode-count">
            {Math.min(i + 1, order.length)} / {order.length}
          </span>
        }
      >
        <button className={`icon-btn ${showOptions ? 'on' : ''}`} onClick={() => setShowOptions((s) => !s)} aria-label="Options" title="Options">
          <Icon.Settings />
        </button>
      </ModeHeader>
      <div className="progress-line">
        <span style={{ width: `${(Math.min(i, order.length) / order.length) * 100}%` }} />
      </div>

      <div className="mode-body">
        <ScopeNote set={set} scope={scope} count={cards.length} />
        {showOptions && (
          <div className="options-panel">
            <Toggle checked={track} onChange={setTrack} label="Track progress (sort into Know / Still learning)" />
            <Toggle checked={shuffled} onChange={toggleShuffle} label="Shuffle" />
            <Toggle checked={answerFirst} onChange={setAnswerFirst} label="Show answer side first" />
          </div>
        )}

        {done ? (
          <div className="summary">
            <div className="summary-head">
              <Donut value={knowCount} total={order.length} />
              <div>
                <h2>{learnCount ? 'Nice progress! Keep going.' : 'Way to go! You know every card.'}</h2>
                <p className="muted">
                  <span className="tone-known">{knowCount} know</span> · <span className="tone-learning">{learnCount} still learning</span>
                </p>
              </div>
            </div>
            <div className="summary-actions">
              {stillLearning.length > 0 && (
                <button className="btn btn-primary btn-lg" onClick={() => restart(stillLearning)}>
                  Keep reviewing {stillLearning.length} {stillLearning.length === 1 ? 'card' : 'cards'}
                </button>
              )}
              <button className="btn btn-ghost btn-lg" onClick={() => restart()}>
                Restart flashcards
              </button>
              <a className="btn btn-ghost btn-lg" href={`#/set/${set.id}/learn`}>
                <Icon.Learn /> Try Learn mode
              </a>
            </div>
          </div>
        ) : (
          <>
            {track && (
              <div className="track-counts">
                <span className="count-pill learning" title="Still learning">
                  {learnCount} <span>Still learning</span>
                </span>
                <span className="count-pill known" title="Know">
                  <span>Know</span> {knowCount}
                </span>
              </div>
            )}
            <div className={`fc-stage ${exit ? `exit-${exit}` : ''}`} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
              <FlipCard card={card} flipped={flipped} onFlip={() => setFlipped((f) => !f)} answerFirst={answerFirst} className="flip-big" />
            </div>
            <div className="deck-controls">
              {track ? (
                <>
                  <button className="link-btn" onClick={undo} disabled={i === 0} title="Undo (Z)">
                    <Icon.Reset width={18} height={18} /> Undo
                  </button>
                  <div className="deck-nav">
                    <button className="circle-btn tone-learning-btn" onClick={() => grade('learning')} aria-label="Still learning" title="Still learning (←)">
                      <Icon.Close />
                    </button>
                    <span className="deck-count">Flip, then sort</span>
                    <button className="circle-btn tone-known-btn" onClick={() => grade('known')} aria-label="Know" title="Know (→)">
                      <Icon.Check />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <span />
                  <div className="deck-nav">
                    <button className="circle-btn" onClick={() => go(-1)} disabled={i === 0} aria-label="Previous">
                      <Icon.ArrowLeft />
                    </button>
                    <span className="deck-count">
                      {i + 1} / {order.length}
                    </span>
                    <button className="circle-btn" onClick={() => go(1)} disabled={i >= order.length - 1} aria-label="Next">
                      <Icon.ArrowRight />
                    </button>
                  </div>
                </>
              )}
              <button className={`link-btn ${shuffled ? 'on' : ''}`} onClick={() => toggleShuffle(!shuffled)} aria-pressed={shuffled} title="Shuffle">
                <Icon.Shuffle width={18} height={18} /> Shuffle
              </button>
            </div>
            <p className="kbd-hint center muted small">{track ? 'Space flips · → know · ← still learning · Z undo' : 'Space flips · ← → move'}</p>
          </>
        )}
      </div>
    </div>
  )
}
