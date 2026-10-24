import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Vector } from '../src/physicsplain.js'

test('add, subtract and scale', () => {
  const v = new Vector(1, 2).add(new Vector(3, 4)).subtract(new Vector(1, 1)).scale(2)
  assert.deepEqual([v.x, v.y], [6, 10])
})

test('rotate by PI/2', () => {
  const v = new Vector(1, 0).rotate(Math.PI / 2)
  assert.ok(Math.abs(v.x) < 1e-12)
  assert.ok(Math.abs(v.y - 1) < 1e-12)
})

test('normalize', () => {
  const v = new Vector(3, 4).normalize()
  assert.ok(Math.abs(v.length() - 1) < 1e-12)
})

test('angle is in [0, 2PI)', () => {
  assert.equal(Vector.angle(1, 0), 0)
  assert.equal(Vector.angle(0, 1), Math.PI / 2)
  assert.equal(Vector.angle(0, -1), 3 * Math.PI / 2)
})

test('cross, dot and distance', () => {
  assert.equal(Vector.cross(1, 0, 0, 1), 1)
  assert.equal(Vector.dot(1, 2, 3, 4), 11)
  assert.equal(new Vector(0, 0).distanceFrom(new Vector(3, 4)), 5)
})
