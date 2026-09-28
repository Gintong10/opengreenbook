import { Icon } from './Icons.jsx'
import { useStore, toggleStar, tally } from '../lib/store.js'
import { answerType } from '../lib/grade.js'

const STATUS_LABEL = { solved: 'Solved', tried: 'Attempted', revealed: 'Answer revealed', new: 'Not attempted' }

export function StatusIcon({ status, first, size = 18 }) {
  return (
    <span className={`status-icon st-${status} ${first ? 'first' : ''}`} style={{ width: size, height: size }} title={STATUS_LABEL[status]} aria-label={STATUS_LABEL[status]}>
      {status === 'solved' && <Icon.Check width={size * 0.7} height={size * 0.7} strokeWidth={3} />}
      {status === 'revealed' && <Icon.Eye width={size * 0.66} height={size * 0.66} strokeWidth={2.4} />}
    </span>
  )
}

export function StarButton({ id, size = 20 }) {
  const starred = useStore((s) => !!s.stars[id])
  return (
    <button
      className={`star-btn ${starred ? 'on' : ''}`}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggleStar(id)
      }}
      aria-pressed={starred}
      aria-label={starred ? 'Remove bookmark' : 'Bookmark problem'}
      title={starred ? 'Bookmarked' : 'Bookmark'}
    >
      <Icon.Star filled={starred} width={size} height={size} />
    </button>
  )
}

const TYPE_LABEL = { number: 'Numeric', text: 'Short answer', choice: 'Multiple choice' }
export function TypeTag({ card }) {
  const t = answerType(card)
  return <span className={`type-tag tt-${t}`}>{TYPE_LABEL[t]}</span>
}

export function Toggle({ checked, onChange, label }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track" aria-hidden>
        <span className="toggle-thumb" />
      </span>
      {label && <span>{label}</span>}
    </label>
  )
}

// Solved / attempted / revealed proportions as one stacked bar.
export function ProgressBar({ cards, thin }) {
  const progress = useStore((s) => s.progress)
  const t = tally(cards, progress)
  const n = cards.length || 1
  return (
    <div className={`pbar ${thin ? 'thin' : ''}`} role="img" aria-label={`${t.solved} of ${cards.length} solved`}>
      <span className="pb-solved" style={{ width: `${(t.solved / n) * 100}%` }} />
      <span className="pb-tried" style={{ width: `${(t.tried / n) * 100}%` }} />
      <span className="pb-revealed" style={{ width: `${(t.revealed / n) * 100}%` }} />
    </div>
  )
}
