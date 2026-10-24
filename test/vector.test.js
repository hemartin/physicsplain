import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Vector } from '../src/physicsplain.js'

const assertClose = (actual, expected, message) =>
  assert.ok(Math.abs(actual - expected) < 1e-12, message ?? `${actual} != ${expected}`)

test('constructor sets x and y', () => {
  const v = new Vector(1, -2)
  assert.deepEqual([v.x, v.y], [1, -2])
})

test('set copies x and y from another vector and returns this', () => {
  const v = new Vector(0, 0)
  assert.equal(v.set(new Vector(3, 4)), v)
  assert.deepEqual([v.x, v.y], [3, 4])
})

test('add adds another vector and returns this', () => {
  const v = new Vector(1, 2)
  assert.equal(v.add(new Vector(3, -4)), v)
  assert.deepEqual([v.x, v.y], [4, -2])
})

test('subtract subtracts another vector and returns this', () => {
  const v = new Vector(1, 2)
  assert.equal(v.subtract(new Vector(3, -4)), v)
  assert.deepEqual([v.x, v.y], [-2, 6])
})

test('scale multiplies x and y and returns this', () => {
  const v = new Vector(1, -2)
  assert.equal(v.scale(3), v)
  assert.deepEqual([v.x, v.y], [3, -6])
})

test('rotate rotates counterclockwise and returns this', () => {
  const v = new Vector(1, 0)
  assert.equal(v.rotate(Math.PI / 2), v)
  assertClose(v.x, 0)
  assertClose(v.y, 1)
  v.rotate(Math.PI / 2)
  assertClose(v.x, -1)
  assertClose(v.y, 0)
})

test('normalize scales to length 1 and returns this', () => {
  const v = new Vector(3, 4)
  assert.equal(v.normalize(), v)
  assertClose(v.x, 0.6)
  assertClose(v.y, 0.8)

  // zero vector stays zero instead of becoming NaN
  const zero = new Vector(0, 0).normalize()
  assert.deepEqual([zero.x, zero.y], [0, 0])
})

test('length returns the length of this vector', () => {
  assert.equal(new Vector(3, 4).length(), 5)
  assert.equal(new Vector(0, 0).length(), 0)
})

test('distanceFrom returns the distance to another vector', () => {
  assert.equal(new Vector(1, 1).distanceFrom(new Vector(4, 5)), 5)
  assert.equal(new Vector(4, 5).distanceFrom(new Vector(1, 1)), 5)
})

test('clear sets x and y to 0 and returns this', () => {
  const v = new Vector(1, 2)
  assert.equal(v.clear(), v)
  assert.deepEqual([v.x, v.y], [0, 0])
})

test('toString returns "x, y"', () => {
  assert.equal(new Vector(1, -2.5).toString(), '1, -2.5')
})

test('static cross returns the 2D cross product', () => {
  assert.equal(Vector.cross(1, 0, 0, 1), 1)
  assert.equal(Vector.cross(0, 1, 1, 0), -1)
  assert.equal(Vector.cross(2, 3, 4, 6), 0)
})

test('static dot returns the dot product', () => {
  assert.equal(Vector.dot(1, 2, 3, 4), 11)
  assert.equal(Vector.dot(1, 0, 0, 1), 0)
})

test('static length returns the length of (x, y)', () => {
  assert.equal(Vector.length(3, 4), 5)
  assert.equal(Vector.length(-3, -4), 5)
})

test('static angle returns the angle of (x, y) in (-PI, PI]', () => {
  assert.equal(Vector.angle(1, 0), 0)
  assert.equal(Vector.angle(0, 1), Math.PI / 2)
  assert.equal(Vector.angle(-1, 0), Math.PI)
  assert.equal(Vector.angle(0, -1), -Math.PI / 2)
  assertClose(Vector.angle(1, -1), -Math.PI / 4)
})
