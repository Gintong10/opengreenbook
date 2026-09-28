import { useEffect, useState } from 'react'
import Solver from '../components/Solver.jsx'
import Sidebar from '../components/Sidebar.jsx'
import { Icon } from '../components/Icons.jsx'
import { chapterByNum, nextCard, prevCard, sectionById } from '../lib/data.js'
import { setLast } from '../lib/store.js'
import { go, useKey } from '../lib/util.js'

export default function Problem({ card }) {
  const section = sectionById.get(card.section)
  const chapter = chapterByNum.get(card.chapter)
  const prev = prevCard(card)
  const next = nextCard(card)
  const [drawer, setDrawer] = useState(false)

  useEffect(() => setLast(card.id), [card.id])
  useKey(
    (e) => {
      if (e.key === 'ArrowLeft' && prev) go(`/p/${prev.id}`)
      else if (e.key === 'ArrowRight' && next) go(`/p/${next.id}`)
      else if (e.key === 'Escape') setDrawer(false)
    },
    [card.id],
  )

  return (
    <div className="trainer">
      <aside className={`trainer-side ${drawer ? 'open' : ''}`}>
        <Sidebar card={card} onNavigate={() => setDrawer(false)} />
      </aside>
      {drawer && <div className="scrim" onClick={() => setDrawer(false)} />}

      <div className="trainer-main">
        <div className="crumbs-row">
          <button className="btn btn-ghost btn-sm drawer-btn" onClick={() => setDrawer(true)}>
            <Icon.List width={18} height={18} /> Problems
          </button>
          <nav className="crumbs" aria-label="Breadcrumb">
            <a href={`#/ch/${chapter.chapter}`}>
              Ch {chapter.chapter} · {chapter.title}
            </a>
            <span aria-hidden>›</span>
            <a href={`#/ch/${chapter.chapter}?s=${section.id}`}>
              {section.id} {section.title}
            </a>
          </nav>
          <div className="pager">
            <span className="muted small">
              {card.indexInSection + 1} of {section.cards.length}
            </span>
            <a className={`circle-btn sm ${prev ? '' : 'disabled'}`} href={prev ? `#/p/${prev.id}` : undefined} aria-label="Previous problem" title="Previous (←)">
              <Icon.ArrowLeft width={18} height={18} />
            </a>
            <a className={`circle-btn sm ${next ? '' : 'disabled'}`} href={next ? `#/p/${next.id}` : undefined} aria-label="Next problem" title="Next (→)">
              <Icon.ArrowRight width={18} height={18} />
            </a>
          </div>
        </div>

        <Solver
          key={card.id}
          card={card}
          onNext={next ? () => go(`/p/${next.id}`) : null}
          nextLabel={next && next.section !== card.section ? `Next: ${next.section} ${sectionById.get(next.section).title}` : 'Next problem'}
        />
      </div>
    </div>
  )
}
