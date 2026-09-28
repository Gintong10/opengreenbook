// Validates card JSON files: schema, unique ids, answer lengths and KaTeX.
// Usage: node scripts/validate.mjs [file ...]   (defaults to every src/data/*.json)
import fs from 'node:fs'
import path from 'node:path'
import katex from 'katex'
import { tokenize, plain } from '../src/lib/tokenize.js'
import { grade } from '../src/lib/grade.js'

const dataDir = path.resolve(import.meta.dirname, '../src/data')
const files = process.argv.length > 2
  ? process.argv.slice(2)
  : fs.readdirSync(dataDir).filter((f) => f.endsWith('.json')).map((f) => path.join(dataDir, f))

const errors = []
const warnings = []
const seen = new Map()
let total = 0

function checkMath(src, where) {
  for (const t of tokenize(src)) {
    if (t.type === 'math' || t.type === 'display') {
      try {
        katex.renderToString(t.value, { throwOnError: true, displayMode: t.type === 'display', strict: 'ignore' })
      } catch (e) {
        errors.push(`${where}: KaTeX error in "${t.value}": ${e.message.split('\n')[0]}`)
      }
    } else if (t.type === 'bold') {
      checkMath(t.value, where)
    } else if (t.type === 'text' && t.value.includes('$')) {
      errors.push(`${where}: unbalanced "$" (write money as "USD 5" or "5 dollars")`)
    }
  }
}

for (const file of files) {
  let data
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (e) {
    errors.push(`${file}: invalid JSON: ${e.message}`)
    continue
  }
  const name = path.basename(file)
  if (!Number.isInteger(data.chapter)) errors.push(`${name}: missing integer "chapter"`)
  if (!Array.isArray(data.sections)) errors.push(`${name}: missing "sections" array`)
  if (!Array.isArray(data.cards)) {
    errors.push(`${name}: missing "cards" array`)
    continue
  }
  const sectionIds = new Set((data.sections || []).map((s) => s.id))
  for (const [i, c] of data.cards.entries()) {
    total++
    const where = `${name}#${i} (${c.id || 'no id'})`
    for (const k of ['id', 'section', 'name', 'kind', 'prompt', 'answer', 'explanation']) {
      if (typeof c[k] !== 'string' || !c[k].trim()) errors.push(`${where}: missing string "${k}"`)
    }
    if (seen.has(c.id)) errors.push(`${where}: duplicate id (also in ${seen.get(c.id)})`)
    seen.set(c.id, name)
    if (c.section && !sectionIds.has(c.section)) errors.push(`${where}: section "${c.section}" not in sections list`)
    if (!['problem', 'concept'].includes(c.kind)) errors.push(`${where}: kind must be "problem" or "concept"`)
    if (!Number.isInteger(c.page)) errors.push(`${where}: missing integer "page"`)
    if (!Array.isArray(c.distractors) || c.distractors.length !== 3) {
      errors.push(`${where}: needs exactly 3 distractors`)
    } else {
      const norm = (s) => plain(s).replace(/\s+/g, '').toLowerCase()
      const set = new Set(c.distractors.map(norm))
      if (set.size !== 3 || set.has(norm(c.answer || ''))) errors.push(`${where}: distractors must be distinct from each other and the answer`)
      c.distractors.forEach((d, j) => checkMath(d, `${where}.distractors[${j}]`))
    }
    if (c.name && c.name.length > 48) warnings.push(`${where}: name longer than 48 chars`)
    if (c.answer && plain(c.answer).length > 110) warnings.push(`${where}: answer is ${plain(c.answer).length} chars (aim for <= 110)`)
    for (const k of ['prompt', 'answer', 'explanation', 'hint']) if (typeof c[k] === 'string') checkMath(c[k], `${where}.${k}`)
    if (c.check) {
      const ch = c.check
      if (ch.type === 'number') {
        if (typeof ch.value !== 'number' || !Number.isFinite(ch.value)) errors.push(`${where}: check.value must be a finite number`)
        if (!Array.isArray(ch.examples) || !ch.examples.length) errors.push(`${where}: number check needs "examples" (inputs that must be accepted)`)
        else
          for (const ex of ch.examples) {
            const r = grade(c, ex)
            if (r.status !== 'correct') errors.push(`${where}: example "${ex}" is graded ${r.status} (value ${ch.value})`)
          }
        if (ch.unit != null && (typeof ch.unit !== 'string' || ch.unit.length > 16)) errors.push(`${where}: check.unit must be a short string`)
        if (ch.percent != null && (ch.percent !== true || ch.unit || ch.value < 0 || ch.value > 1))
          errors.push(`${where}: check.percent is only for unitless answers in [0, 1]`)
        for (const d of c.distractors || []) {
          // A distractor that is just a number must not be accepted as correct.
          if (/^\$?[-\d./\\{}frac ]+\$?$/.test(d.trim())) {
            const r = grade(c, plain(d).replace(/\\frac\{(.+?)\}\{(.+?)\}/g, '($1)/($2)'))
            if (r.status === 'correct') errors.push(`${where}: distractor "${d}" would be graded correct`)
          }
        }
      } else if (ch.type === 'text') {
        if (!Array.isArray(ch.accept) || !ch.accept.length || ch.accept.some((a) => typeof a !== 'string' || !a.trim()))
          errors.push(`${where}: text check needs a non-empty "accept" array of strings`)
        else
          for (const d of c.distractors || []) {
            if (grade(c, plain(d)).status === 'correct') errors.push(`${where}: distractor "${d}" would be accepted by the text grader`)
          }
      } else errors.push(`${where}: unknown check.type "${ch.type}"`)
    }
  }
}

for (const w of warnings) console.warn('warn:', w)
for (const e of errors) console.error('ERROR:', e)
const typed = files.flatMap((f) => {
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8')).cards
  } catch {
    return []
  }
})
const byType = { number: 0, text: 0, choice: 0 }
for (const c of typed) byType[c.check?.type ?? 'choice'] = (byType[c.check?.type ?? 'choice'] ?? 0) + 1
console.log(`${files.length} file(s), ${total} card(s) [${byType.number} number, ${byType.text} text, ${byType.choice} choice], ${errors.length} error(s), ${warnings.length} warning(s)`)
process.exit(errors.length ? 1 : 0)
