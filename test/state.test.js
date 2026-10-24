import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Body } from '../src/physicsplain.js'
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

test('bodies without id collide', { todo: 'issue #12' }, () => {
  const state = new TestState([
    new Body().setOrigin(0, 0).finalize(),
    new Body().setOrigin(0.05, 0.05).finalize()
  ])
  assert.equal(state.collide(0.01).length, 1)
})
