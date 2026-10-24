import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Body, FixedArc, Vector } from '../src/physicsplain.js'

// body 1.1 units from the arc's origin, in direction angle
const bodyAt = (angle) => new Body(2)
  .setOrigin(1.1 * Math.cos(angle), 1.1 * Math.sin(angle))
  .finalize()

test('body on the arc collides', () => {
  const arc = new FixedArc(1, new Vector(0, 0), 1, 0.2, 0, Math.PI / 2)
  assert.notEqual(arc.collide(bodyAt(0.3), 0.01, 1), null)
})

test('arc with negative start angle collides below angle 0', { todo: 'issue #7' }, () => {
  const arc = new FixedArc(1, new Vector(0, 0), 1, 0.2, -Math.PI / 4, Math.PI / 4)
  assert.notEqual(arc.collide(bodyAt(-0.3), 0.01, 1), null)
})
