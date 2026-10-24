import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Body, FixedBody } from '../src/physicsplain.js'
import { TestState } from './helpers.js'

test('advance runs fixed 10 ms steps and keeps the remainder', () => {
  const state = new TestState()
  let steps = 0
  state.postStep = () => steps++
  state.advance(1000)
  state.advance(1105)
  assert.equal(steps * 10 + state.remainder, 105)
})

test('advance runs all steps of a slow frame below the cap', () => {
  const state = new TestState()
  let steps = 0
  state.postStep = () => steps++
  state.advance(1000)
  state.advance(1200)
  assert.equal(steps * 10 + state.remainder, 200)
})

test('collide finds two overlapping bodies', () => {
  const state = new TestState([
    new Body(1).setOrigin(0, 0).finalize(),
    new Body(2).setOrigin(0.05, 0.05).finalize()
  ])
  assert.equal(state.collide(0.01).length, 1)
})

test('advance caps elapsed time after a long pause', () => {
  const state = new TestState()
  let steps = 0
  state.postStep = () => steps++
  state.advance(1000)
  state.advance(1000 + 10 * 60 * 1000) // tab hidden for 10 minutes
  assert.ok(steps <= 25, `${steps} steps in one frame`)
})

test('postStep receives the timestep in seconds', () => {
  const state = new TestState()
  const timesteps = []
  state.postStep = (timestep) => timesteps.push(timestep)
  state.advance(1000)
  state.advance(1025)
  assert.ok(timesteps.length > 0)
  assert.ok(timesteps.every(t => t === 0.01), `timesteps ${timesteps}`)
})

test('bodies without id collide', () => {
  const state = new TestState([
    new Body().setOrigin(0, 0).finalize(),
    new Body().setOrigin(0.05, 0.05).finalize()
  ])
  assert.equal(state.collide(0.01).length, 1)
})

test('bodies with duplicate ids collide', () => {
  const state = new TestState([
    new Body(1).setOrigin(0, 0).finalize(),
    new Body(1).setOrigin(0.05, 0.05).finalize()
  ])
  assert.equal(state.collide(0.01).length, 1)
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
  assert.equal(state.collide(0.01).length, 2)
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
  const islands = state.collide(0.01).map(c => new Set(c.collisionPoints.flatMap(cp => [cp.collidingEntity, cp.impactedEntity])).size)
  assert.deepEqual(islands.sort((a, b) => a - b), [2, 3])
})

test('postAdvance gets the time since the last step as a fraction of a step', () => {
  const state = new TestState()
  const alphas = []
  state.postAdvance = (now, alpha) => alphas.push(alpha)
  state.advance(1000)
  state.advance(1025) // two steps, 5 ms left
  assert.deepEqual(alphas, [0, 0.5])
})

test('interpolated bodies move smoothly at 60 Hz and 144 Hz', () => {
  for (const hz of [60, 144]) {
    const body = new Body(1).setVelocity(1, 0).finalize()
    body.lateralFriction = 0
    const state = new TestState([body])
    const drawn = []
    state.postAdvance = (now, alpha) => drawn.push(body.interpolatedOrigin(alpha).x)
    for (let frame = 0; frame < 100; frame++) {
      state.advance(1000 + frame * 1000 / hz)
    }
    // without interpolation, frames at 60 Hz move by 1 or 2 steps (0.01 or
    // 0.02); skip the frames until the first step, there is nothing to
    // interpolate from before it
    for (let i = 4; i < drawn.length; i++) {
      const move = drawn[i] - drawn[i - 1]
      assert.ok(Math.abs(move - 1 / hz) < 1e-9, `${hz} Hz, frame ${i}: moved ${move}`)
    }
  }
})
