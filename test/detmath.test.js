import { test } from 'node:test'
import assert from 'node:assert/strict'
import { atan2, cos, sin } from '../src/physicsplain.js'

// determinism.js hashes the results on a million inputs; these tests check
// special values

const bits = new DataView(new ArrayBuffer(8))
const fromBits = (hi, lo) => {
  bits.setUint32(0, hi)
  bits.setUint32(4, lo)
  return bits.getFloat64(0)
}

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
