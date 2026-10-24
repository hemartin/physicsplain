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

test('box stacked on another box does not sink into it', { todo: 'issue #2' }, () => {
  const lower = new Body(1).setOrigin(0, 0).finalize()
  const upper = new Body(2).setOrigin(0, 0.09).setVelocity(0, -1).finalize()
  collideAndApply(new TestState([lower, upper]))
  assert.ok(upper.velocity.y > -0.5, `upper vy ${upper.velocity.y}`)
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
