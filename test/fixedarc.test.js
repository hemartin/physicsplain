import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Body, FixedArc, Vector } from '../src/physicsplain.js'
import { TestState } from './helpers.js'

// body 1.1 units from the arc's origin, in direction angle
const bodyAt = (angle) => new Body(2)
  .setOrigin(1.1 * Math.cos(angle), 1.1 * Math.sin(angle))
  .finalize()

test('body on the arc collides', () => {
  const arc = new FixedArc(1, new Vector(0, 0), 1, 0.2, 0, Math.PI / 2)
  assert.notEqual(arc.collide(bodyAt(0.3), 0.01, 1), null)
})

test('body moving outward bounces back off the arc', () => {
  const arc = new FixedArc(1, new Vector(0, 0), 1, 0.2, 0, Math.PI / 2)
  const body = new Body(2).setOrigin(0.6, 0.6).setVelocity(Math.SQRT1_2, Math.SQRT1_2).finalize()
  body.lateralFriction = 0
  body.rotationalFriction = 0
  const state = new TestState([body], [arc])
  for (let i = 0; i < 30; i++) {
    state.advanceByTimestep(0.01)
  }
  // velocity points back towards the arc's origin
  const radialVelocity = Vector.dot(body.velocity.x, body.velocity.y, body.origin.x, body.origin.y)
  assert.ok(radialVelocity < -0.5, `radial velocity ${radialVelocity}`)
})

test('arc with negative start angle collides below angle 0', () => {
  const arc = new FixedArc(1, new Vector(0, 0), 1, 0.2, -Math.PI / 4, Math.PI / 4)
  assert.notEqual(arc.collide(bodyAt(-0.3), 0.01, 1), null)
})

test('arc crossing angle 0 collides on both sides of 0 only', () => {
  const arc = new FixedArc(1, new Vector(0, 0), 1, 0.2, Math.PI * 1.5, Math.PI / 2)
  assert.notEqual(arc.collide(bodyAt(-0.3), 0.01, 1), null)
  assert.notEqual(arc.collide(bodyAt(0.3), 0.01, 1), null)
  assert.equal(arc.collide(bodyAt(Math.PI), 0.01, 1), null)
})

test('full circle arc collides at any angle', () => {
  const arc = new FixedArc(1, new Vector(0, 0), 1, 0.2, 0, Math.PI * 2)
  assert.notEqual(arc.collide(bodyAt(Math.PI), 0.01, 1), null)
  assert.notEqual(arc.collide(bodyAt(-0.3), 0.01, 1), null)
})

test('split arcs both catch a corner at exactly angle 0', () => {
  // split arcs as in the demo: [0, PI/2] and [3PI/2, 2PI]
  const upper = new FixedArc(1, new Vector(0, 0), 1, 0.2, 0, Math.PI / 2)
  const lower = new FixedArc(2, new Vector(0, 0), 1, 0.2, Math.PI * 1.5, Math.PI * 2)
  // one corner at exactly (1.1, 0), the others outside the respective arc
  const below = new Body(3).setOrigin(1.15, -0.05).finalize()
  const above = new Body(3).setOrigin(1.15, 0.05).finalize()
  assert.equal(upper.collide(below, 0.01, 1).collisionPoints.length, 1)
  assert.equal(lower.collide(above, 0.01, 1).collisionPoints.length, 1)
})

test('arc end angle is inclusive', () => {
  const arc = new FixedArc(1, new Vector(0, 0), 1, 0.2, 0, Math.PI / 2)
  // one corner at exactly (0, 1.1), i.e. angle PI/2, the others outside the arc
  const body = new Body(2).setOrigin(-0.05, 1.15).finalize()
  assert.equal(arc.collide(body, 0.01, 1).collisionPoints.length, 1)
})
