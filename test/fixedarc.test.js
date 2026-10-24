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

test('arc with negative start angle collides below angle 0', { todo: 'issue #7' }, () => {
  const arc = new FixedArc(1, new Vector(0, 0), 1, 0.2, -Math.PI / 4, Math.PI / 4)
  assert.notEqual(arc.collide(bodyAt(-0.3), 0.01, 1), null)
})
