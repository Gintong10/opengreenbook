// Answer checking for the trainer. Shared by the UI and scripts/validate.mjs.
//
// card.check shapes:
//   { type: 'number', value: 0.4545..., examples: ['5/11', '0.4545'], unit?: 'coins' }
//   { type: 'text', accept: ['blue'] }
//   (none) -> multiple choice between card.answer and card.distractors

// ---------- Expression evaluator ----------
// Accepts numbers, fractions, percents and simple expressions:
//   5/11   0.4545   45.45%   1 - (5/6)^2   sqrt(2/pi)   e^-1   10!/(4!6!)   C(52,5)   2,598,960

const CONSTS = { pi: Math.PI, e: Math.E }
const FUNCS = {
  sqrt: Math.sqrt,
  ln: Math.log,
  log: Math.log,
  exp: Math.exp,
  abs: Math.abs,
}
const BINOM = new Set(['c', 'choose', 'ncr', 'binom'])

function factorial(n) {
  if (!Number.isInteger(n) || n < 0 || n > 170) throw new Error('bad factorial')
  let r = 1
  for (let i = 2; i <= n; i++) r *= i
  return r
}

function binom(n, k) {
  if (!Number.isInteger(n) || !Number.isInteger(k) || k < 0 || k > n) return 0
  k = Math.min(k, n - k)
  let r = 1
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i
  return Math.round(r)
}

function clean(src) {
  return String(src)
    .toLowerCase()
    .replace(/[−–—]/g, '-')
    .replace(/[×·∙]/g, '*')
    .replace(/÷/g, '/')
    .replace(/π/g, 'pi')
    .replace(/√/g, 'sqrt')
    .replace(/\*\*/g, '^')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/(\d),(?=\d{3}(?!\d))/g, '$1') // thousands separators
    .replace(/\$/g, '')
    .trim()
}

function tokenize(s) {
  const re = /\s*(\d+\.?\d*(?:e[+-]?\d+)?|\.\d+(?:e[+-]?\d+)?|[a-z]+|[-+*/^()!%,])/y
  const out = []
  let m
  re.lastIndex = 0
  while (re.lastIndex < s.length) {
    const start = re.lastIndex
    m = re.exec(s)
    if (!m) {
      if (/^\s*$/.test(s.slice(start))) break
      throw new Error('bad token')
    }
    out.push(m[1])
  }
  return out
}

const isNum = (t) => t != null && /^[\d.]/.test(t)
const isIdent = (t) => t != null && /^[a-z]/.test(t)
const known = (t) => t in CONSTS || t in FUNCS || BINOM.has(t)

export function evaluate(src) {
  let toks = tokenize(clean(src))
  // Drop trailing unit words ("98 coins", "3 weighings").
  while (toks.length && isIdent(toks[toks.length - 1]) && !known(toks[toks.length - 1])) toks.pop()
  if (!toks.length) throw new Error('empty')
  let i = 0
  const peek = () => toks[i]
  const next = () => toks[i++]
  const expect = (t) => {
    if (toks[i] !== t) throw new Error(`expected ${t}`)
    i++
  }
  const startsPrimary = (t) => isNum(t) || isIdent(t) || t === '('

  function expr() {
    let v = term()
    while (peek() === '+' || peek() === '-') v = next() === '+' ? v + term() : v - term()
    return v
  }
  function term() {
    let v = unary()
    for (;;) {
      const t = peek()
      if (t === '*') {
        next()
        v *= unary()
      } else if (t === '/') {
        next()
        v /= unary()
      } else if (startsPrimary(t)) v *= power() // implicit multiplication: 2pi, 3(4), 2sqrt(3)
      else return v
    }
  }
  function unary() {
    if (peek() === '-') {
      next()
      return -unary()
    }
    if (peek() === '+') {
      next()
      return unary()
    }
    return power()
  }
  function power() {
    const base = postfix()
    if (peek() === '^') {
      next()
      return base ** unary()
    }
    return base
  }
  function postfix() {
    let v = primary()
    for (;;) {
      if (peek() === '!') {
        next()
        v = factorial(v)
      } else if (peek() === '%') {
        next()
        v /= 100
      } else return v
    }
  }
  function primary() {
    const t = next()
    if (t == null) throw new Error('unexpected end')
    if (isNum(t)) return parseFloat(t)
    if (t === '(') {
      const v = expr()
      expect(')')
      return v
    }
    if (t in CONSTS) return CONSTS[t]
    if (BINOM.has(t)) {
      expect('(')
      const n = expr()
      expect(',')
      const k = expr()
      expect(')')
      return binom(n, k)
    }
    if (t in FUNCS) {
      if (peek() === '(') {
        next()
        const v = expr()
        expect(')')
        return FUNCS[t](v)
      }
      return FUNCS[t](power())
    }
    throw new Error(`unknown ${t}`)
  }

  const v = expr()
  if (i !== toks.length) throw new Error('trailing input')
  if (!Number.isFinite(v)) throw new Error('not finite')
  return v
}

