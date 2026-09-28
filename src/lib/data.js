// Loads every chapter file in src/data and merges split chapters (e.g. ch4a + ch4b).
const modules = import.meta.glob('../data/*.json', { eager: true, import: 'default' })

const sectionOrder = (a, b) => {
  const [a1, a2] = a.id.split('.').map(Number)
  const [b1, b2] = b.id.split('.').map(Number)
  return a1 - b1 || a2 - b2
}

const byChapter = new Map()
for (const key of Object.keys(modules).sort()) {
  const mod = modules[key]
  const ch = byChapter.get(mod.chapter) ?? { chapter: mod.chapter, title: mod.title, sections: [], cards: [] }
  for (const s of mod.sections) if (!ch.sections.some((x) => x.id === s.id)) ch.sections.push(s)
  ch.cards.push(...mod.cards.map((c) => ({ ...c, chapter: mod.chapter })))
  byChapter.set(mod.chapter, ch)
}

export const chapters = [...byChapter.values()]
  .sort((a, b) => a.chapter - b.chapter)
  .map((ch) => {
    const sections = ch.sections.sort(sectionOrder)
    const rank = new Map(sections.map((s, i) => [s.id, i]))
    // Stable sort keeps each agent's in-section order while grouping by section.
    const cards = ch.cards.sort((a, b) => rank.get(a.section) - rank.get(b.section))
    return { ...ch, id: `ch${ch.chapter}`, sections, cards }
  })

export const allCards = chapters.flatMap((c) => c.cards)
export const sectionTitle = new Map(chapters.flatMap((c) => c.sections.map((s) => [s.id, s.title])))

const everything = {
  id: 'all',
  chapter: null,
  title: 'The Complete Green Book',
  sections: chapters.flatMap((c) => c.sections),
  cards: allCards,
}

export function getSet(id) {
  if (id === 'all') return everything
  return chapters.find((c) => c.id === id) ?? null
}

// Cards in a set narrowed by the viewer's section filter and starred-only toggle.
export function scopeCards(set, scope, stars) {
  let cards = set.cards
  if (scope?.sections?.length) cards = cards.filter((c) => scope.sections.includes(c.section))
  if (scope?.starred) cards = cards.filter((c) => stars[c.id])
  return cards
}
