// Per-viewer study state (progress, stars, filters, best times) kept in localStorage.
import { useSyncExternalStore } from 'react'

const KEY = 'ogb:v1'
const EMPTY = { progress: {}, stars: {}, scopes: {}, best: {} }

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

function subscribe(l) {
  listeners.add(l)
  return () => listeners.delete(l)
}

// Selectors must return existing references (e.g. s.progress), never fresh objects.
export function useStore(selector) {
  return useSyncExternalStore(subscribe, () => selector(state))
}

export function setStatus(id, status) {
  commit({ ...state, progress: { ...state.progress, [id]: status } })
}

export function toggleStar(id) {
  const stars = { ...state.stars }
  if (stars[id]) delete stars[id]
  else stars[id] = true
  commit({ ...state, stars })
}

const NO_SCOPE = { sections: [], starred: false }
export function getScope(scopes, setId) {
  return scopes[setId] ?? NO_SCOPE
}

export function setScope(setId, scope) {
  commit({ ...state, scopes: { ...state.scopes, [setId]: scope } })
}

export function recordBest(key, ms) {
  const prev = state.best[key]
  if (prev == null || ms < prev) commit({ ...state, best: { ...state.best, [key]: ms } })
  return prev
}

export function resetProgress(ids) {
  const progress = { ...state.progress }
  for (const id of ids) delete progress[id]
  commit({ ...state, progress })
}

export function statusCounts(cards, progress) {
  let known = 0
  let learning = 0
  for (const c of cards) {
    if (progress[c.id] === 'known') known++
    else if (progress[c.id] === 'learning') learning++
  }
  return { known, learning, fresh: cards.length - known - learning }
}
