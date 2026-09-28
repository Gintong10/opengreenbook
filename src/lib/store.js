// Per-viewer trainer state (progress, bookmarks, streaks) kept in localStorage.
import { useSyncExternalStore } from 'react'

const KEY = 'ogb:v2'
const EMPTY = { progress: {}, stars: {}, last: null, streak: 0, bestStreak: 0 }

function load() {
  try {
    return { ...EMPTY, ...JSON.parse(localStorage.getItem(KEY) || '{}') }
  } catch {
    return { ...EMPTY }
  }
}

let state = load()
const listeners = new Set()

function commit(next) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Storage can be unavailable (private mode); the session still works in memory.
  }
  listeners.forEach((l) => l())
}

// Keep tabs in sync: another tab's write replaces this tab's copy instead of being overwritten later.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return
    state = load()
    listeners.forEach((l) => l())
  })
}

function subscribe(l) {
  listeners.add(l)
  return () => listeners.delete(l)
}

// Selectors must return existing references (e.g. s.progress), never fresh objects.
export function useStore(selector) {
  return useSyncExternalStore(subscribe, () => selector(state))
}

// progress[id] = { s: 'solved' | 'tried' | 'revealed', a: wrong attempts, first: solved on first try }
function put(id, entry, extra = {}) {
  commit({ ...state, ...extra, progress: { ...state.progress, [id]: entry } })
}

export function recordWrong(id) {
  const p = state.progress[id]
  if (p?.s === 'solved') return commit({ ...state, streak: 0 })
  put(id, { s: p?.s ?? 'tried', a: (p?.a ?? 0) + 1, first: false }, { streak: 0 })
}

export function recordCorrect(id) {
  const p = state.progress[id]
  if (p?.s === 'solved') return
  const first = !p
  const streak = first ? state.streak + 1 : 0
  put(id, { s: 'solved', a: p?.a ?? 0, first }, { streak, bestStreak: Math.max(state.bestStreak, streak) })
}

export function recordReveal(id) {
  const p = state.progress[id]
  if (p?.s === 'solved') return
  put(id, { s: 'revealed', a: p?.a ?? 0, first: false }, { streak: 0 })
}

export function toggleStar(id) {
  const stars = { ...state.stars }
  if (stars[id]) delete stars[id]
  else stars[id] = true
  commit({ ...state, stars })
}

export function setLast(id) {
  if (state.last !== id) commit({ ...state, last: id })
}

export function resetProgress(ids) {
  const progress = { ...state.progress }
  for (const id of ids) delete progress[id]
  commit({ ...state, progress })
}

export function statusOf(progress, id) {
  return progress[id]?.s ?? 'new'
}

export function tally(cards, progress) {
  const t = { solved: 0, tried: 0, revealed: 0, new: 0, first: 0 }
  for (const c of cards) {
    const p = progress[c.id]
    t[p?.s ?? 'new']++
    if (p?.first) t.first++
  }
  return t
}
