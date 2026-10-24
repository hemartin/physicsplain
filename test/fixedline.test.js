import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Body, FixedLine, Vector } from '../src/physicsplain.js'
import { TestState, diamond, diamondRadius } from './helpers.js'

const line = () => new FixedLine(1, new Vector(0, 0), new Vector(1, 0))

test('body falling onto the line bounces back up', () => {
  const body = new Body(2).setOrigin(0.5, 0.1).setVelocity(0, -1).finalize()
  body.lateralFriction = 0
  body.rotationalFriction = 0
  const state = new TestState([body], [line()])
  for (let i = 0; i < 30; i++) {
    state.advanceByTimestep(0.01)
  }
  assert.ok(body.velocity.y > 0.5, `vy ${body.velocity.y}`)
  assert.ok(Math.min(...body.cornerY) > -0.02, `bottom ${Math.min(...body.cornerY)}`)
})

test('body touching the line from above collides', () => {
  const body = new Body(2).setOrigin(0.5, 0.049).finalize()
  const collision = line().collide(body, 0.01, 1)
  assert.notEqual(collision, null)
  assert.equal(collision.collisionPoints.length, 2)
})

test('fast body that passed the line in one step bounces back', () => {
  // moves 0.15 per step: from fully above to fully below the line
  const body = new Body(2).setOrigin(0.5, 0.07).setVelocity(0, -15).finalize()
  body.lateralFriction = 0
  body.rotationalFriction = 0
  const state = new TestState([body], [line()])
  state.advanceByTimestep(0.01)
  assert.ok(Math.max(...body.cornerY) < 0, `top ${Math.max(...body.cornerY)}`)
  state.advanceByTimestep(0.01)
  assert.ok(body.velocity.y > 0, `vy ${body.velocity.y}`)
})

test('body crossing the line collides', () => {
  const body = new Body(2).setOrigin(0.5, 0).finalize()
  const collision = line().collide(body, 0.01, 1)
  assert.notEqual(collision, null)
  assert.equal(collision.collisionPoints.length, 2)
})

test('overlaps reports a body crossing the line', () => {
  const body = new Body(2).setOrigin(0.5, 0).finalize()
  assert.equal(line().overlaps(body), true)
})

test('overlapInfo reports on which side of the line a body is', () => {
  const crossing = new Body(2).setOrigin(0.5, 0).finalize()
  assert.deepEqual(line().overlapInfo(crossing), { leftOf: true, rightOf: true, overlaps: true })
  const above = new Body(2).setOrigin(0.5, 0.5).finalize()
  assert.deepEqual(line().overlapInfo(above), { leftOf: true, rightOf: false, overlaps: false })
})

test('body far below the line does not collide', () => {
  const body = new Body(2).setOrigin(0.5, -5).setVelocity(0, -1).finalize()
  assert.equal(line().collide(body, 0.01, 1), null)
})

test('overlaps is falsy for a body far from the line', () => {
  const body = new Body(2).setOrigin(5, 5).finalize()
  assert.ok(!line().overlaps(body))
})

test('corner just reaching below the line collides', () => {
  assert.notEqual(line().collide(diamond(0.5, diamondRadius - 1e-6), 0.01, 1), null)
  assert.equal(line().collide(diamond(0.5, diamondRadius + 1e-3), 0.01, 1), null)
})