// A plain decimal like "0.080" or "5.2%" may be rounded; returns the half-unit it was rounded to
// and how many significant digits were typed.
function rounding(src) {
  const m = clean(src).match(/^[-+]?(\d*)\.?(\d*)\s*(%?)$/)
  if (!m || (!m[1] && !m[2])) return null
  const slack = 0.5 * 10 ** -m[2].length
  const sig = (m[1] + m[2]).replace(/^0+/, '').length
  return { slack: m[3] ? slack / 100 : slack, sig }
}

function gradeNumber(input, check) {
  let x
  try {
    x = evaluate(input)
  } catch {
    return { status: 'invalid', message: "Couldn't read that as a number. Try 5/11, 0.4545 or sqrt(2)/2." }
  }
  const v = check.value
  const diff = Math.abs(x - v)
  const scale = Math.max(Math.abs(v), 1e-12)
  if (diff <= 1e-7 * Math.max(1, Math.abs(v))) return { status: 'correct', value: x }
  const r = rounding(input)
  // Rounded decimals count if they have 2+ significant digits, round correctly, and are within 1%.
  if (r && r.sig >= 2 && diff <= r.slack * (1 + 1e-9) && diff / scale <= 0.01) return { status: 'correct', value: x, rounded: true }
  // Expressions must be exact (up to floating point), so 499/500 is not accepted for 500/501.
  if (!r && diff / scale <= 1e-6) return { status: 'correct', value: x }
  return { status: 'wrong', value: x }
}

export function normText(s) {
  return String(s)
    .toLowerCase()
    .replace(/∞/g, ' infinity ')
    .replace(/²/g, ' 2')
    .replace(/³/g, ' 3')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(the|a|an)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Extra words allowed around an accepted answer ("I think it's blue"). Anything else must match exactly.
const FILLER = new Set('i it its it s is are be was will would should you we they think answer say so then just my go goes get gets become becomes stays stay remains remain'.split(' '))

function gradeText(input, check) {
  const got = normText(input)
  if (!got) return { status: 'invalid', message: 'Type an answer first.' }
  const accepts = check.accept.map(normText)
  if (accepts.includes(got)) return { status: 'correct' }
  const NEG = /\b(not|no|never|neither|nor|cannot|dont|doesnt|isnt|shouldnt|wont|cant)\b|\b(don|doesn|isn|shouldn|won|can|aren|wasn|wouldn|didn) t\b/
  if (NEG.test(got) && !accepts.some((a) => NEG.test(a))) return { status: 'wrong' }
  for (const a of accepts) {
    const at = ` ${got} `.indexOf(` ${a} `)
    if (at === -1) continue
    const rest = `${got.slice(0, at)} ${got.slice(at + a.length)}`.split(' ').filter(Boolean)
    if (rest.every((w) => FILLER.has(w))) return { status: 'correct' }
  }
  return { status: 'wrong' }
}

export function answerType(card) {
  return card.check?.type ?? 'choice'
}

export function grade(card, input) {
  const type = answerType(card)
  if (type === 'number') return gradeNumber(input, card.check)
  if (type === 'text') return gradeText(input, card.check)
  return { status: input === card.answer ? 'correct' : 'wrong' }
}

// Live preview of how a typed expression is read, e.g. "= 0.45455".
export function preview(input) {
  const s = clean(input)
  if (!s || /^[-+]?\d*\.?\d+$/.test(s)) return null
  try {
    const v = evaluate(input)
    return Number.isInteger(v) ? String(v) : String(Number(v.toPrecision(6)))
  } catch {
    return null
  }
}
