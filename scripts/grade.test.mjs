// Regression tests for the answer grader: node --test scripts/
import test from 'node:test'
import assert from 'node:assert/strict'
import { grade, evaluate } from '../src/lib/grade.js'

const num = (value, extra = {}) => ({ check: { type: 'number', value, ...extra } })
const text = (...accept) => ({ check: { type: 'text', accept } })
const is = (card, input, status) => assert.equal(grade(card, input).status, status, `${JSON.stringify(input)} should be ${status}`)

test('evaluates fractions, percents and expressions', () => {
  assert.equal(evaluate('5/11'), 5 / 11)
  assert.equal(evaluate('45%'), 0.45)
  assert.equal(evaluate('C(52,5)'), 2598960)
  assert.equal(evaluate('2,598,960'), 2598960)
  assert.equal(evaluate('10!/(4!6!)'), 210)
  assert.equal(evaluate('3²'), 9)
  assert.equal(evaluate('98 coins'), 98)
  assert.ok(Math.abs(evaluate('sqrt(2/pi)') - 0.7978845608) < 1e-9)
})

test('exact and rounded numeric answers', () => {
  const c = num(5 / 11)
  for (const s of ['5/11', '10/22', '0.4545', '0.45', '0.455', '45.45%']) is(c, s, 'correct')
  for (const s of ['0.5', '0.4546', '1/2']) is(c, s, 'wrong')
  is(c, 'hello', 'invalid')
})

test('near-miss expressions and 1-digit roundings are rejected', () => {
  const ants = num(500 / 501)
  for (const s of ['500/501', '0.998', '1.00']) is(ants, s, 'correct')
  for (const s of ['1', '499/500']) is(ants, s, 'wrong')
  is(num(0.0797), '0.08', 'wrong')
  is(num(0.0797), '0.080', 'correct')
})

test('bare percentages only for probability answers', () => {
  const p = num(0.5, { percent: true })
  for (const s of ['50', '50%', '0.5', '1/2']) is(p, s, 'correct')
  is(p, '5', 'wrong')
  is(num(1 / 3, { percent: true }), '33.3', 'correct')
  is(num(1 / 3, { percent: true }), '33', 'correct') // same rule as 0.33: two significant figures, rounded right
  is(num(1 / 3, { percent: true }), '30', 'wrong')
  is(num(0.5), '50', 'wrong') // e.g. a correlation: 50 is not 0.5
  is(num(0.01, { percent: true }), '1', 'wrong') // "1" is a valid probability, so it is never read as 1%
  is(num(0.01, { percent: true }), '1%', 'correct')
  is(num(0.6667, { percent: true }), '0.6667', 'correct')
})

test('operators are not stripped from text answers', () => {
  const sq = text('n^2', 'O(n^2)', 'n squared', 'n*n', 'quadratic')
  for (const s of ['n^2', 'O(n^2)', 'O(n²)', 'n²', 'n**2', 'Θ(n^2)'.replace('Θ', 'theta'), 'n*n', 'worst case O(n^2)', 'quadratic']) is(sq, s, 'correct')
  for (const s of ['n/2', 'O(n/2)', 'n+2', 'n log n', 'O(n^3)']) is(sq, s, 'wrong')
  const nlogn = text('n log n', 'O(n log n)', 'nlogn')
  is(nlogn, 'O(n log n)', 'correct')
  is(nlogn, 'O(n^2 log n)', 'wrong')
})

test('text answers: filler, negation, dates', () => {
  const up = text('rise', 'increases')
  for (const s of ['rise', 'It will rise', 'I think it increases']) is(up, s, 'correct')
  for (const s of ["it doesn't rise", 'calls rise puts fall', "won't rise"]) is(up, s, 'wrong')
  const sw = text('switch')
  is(sw, "don't switch", 'wrong')
  const bday = text('september 1', 'sep 1', '9/1')
  for (const s of ['September 1', 'sep 1', '9/1']) is(bday, s, 'correct')
  is(bday, '9/2', 'wrong')
  is(text('infinity', 'inf'), '∞', 'correct')
})
