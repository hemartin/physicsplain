import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Body, FixedBody } from '../src/physicsplain.js'
import { TestState, collideAndApply } from './helpers.js'

// floor with its top edge at y = 0
const floor = () => new FixedBody(100).setOrigin(0, -0.5).setDimension(2, 1).finalize()

test('narrow box bounces off the floor elastically', { todo: 'issue #1' }, () => {
  const box = new Body(1).setOrigin(0, 0.199).setDimension(0.02, 0.4).setVelocity(0, -1).finalize()
  collideAndApply(new TestState([box], [floor()]))
  assert.ok(Math.abs(box.velocity.y - 1) < 0.1, `vy ${box.velocity.y}`)
})

test('box stacked on another box does not sink into it', () => {
  const lower = new Body(1).setOrigin(0, 0).finalize()
  const upper = new Body(2).setOrigin(0, 0.09).setVelocity(0, -1).finalize()
  collideAndApply(new TestState([lower, upper]))
  assert.ok(upper.velocity.y > -0.5, `upper vy ${upper.velocity.y}`)
})

test('aligned boxes get the normal of the face they touch, from every side', () => {
  for (const [dx, dy] of [[0, 1], [-1, 0], [0, -1], [1, 0]]) {
    const impacted = new Body(1).finalize()
    const colliding = new Body(2).setOrigin(0.09 * dx, 0.09 * dy).setVelocity(-dx, -dy).finalize()
    const collisions = collideAndApply(new TestState([impacted, colliding]))
    const points = collisions.flatMap(c => c.collisionPoints)
    assert.equal(points.length, 2, `side (${dx}, ${dy})`)
    for (const p of points) {
      assert.ok(Math.abs(p.normalX - dx) < 1e-9 && Math.abs(p.normalY - dy) < 1e-9,
        `side (${dx}, ${dy}): normal (${p.normalX}, ${p.normalY})`)
      assert.ok(Math.abs(p.separation - 0.01) < 1e-9, `side (${dx}, ${dy}): separation ${p.separation}`)
    }
    const v = colliding.velocity.x * dx + colliding.velocity.y * dy
    assert.ok(v > -0.5, `side (${dx}, ${dy}): velocity towards impacted box ${v}`)
  }
})

test('rotated box hitting the floor gets the floor normal', () => {
  for (const angle of [0, 0.3, -0.3, 0.7]) {
    const box = new Body(1).setAngle(angle).finalize()
    // lowest corner 0.005 below the floor's top edge
    box.setOrigin(0.3, -Math.min(...box.cornerY) - 0.005).setVelocity(0, -1).finalize()
    const collisions = collideAndApply(new TestState([box], [floor()]))
    const points = collisions.flatMap(c => c.collisionPoints)
    assert.ok(points.length > 0, `angle ${angle}`)
    for (const p of points) {
      assert.ok(Math.abs(p.normalX) < 1e-9 && Math.abs(p.normalY - 1) < 1e-9,
        `angle ${angle}: normal (${p.normalX}, ${p.normalY})`)
    }
    assert.ok(box.velocity.y > 0, `angle ${angle}: vy ${box.velocity.y}`)
  }
})

test('stacked boxes under gravity do not keep sinking', { todo: 'issue #3' }, () => {
  const lower = new Body(1).setOrigin(0, 0.05).setDimension(0.14, 0.1).setForce(0, -2).finalize()
  const upper = new Body(2).setOrigin(0, 0.15).setDimension(0.1, 0.1).setForce(0, -2).finalize()
  const state = new TestState([lower, upper], [floor()])
  state.restitution = 0
  for (let i = 0; i < 1000; i++) {
    state.advanceByTimestep(0.01)
  }
  const floorPenetration = -Math.min(...lower.cornerY)
  const stackPenetration = Math.max(...lower.cornerY) - Math.min(...upper.cornerY)
  assert.ok(floorPenetration < 0.002, `floor penetration ${floorPenetration}`)
  assert.ok(stackPenetration < 0.002, `stack penetration ${stackPenetration}`)
})
