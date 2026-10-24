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

test('corner just past the end of the line collides, body beyond the end does not', () => {
  // line() runs from (0, 0) to (1, 0); bottom right corner 0.001 past the start
  assert.notEqual(line().collide(new Body(2).setOrigin(-0.049, 0.04).finalize(), 0.01, 1), null)
  assert.equal(line().collide(new Body(2).setOrigin(-0.051, 0.04).finalize(), 0.01, 1), null)
  assert.equal(line().collide(new Body(2).setOrigin(1.2, -0.01).finalize(), 0.01, 1), null)
})

test('fast body crossing the line far from its rectangle still collides', () => {
  // origin 0.3 behind the line after moving 0.4 in one step
  const body = new Body(2).setOrigin(0.5, -0.3).setVelocity(0, -40).finalize()
  assert.notEqual(line().collide(body, 0.01, 1), null)
})

test('corner just past either end of a diagonal line collides', () => {
  // line from (0, 0) to (1, 1); box turned along it, 0.04 in front of it
  const diagonal = new FixedLine(1, new Vector(0, 0), new Vector(1, 1))
  const along = new Vector(Math.SQRT1_2, Math.SQRT1_2)
  const normal = diagonal.normal
  const boxAt = (x) => new Body(2)
    .setOrigin(along.x * x + normal.x * 0.04, along.y * x + normal.y * 0.04)
    .setAngle(Math.PI / 4)
    .finalize()
  const length = Math.SQRT2
  // bottom corners are 0.05 from origin along the line, 0.01 behind it
  assert.notEqual(diagonal.collide(boxAt(-0.049), 0.01, 1), null)
  assert.equal(diagonal.collide(boxAt(-0.051), 0.01, 1), null)
  assert.notEqual(diagonal.collide(boxAt(length + 0.049), 0.01, 1), null)
  assert.equal(diagonal.collide(boxAt(length + 0.051), 0.01, 1), null)
})
