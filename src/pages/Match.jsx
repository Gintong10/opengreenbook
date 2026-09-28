import { useEffect, useRef, useState } from 'react'
import Rich from '../components/Rich.jsx'
import { Icon } from '../components/Icons.jsx'
import { ModeHeader, ScopeNote, useScopedCards } from '../components/Study.jsx'
import { recordBest, useStore } from '../lib/store.js'
import { shuffle, formatTime } from '../lib/util.js'
import { plain } from '../lib/tokenize.js'

const PAIRS = 6
const PENALTY = 1000

function deal(cards) {
  // Skip cards whose name or answer would be ambiguous with one already dealt.
  const seen = new Set()
  const picked = []
  for (const c of shuffle(cards)) {
    const keys = [`n:${c.name.toLowerCase()}`, `a:${plain(c.answer).replace(/\s+/g, '').toLowerCase()}`]
    if (keys.some((k) => seen.has(k))) continue
    keys.forEach((k) => seen.add(k))
    picked.push(c)
    if (picked.length === PAIRS) break
  }
  return shuffle(picked.flatMap((c) => [
    { key: `${c.id}:n`, id: c.id, side: 'name', text: c.name },
    { key: `${c.id}:a`, id: c.id, side: 'answer', text: c.answer },
  ]))
}

export default function Match({ set }) {
  const { cards, scope } = useScopedCards(set)
  const best = useStore((s) => s.best[`match:${set.id}`])
  const [phase, setPhase] = useState('ready') // ready | playing | done
  const [tiles, setTiles] = useState([])
  const [sel, setSel] = useState(null)
  const [gone, setGone] = useState({})
  const [flash, setFlash] = useState({}) // key -> 'right' | 'wrong'
  const [penalty, setPenalty] = useState(0)
  const [now, setNow] = useState(0)
  const [final, setFinal] = useState(null)
  const startRef = useRef(0)
  const goneRef = useRef({})
  const penaltyRef = useRef(0)

  useEffect(() => {
    if (phase !== 'playing') return
    const t = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(t)
  }, [phase])

  const start = () => {
    setTiles(deal(cards))
    goneRef.current = {}
    penaltyRef.current = 0
    setGone({})
    setFlash({})
    setSel(null)
    setPenalty(0)
    startRef.current = Date.now()
    setNow(Date.now())
    setFinal(null)
    setPhase('playing')
  }

  const click = (tile) => {
    if (gone[tile.key] || flash[tile.key]) return
    if (!sel) return setSel(tile)
    if (sel.key === tile.key) return setSel(null)
    const a = sel
    setSel(null)
    if (a.id === tile.id && a.side !== tile.side) {
      setFlash((f) => ({ ...f, [a.key]: 'right', [tile.key]: 'right' }))
      setTimeout(() => {
        goneRef.current = { ...goneRef.current, [a.key]: true, [tile.key]: true }
        setGone(goneRef.current)
        if (Object.keys(goneRef.current).length === tiles.length) {
          const ms = Date.now() - startRef.current + penaltyRef.current
          setFinal({ ms, prev: recordBest(`match:${set.id}`, ms) })
          setPhase('done')
        }
      }, 260)
    } else {
      setFlash((f) => ({ ...f, [a.key]: 'wrong', [tile.key]: 'wrong' }))
      penaltyRef.current += PENALTY
      setPenalty(penaltyRef.current)
      setTimeout(
        () =>
          setFlash((f) => {
            const n = { ...f }
            delete n[a.key]
            delete n[tile.key]
            return n
          }),
        450,
      )
    }
  }

  const elapsed = phase === 'playing' ? now - startRef.current + penalty : final?.ms ?? 0
  const newBest = final && (final.prev == null || final.ms < final.prev)

  return (
    <div className="mode-page">
      <ModeHeader
        set={set}
        mode="match"
        center={
          phase !== 'ready' && (
            <span className="mode-count timer">
              <Icon.Timer width={18} height={18} /> {formatTime(elapsed)}
              {penalty > 0 && <span className="penalty">+{penalty / 1000}s</span>}
            </span>
          )
        }
      />
      <div className="mode-body">
        <ScopeNote set={set} scope={scope} count={cards.length} />
        {phase === 'ready' && (
          <div className="summary match-ready">
            <Icon.Match className="big-ico" />
            <h2>Ready to play?</h2>
            <p className="muted">Match each problem to its answer as fast as you can. Wrong matches add a one-second penalty.</p>
            {best != null && <p className="best">Your best: {formatTime(best)}</p>}
            <button className="btn btn-primary btn-lg" onClick={start}>
              Start game
            </button>
          </div>
        )}
        {phase === 'playing' && (
          <div className="match-grid">
            {tiles.map((t) => (
              <button
                key={t.key}
                className={`tile ${t.side} ${sel?.key === t.key ? 'selected' : ''} ${flash[t.key] ?? ''} ${gone[t.key] ? 'gone' : ''}`}
                onClick={() => click(t)}
                disabled={!!gone[t.key]}
              >
                {t.side === 'name' ? <span className="tile-name">{t.text}</span> : <Rich inline big text={t.text} />}
              </button>
            ))}
          </div>
        )}
        {phase === 'done' && (
          <div className="summary match-ready">
            <div className="trophy" aria-hidden>
              {newBest ? '🏆' : '⏱️'}
            </div>
            <h2>{newBest ? 'New personal best!' : 'Nice work!'}</h2>
            <p className="big-time">{formatTime(final.ms)}</p>
            {final.prev != null && <p className="muted">Previous best: {formatTime(final.prev)}</p>}
            {penalty > 0 && <p className="muted small">Includes {penalty / 1000}s of penalties</p>}
            <div className="summary-actions center">
              <button className="btn btn-primary btn-lg" onClick={start}>
                Play again
              </button>
              <a className="btn btn-ghost btn-lg" href={`#/set/${set.id}/learn`}>
                <Icon.Learn /> Learn mode
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
