import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FixedArc, FixedCircle, FixedLine, Vector } from '../src/physicsplain.js'

const fixedEntities = () => [
  new FixedArc(1, new Vector(0, 0), 0.5, 0.2, 0, Math.PI),
  new FixedCircle(2, new Vector(0, 0), 0.5),
  new FixedLine(3, new Vector(0, 0), new Vector(1, 0))
]

test('fixed arc, circle and line have infinite mass and never move', () => {
  for (const entity of fixedEntities()) {
    const name = entity.constructor.name
    assert.equal(entity.invertedMass(), 0, name)
    assert.equal(entity.invertedInertia(), 0, name)
    entity.addVelocity(new Vector(1, 1))
    entity.addAngularVelocity(1)
    assert.deepEqual([entity.velocity.x, entity.velocity.y], [0, 0], name)
    assert.equal(entity.angularVelocity, 0, name)
  }
})

test('fixed line has its start as origin', () => {
  const start = new Vector(1, 2)
  assert.equal(new FixedLine(1, start, new Vector(3, 2)).origin, start)
})
