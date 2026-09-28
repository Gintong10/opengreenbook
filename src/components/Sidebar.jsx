import { useEffect, useRef, useState } from 'react'
import { chapters, chapterByNum } from '../lib/data.js'
import { useStore, tally } from '../lib/store.js'
import { StatusIcon } from './Bits.jsx'
import { go } from '../lib/util.js'

// Chapter → section → problem navigator. The current problem's section starts open.
export default function Sidebar({ card, chapterNum, onNavigate }) {
  const progress = useStore((s) => s.progress)
  const chapter = chapterByNum.get(chapterNum ?? card?.chapter) ?? chapters[0]
  const [open, setOpen] = useState(() => new Set(card ? [card.section] : []))
  const [prevSection, setPrevSection] = useState(card?.section)
  if (card && card.section !== prevSection) {
    setPrevSection(card.section)
    setOpen((o) => new Set(o).add(card.section))
  }
  const currentRef = useRef(null)
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'nearest' })
  }, [card?.id])

  const toggle = (id) =>
    setOpen((o) => {
      const n = new Set(o)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  return (
    <nav className="sidebar" aria-label="Problems">
      <div className="sb-chapter">
        <label className="sb-label" htmlFor="sb-ch">
          Chapter
        </label>
        <select
          id="sb-ch"
          value={chapter.chapter}
          onChange={(e) => {
            go(`/ch/${e.target.value}`)
            onNavigate?.()
          }}
        >
          {chapters.map((c) => (
            <option key={c.chapter} value={c.chapter}>
              {c.chapter}. {c.title}
            </option>
          ))}
        </select>
      </div>
      <ul className="sb-sections">
        {chapter.sections.map((s) => {
          const t = tally(s.cards, progress)
          const isOpen = open.has(s.id)
          return (
            <li key={s.id} className={`sb-section ${isOpen ? 'open' : ''}`}>
              <button className="sb-section-btn" onClick={() => toggle(s.id)} aria-expanded={isOpen}>
                <span className="sb-sid">{s.id}</span>
                <span className="sb-stitle">{s.title}</span>
                <span className="sb-count">
                  {t.solved}/{s.cards.length}
                </span>
              </button>
              {isOpen && (
                <ul className="sb-problems">
                  {s.cards.map((c) => {
                    const current = c.id === card?.id
                    return (
                      <li key={c.id}>
                        <a ref={current ? currentRef : null} href={`#/p/${c.id}`} className={`sb-problem ${current ? 'current' : ''}`} aria-current={current ? 'page' : undefined} onClick={() => onNavigate?.()}>
                          <StatusIcon status={progress[c.id]?.s ?? 'new'} first={progress[c.id]?.first} size={16} />
                          <span className="sb-pnum">{c.indexInSection + 1}</span>
                          <span className="sb-pname">{c.name}</span>
                        </a>
                      </li>
                    )
                  })}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
