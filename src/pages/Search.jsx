import { useMemo } from 'react'
import Rich from '../components/Rich.jsx'
import { allCards, sectionTitle } from '../lib/data.js'
import { plain } from '../lib/tokenize.js'

const index = allCards.map((c) => ({
  card: c,
  name: c.name.toLowerCase(),
  body: `${plain(c.prompt)} ${plain(c.answer)} ${plain(c.explanation)} ${sectionTitle.get(c.section) ?? ''}`.toLowerCase(),
}))

export default function Search({ q }) {
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
      .sort((a, b) => b.s - a.s)
  }, [q])

  return (
    <div className="set-page">
      <p className="eyebrow">Search</p>
      <h1 className="set-title">
        {results.length} {results.length === 1 ? 'result' : 'results'} for “{q}”
      </h1>
      {!results.length && <p className="muted">Try a problem name (“Monty Hall”), a topic (“martingale”) or a formula (“put-call”).</p>}
      <ul className="term-list">
        {results.map(({ card }) => (
          <li key={card.id} className="term-row">
            <a className="term-main" href={`#/set/ch${card.chapter}?card=${encodeURIComponent(card.id)}`}>
              <div className="term-left">
                <span className="term-name">
                  {card.name}
                  <span className="kind-tag">
                    Ch {card.chapter} · §{card.section}
                  </span>
                </span>
                <Rich text={card.prompt} className="term-prompt" />
              </div>
              <div className="term-right">
                <Rich text={card.answer} className="term-answer" big />
              </div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
