import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { atan2, cos, sin } from '../src/physicsplain.js'

// seeded random 32-bit integers (mulberry32), integer math only, so the
// inputs are the same in every engine
let seed = 56
const randomInt = () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return (t ^ (t >>> 14)) >>> 0
}
// in [-1, 1)
const randomUnit = () => randomInt() / 2 ** 31 - 1

const bits = new DataView(new ArrayBuffer(8))
const fromBits = (hi, lo) => {
  bits.setUint32(0, hi)
  bits.setUint32(4, lo)
  return bits.getFloat64(0)
}
// any double but NaN, as NaN may have different bits in different engines
const randomDouble = () => {
  let x
  do {
    x = fromBits(randomInt(), randomInt())
  } while (Number.isNaN(x))
  return x
}

// sha256 of the bits of all results, so any change in the last bit fails
const hashOf = (results) => {
  const view = new DataView(new ArrayBuffer(8 * results.length))
  results.forEach((result, i) => view.setFloat64(8 * i, result, true))
  return createHash('sha256').update(view).digest('hex')
}

// the hashes were computed with Node.js 24, where V8's Math.sin, Math.cos
// and Math.atan2 give exactly the same results as detmath for all inputs
test('sin and cos give the same bits as in Node.js 24', () => {
  const inputs = []
  // angles of bodies
  for (let i = 0; i < 600000; i++) {
    inputs.push(randomUnit() * Math.PI)
  }
  // any allowed argument
  for (let i = 0; i < 100000; i++) {
    inputs.push(randomUnit() * 1647099)
  }
  // near multiples of PI/2, hardest to reduce
  for (let i = 0; i < 100000; i++) {
    inputs.push((randomInt() % 1048576) * (Math.PI / 2) * (1 + randomUnit() * 2 ** -50))
  }
  // every magnitude, down to subnormals
  while (inputs.length < 1000000) {
    const x = randomDouble()
    if (Math.abs(x) < 1647100) {
      inputs.push(x)
    }
  }
  assert.equal(hashOf(inputs.map(sin)), '7a717096a3e48cab724bf5fd79e5c2115fe71b84146112462c64f4b5645a6bfe')
  assert.equal(hashOf(inputs.map(cos)), '9aea828a1cd8e0b185f99eb397b025d02de8e9610a4e263062898da9661b15bd')
})

test('atan2 gives the same bits as in Node.js 24', () => {
  const results = []
  // directions, in all quadrants
  for (let i = 0; i < 500000; i++) {
    results.push(atan2(randomUnit(), randomUnit()))
  }
  // every magnitude and ratio, including infinities
  for (let i = 0; i < 500000; i++) {
    results.push(atan2(randomDouble(), randomDouble()))
  }
  assert.equal(hashOf(results), 'e4e9fa4aee7b151a469585b8ea786df787a388a18abe09fa60599acc11385761')
})

test('sin and cos of special values', () => {
  for (const x of [0, -0, Number.MIN_VALUE, -Number.MIN_VALUE, 2 ** -1070, 2 ** -1022, 2 ** -30]) {
    assert.equal(sin(x), x, `sin(${x})`)
    assert.equal(cos(x), 1, `cos(${x})`)
  }
  for (const x of [NaN, Infinity, -Infinity]) {
    assert.equal(sin(x), NaN, `sin(${x})`)
    assert.equal(cos(x), NaN, `cos(${x})`)
  }
  assert.equal(sin(Math.PI / 2), 1)
  assert.equal(cos(Math.PI / 2), 6.123233995736766e-17)
  assert.equal(sin(Math.PI), 1.2246467991473532e-16)
  assert.equal(cos(Math.PI), -1)
  assert.equal(sin(-Math.PI), -1.2246467991473532e-16)
  assert.equal(cos(-Math.PI), -1)
})

test('sin and cos throw for arguments too large to reduce exactly', () => {
  const largest = fromBits(0x413921fb, 0xffffffff) // just below 1647100
  for (const x of [largest, -largest]) {
    assert.ok(Math.abs(sin(x)) <= 1, `sin(${x})`)
    assert.ok(Math.abs(cos(x)) <= 1, `cos(${x})`)
  }
  for (const x of [1647100, -1647100, 1e300, -Number.MAX_VALUE]) {
    assert.throws(() => sin(x), RangeError, `sin(${x})`)
    assert.throws(() => cos(x), RangeError, `cos(${x})`)
  }
})

test('atan2 of special values', () => {
  const tiny = Number.MIN_VALUE
  const cases = [
    // [y, x, atan2(y, x)]
    [0, 0, 0], [-0, 0, -0], [0, -0, Math.PI], [-0, -0, -Math.PI],
    [0, 1, 0], [-0, 1, -0], [0, -1, Math.PI], [-0, -1, -Math.PI],
    [1, 0, Math.PI / 2], [1, -0, Math.PI / 2], [-1, 0, -Math.PI / 2], [-1, -0, -Math.PI / 2],
    [1, 1, Math.PI / 4], [1, -1, 3 * Math.PI / 4], [-1, -1, -3 * Math.PI / 4], [-1, 1, -Math.PI / 4],
    [1, Infinity, 0], [-1, Infinity, -0], [1, -Infinity, Math.PI], [-1, -Infinity, -Math.PI],
    [Infinity, 1, Math.PI / 2], [Infinity, -1, Math.PI / 2], [-Infinity, 1, -Math.PI / 2],
    [Infinity, Infinity, Math.PI / 4], [Infinity, -Infinity, 3 * Math.PI / 4],
    [-Infinity, Infinity, -Math.PI / 4], [-Infinity, -Infinity, -3 * Math.PI / 4],
    [tiny, 1, tiny], [-tiny, 1, -tiny], [tiny, -1, Math.PI], [-tiny, -1, -Math.PI],
    [1, tiny, Math.PI / 2], [1, -tiny, Math.PI / 2], [-1, -tiny, -Math.PI / 2],
    [NaN, 1, NaN], [1, NaN, NaN], [NaN, NaN, NaN]
  ]
  for (const [y, x, expected] of cases) {
    assert.equal(atan2(y, x), expected, `atan2(${y}, ${x})`)
  }
})
