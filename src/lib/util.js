import { useEffect, useState } from 'react'

export function shuffle(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function sample(arr, n) {
  return shuffle(arr).slice(0, n)
}

// Four shuffled options: the card's answer plus its three hand-written distractors.
export function choicesFor(card) {
  return shuffle([
    { text: card.answer, correct: true },
    ...card.distractors.map((text) => ({ text, correct: false })),
  ])
}

function parseHash() {
  const raw = window.location.hash.replace(/^#/, '') || '/'
  const [path, query = ''] = raw.split('?')
  return { parts: path.split('/').filter(Boolean), query: new URLSearchParams(query) }
}

export function useRoute() {
  const [route, setRoute] = useState(parseHash)
  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

export function go(path) {
  window.location.hash = path
}

export function useKey(handler, deps) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      // Space is a study shortcut (flip/continue), so don't let it also click a focused button.
      if (e.key === ' ' && (tag === 'BUTTON' || tag === 'A')) {
        e.preventDefault()
        e.target.blur()
      }
      handler(e)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

// Jump to a random problem, preferring ones not yet solved.
export async function goRandom(progress) {
  const { allCards } = await import('./data.js')
  const open = allCards.filter((c) => progress[c.id]?.s !== 'solved')
  const pool = open.length ? open : allCards
  go(`/p/${pool[Math.floor(Math.random() * pool.length)].id}`)
}
