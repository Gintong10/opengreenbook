import { chapters, allCards, cardById } from '../lib/data.js'
import { useStore, tally } from '../lib/store.js'
import { Die, Icon } from '../components/Icons.jsx'
import { ProgressBar } from '../components/Bits.jsx'
import { goRandom } from '../lib/util.js'

export default function Home() {
  const progress = useStore((s) => s.progress)
  const last = useStore((s) => s.last)
  const bestStreak = useStore((s) => s.bestStreak)
  const t = tally(allCards, progress)
  const attempted = t.solved + t.tried + t.revealed
  const lastCard = last ? cardById.get(last) : null

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-copy">
          <p className="hero-book">A Practical Guide to Quantitative Finance Interviews</p>
          <h1>Train on every Green Book problem.</h1>
          <p className="hero-sub">
            {allCards.length} problems, from brain teasers to stochastic calculus. Type your answer, get instant feedback, and read a worked solution.
          </p>
          <div className="hero-cta">
            <a className="btn btn-accent btn-lg" href="#/practice">
              <Icon.Target /> Start practicing
            </a>
            <button className="btn btn-glass btn-lg" onClick={() => goRandom(progress)}>
              <Die n={3} className="btn-die" /> Random problem
            </button>
          </div>
          <dl className="hero-stats">
            <div>
              <dt>Solved</dt>
              <dd>
                {t.solved}
                <small>/{allCards.length}</small>
              </dd>
            </div>
            <div>
              <dt>First try</dt>
              <dd>{attempted ? `${Math.round((t.first / attempted) * 100)}%` : '–'}</dd>
            </div>
            <div>
              <dt>Best streak</dt>
              <dd>{bestStreak}</dd>
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

      {lastCard && (
        <a className="continue" href={`#/p/${lastCard.id}`}>
          <span className="continue-label">Continue</span>
          <span className="continue-num">{lastCard.num}</span>
          <span className="continue-name">{lastCard.name}</span>
          <Icon.ArrowRight className="continue-arrow" />
        </a>
      )}

      <section className="home-section">
        <div className="section-head">
          <h2>Chapters</h2>
          <span className="muted small">Jump to any section, or open a chapter for the full problem list</span>
        </div>
        <div className="toc-grid">
          {chapters.map((c) => {
            const ct = tally(c.cards, progress)
            return (
              <article key={c.id} className="toc-card">
                <a className="toc-head" href={`#/ch/${c.chapter}`}>
                  <span className="eyebrow">Chapter {c.chapter}</span>
                  <h3>{c.title}</h3>
                  <div className="toc-meta">
                    <ProgressBar cards={c.cards} thin />
                    <span className="muted small">
                      {ct.solved}/{c.cards.length} solved
                    </span>
                  </div>
                </a>
                <ul className="toc-sections">
                  {c.sections.map((s) => {
                    const st = tally(s.cards, progress)
                    return (
                      <li key={s.id}>
                        <a href={`#/ch/${c.chapter}?s=${s.id}`}>
                          <span className="toc-sid">{s.id}</span>
                          <span className="toc-stitle">{s.title}</span>
                          <span className={`toc-count ${st.solved === s.cards.length ? 'done' : ''}`}>
                            {st.solved}/{s.cards.length}
                          </span>
                        </a>
                      </li>
                    )
                  })}
                </ul>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}
