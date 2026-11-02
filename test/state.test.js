import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Body, FixedBody } from '../src/physicsplain.js'
import { TestState } from './helpers.js'

test('collide finds two overlapping bodies', () => {
  const state = new TestState([
    new Body(1).setOrigin(0, 0).finalize(),
    new Body(2).setOrigin(0.05, 0.05).finalize()
  ])
  assert.equal(state.collide().length, 1)
})

test('steps and time start at zero and count each step', () => {
  const state = new TestState()
  assert.equal(state.steps, 0)
  assert.equal(state.time, 0)
  for (let i = 0; i < 3; i++) {
    state.step()
  }
  assert.equal(state.steps, 3)
  assert.equal(state.time, 3 * 0.01)
  state.timestep = 0.005
  assert.equal(state.time, 3 * 0.005)
})

test('postStep runs once at the end of each step, after steps was increased', () => {
  const body = new Body(1).setVelocity(1, 0).finalize()
  body.lateralFriction = 0
  const state = new TestState([body])
  const seen = []
  state.postStep = function () {
    seen.push([this.steps, body.origin.x])
  }
  state.step()
  state.step()
  assert.deepEqual(seen, [[1, 0.01], [2, 0.02]])
})

test('bodies without id collide', () => {
  const state = new TestState([
    new Body().setOrigin(0, 0).finalize(),
    new Body().setOrigin(0.05, 0.05).finalize()
  ])
  assert.equal(state.collide().length, 1)
})

test('bodies with duplicate ids collide', () => {
  const state = new TestState([
    new Body(1).setOrigin(0, 0).finalize(),
    new Body(1).setOrigin(0.05, 0.05).finalize()
  ])
  assert.equal(state.collide().length, 1)
})

test('fixed body sharing an id with a moving body does not merge islands', () => {
  // body 1 rests on floor 2 on the left, body 2 rests on floor 3 on the right
  const state = new TestState([
    new Body(1).setOrigin(-0.5, 0.05).finalize(),
    new Body(2).setOrigin(0.5, 0.05).finalize()
  ], [
    new FixedBody(2).setOrigin(-0.5, -0.5).setDimension(0.5, 1).finalize(),
    new FixedBody(3).setOrigin(0.5, -0.5).setDimension(0.5, 1).finalize()
  ])
  assert.equal(state.collide().length, 2)
})

test('collisions merge into islands of connected bodies', () => {
  // a-b and b-c overlap, d-e overlap elsewhere; no ids
  const state = new TestState([
    new Body().setOrigin(0, 0).finalize(),
    new Body().setOrigin(0.09, 0.02).finalize(),
    new Body().setOrigin(0.18, 0.04).finalize(),
    new Body().setOrigin(1, 0).finalize(),
    new Body().setOrigin(1.09, 0.02).finalize()
  ])
  const islands = state.collide().map(c => new Set(c.collisionPoints.flatMap(cp => [cp.collidingEntity, cp.impactedEntity])).size)
  assert.deepEqual(islands.sort((a, b) => a - b), [2, 3])
})

test('collide gets the moving bodies once and asks collideBodies once per pair', () => {
  const state = new TestState(
    [new Body(1).finalize(), new Body(2).setOrigin(1, 0).finalize(), new Body(3).setOrigin(2, 0).finalize()],
    [new FixedBody(4).setOrigin(0, -1).finalize()]
  )
  const getMovingBodies = state.getMovingBodies
  let generators = 0
  state.getMovingBodies = function * () {
    generators++
    yield * getMovingBodies.call(this)
  }
  const pairs = []
  state.collideBodies = (body1, body2) => pairs.push([body1.id, body2.id].sort().join('-'))
  state.collide()
  assert.equal(generators, 1)
  assert.deepEqual(pairs.sort(), ['1-2', '1-3', '1-4', '2-3', '2-4', '3-4'])
})

test('step advances bodies by the timestep of the state', () => {
  for (const timestep of [0.01, 0.005]) {
    const body = new Body(1).setVelocity(1, 0).finalize()
    body.lateralFriction = 0
    const state = new TestState([body])
    state.timestep = timestep
    state.step()
    assert.equal(body.origin.x, timestep)
  }
})
