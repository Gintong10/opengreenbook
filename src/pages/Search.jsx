import { useMemo } from 'react'
import Rich from '../components/Rich.jsx'
import { StatusIcon, TypeTag } from '../components/Bits.jsx'
import { allCards, sectionById } from '../lib/data.js'
import { plain } from '../lib/tokenize.js'
import { useStore } from '../lib/store.js'

const index = allCards.map((c) => ({
  card: c,
  name: `${c.num} ${c.name}`.toLowerCase(),
  body: `${plain(c.prompt)} ${plain(c.explanation)} ${sectionById.get(c.section)?.title ?? ''}`.toLowerCase(),
}))

export default function Search({ q }) {
  const progress = useStore((s) => s.progress)
  const results = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    if (!words.length) return []
    return index
      .map((e) => {
        let s = 0
        for (const w of words) {
          if (e.name.includes(w)) s += 3
          else if (e.body.includes(w)) s += 1
          else return null
        }
        return { card: e.card, s }
      })
      .filter(Boolean)
      .sort((a, b) => b.s - a.s || a.card.order - b.card.order)
  }, [q])

  return (
    <div className="page">
      <p className="eyebrow">Search</p>
      <h1 className="page-title">
        {results.length} {results.length === 1 ? 'result' : 'results'} for “{q}”
      </h1>
      {!results.length && <p className="muted">Try a problem name (“Monty Hall”), a topic (“martingale”) or a number (“4.3.7”).</p>}
      <ol className="search-list">
        {results.map(({ card }) => (
          <li key={card.id}>
            <a className="search-row" href={`#/p/${card.id}`}>
              <div className="sr-top">
                <StatusIcon status={progress[card.id]?.s ?? 'new'} first={progress[card.id]?.first} />
                <span className="pr-num">{card.num}</span>
                <span className="pr-name">{card.name}</span>
                <TypeTag card={card} />
              </div>
              <Rich text={card.prompt} className="sr-prompt" />
            </a>
          </li>
        ))}
      </ol>
    </div>
  )
}
