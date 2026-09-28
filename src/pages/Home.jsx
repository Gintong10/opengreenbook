import { chapters, allCards, getSet } from '../lib/data.js'
import { useStore, statusCounts } from '../lib/store.js'
import { Die, Icon } from '../components/Icons.jsx'

function Progress({ cards, progress }) {
  const { known, learning } = statusCounts(cards, progress)
  const n = cards.length || 1
  return (
    <div className="mini-progress" aria-label={`${known} mastered, ${learning} still learning`}>
      <span className="mp-known" style={{ width: `${(known / n) * 100}%` }} />
      <span className="mp-learning" style={{ width: `${(learning / n) * 100}%` }} />
    </div>
  )
}

export function SetCard({ set, progress }) {
  const { known } = statusCounts(set.cards, progress)
  return (
    <a className="set-card" href={`#/set/${set.id}`}>
      <div className="set-card-top">
        <span className="eyebrow">{set.chapter ? `Chapter ${set.chapter}` : 'All chapters'}</span>
        <h3>{set.title}</h3>
        <div className="pills">
          <span className="pill">{set.cards.length} cards</span>
          <span className="pill pill-ghost">{set.sections.length} sections</span>
        </div>
      </div>
      <div className="set-card-bottom">
        <Progress cards={set.cards} progress={progress} />
        <span className="muted small">{known ? `${known} mastered` : 'Not started'}</span>
      </div>
    </a>
  )
}

export default function Home() {
  const progress = useStore((s) => s.progress)
  const all = getSet('all')
  const { known, learning } = statusCounts(allCards, progress)

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-copy">
          <p className="hero-book">A Practical Guide to Quantitative Finance Interviews</p>
          <h1>Master the Green Book, one card at a time.</h1>
          <p className="hero-sub">
            Flashcards, adaptive learn mode, practice tests and a speed-match game covering every chapter: brain teasers,
            calculus, probability, stochastic calculus, finance and algorithms.
          </p>
          <div className="hero-cta">
            <a className="btn btn-accent btn-lg" href="#/set/all/learn">
              <Icon.Learn /> Start learning
            </a>
            <a className="btn btn-glass btn-lg" href="#/set/all/test">
              <Icon.Test /> Practice test
            </a>
          </div>
          <dl className="hero-stats">
            <div>
              <dt>Cards</dt>
              <dd>{allCards.length}</dd>
            </div>
            <div>
              <dt>Chapters</dt>
              <dd>{chapters.length}</dd>
            </div>
            <div>
              <dt>Mastered</dt>
              <dd>{known}</dd>
            </div>
            <div>
              <dt>Learning</dt>
              <dd>{learning}</dd>
            </div>
          </dl>
        </div>
        <div className="hero-dice" aria-hidden>
          <Die n={2} className="hd hd1" />
          <Die n={6} className="hd hd2" />
          <Die n={1} className="hd hd3" />
          <Die n={5} className="hd hd4" />
          <Die n={4} className="hd hd5" />
        </div>
      </section>

      <section className="home-section">
        <div className="section-head">
          <h2>Study sets</h2>
          <span className="muted">One set per chapter, or everything at once</span>
        </div>
        <div className="set-grid">
          <SetCard set={all} progress={progress} />
          {chapters.map((c) => (
            <SetCard key={c.id} set={c} progress={progress} />
          ))}
        </div>
      </section>
    </div>
  )
}
