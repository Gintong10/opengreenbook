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
  for (const s of mod.sections) if (!ch.sections.some((x) => x.id === s.id)) ch.sections.push({ ...s })
  ch.cards.push(...mod.cards.map((c) => ({ ...c, chapter: mod.chapter })))
  byChapter.set(mod.chapter, ch)
}

export const chapters = [...byChapter.values()]
  .sort((a, b) => a.chapter - b.chapter)
  .map((ch) => {
    const sections = ch.sections.sort(sectionOrder)
    for (const s of sections) {
      // Stable filter keeps each file's in-section order; problems are numbered like 4.3.7.
      s.cards = ch.cards.filter((c) => c.section === s.id)
      s.cards.forEach((c, i) => {
        c.num = `${s.id}.${i + 1}`
        c.indexInSection = i
      })
    }
    return { ...ch, id: `ch${ch.chapter}`, sections, cards: sections.flatMap((s) => s.cards) }
  })

export const allCards = chapters.flatMap((c) => c.cards)
allCards.forEach((c, i) => (c.order = i))

export const cardById = new Map(allCards.map((c) => [c.id, c]))
export const sectionById = new Map(chapters.flatMap((c) => c.sections.map((s) => [s.id, s])))
export const chapterByNum = new Map(chapters.map((c) => [c.chapter, c]))

export const prevCard = (card) => allCards[card.order - 1] ?? null
export const nextCard = (card) => allCards[card.order + 1] ?? null
