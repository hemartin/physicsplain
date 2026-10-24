import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Body, FixedFloor, Vector } from '../src/physicsplain.js'
import { TestState } from './helpers.js'

const floor = () => new FixedFloor(1, new Vector(0, 0), new Vector(1, 0))

test('body falling onto the floor bounces back up', () => {
  const body = new Body(2).setOrigin(0.5, 0.1).setVelocity(0, -1).finalize()
  body.lateralFriction = 0
  body.rotationalFriction = 0
  const state = new TestState([body], [floor()])
  for (let i = 0; i < 30; i++) {
    state.advanceByTimestep(0.01)
  }
  assert.ok(body.velocity.y > 0.5, `vy ${body.velocity.y}`)
  assert.ok(Math.min(...body.cornerY) > -0.02, `bottom ${Math.min(...body.cornerY)}`)
})

test('body touching the floor from above collides', () => {
  const body = new Body(2).setOrigin(0.5, 0.049).finalize()
  const collision = floor().collide(body, 0.01, 1)
  assert.notEqual(collision, null)
  assert.equal(collision.collisionPoints.length, 2)
})

test('fast body that passed the floor in one step bounces back', () => {
  // moves 0.15 per step: from fully above to fully below the floor
  const body = new Body(2).setOrigin(0.5, 0.07).setVelocity(0, -15).finalize()
  body.lateralFriction = 0
  body.rotationalFriction = 0
  const state = new TestState([body], [floor()])
  state.advanceByTimestep(0.01)
  assert.ok(Math.max(...body.cornerY) < 0, `top ${Math.max(...body.cornerY)}`)
  state.advanceByTimestep(0.01)
  assert.ok(body.velocity.y > 0, `vy ${body.velocity.y}`)
})

test('body crossing the floor collides', () => {
  const body = new Body(2).setOrigin(0.5, 0).finalize()
  const collision = floor().collide(body, 0.01, 1)
  assert.notEqual(collision, null)
  assert.equal(collision.collisionPoints.length, 2)
})

test('overlaps reports a body crossing the floor', () => {
  const body = new Body(2).setOrigin(0.5, 0).finalize()
  assert.equal(floor().overlaps(body), true)
})

test('overlapInfo reports on which side of the floor a body is', () => {
  const crossing = new Body(2).setOrigin(0.5, 0).finalize()
  assert.deepEqual(floor().overlapInfo(crossing), { leftOf: true, rightOf: true, overlaps: true })
  const above = new Body(2).setOrigin(0.5, 0.5).finalize()
  assert.deepEqual(floor().overlapInfo(above), { leftOf: true, rightOf: false, overlaps: false })
})

test('body far below the floor does not collide', () => {
  const body = new Body(2).setOrigin(0.5, -5).setVelocity(0, -1).finalize()
  assert.equal(floor().collide(body, 0.01, 1), null)
})

test('overlaps is falsy for a body far from the floor', () => {
  const body = new Body(2).setOrigin(5, 5).finalize()
  assert.ok(!floor().overlaps(body))
})

test('body coming from behind the floor passes through it', () => {
  // floor() runs from (0, 0) to (1, 0), its front is above
  const body = new Body(2).setOrigin(0.5, -0.3).setVelocity(0, 1).finalize()
  body.lateralFriction = 0
  body.rotationalFriction = 0
  const state = new TestState([body], [floor()])
  for (let i = 0; i < 100; i++) {
    state.advanceByTimestep(0.01)
  }
  assert.ok(Math.abs(body.origin.y - 0.7) < 1e-9, `y ${body.origin.y}`)
  assert.equal(body.velocity.y, 1)
})

test('floor running from right to left is hit from below', () => {
  const reversed = new FixedFloor(1, new Vector(1, 0), new Vector(0, 0))
  assert.deepEqual([reversed.normal.x + 0, reversed.normal.y], [0, -1])
  assert.notEqual(reversed.collide(new Body(2).setOrigin(0.5, -0.04).finalize(), 0.01, 1), null)
  assert.equal(reversed.collide(new Body(2).setOrigin(0.5, 0.04).finalize(), 0.01, 1), null)
})
