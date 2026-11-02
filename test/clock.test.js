import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Body, Clock, FixedBody } from '../src/physicsplain.js'
import { TestState } from './helpers.js'

test('tick runs the steps due and keeps the remainder', () => {
  const state = new TestState()
  const clock = new Clock(state)
  assert.equal(clock.tick(0), 0)
  assert.equal(clock.tick(5), 0)
  assert.equal(clock.alpha, 0.5)
  assert.equal(clock.tick(30), 3) // 35 ms due
  assert.equal(clock.alpha, 0.5)
  assert.equal(clock.tick(5), 1) // exactly one step due
  assert.equal(clock.alpha, 0)
  assert.equal(state.steps, 4)
})

test('tick runs all steps of a slow frame below the cap', () => {
  const clock = new Clock(new TestState())
  assert.equal(clock.tick(200), 20)
})

test('tick caps elapsed time after a long pause', () => {
  const tabHidden = 10 * 60 * 1000 // 10 minutes
  assert.equal(new Clock(new TestState()).tick(tabHidden), 25)
  assert.equal(new Clock(new TestState(), 100).tick(tabHidden), 10)
})

test('tick ignores negative and missing elapsed time', () => {
  const clock = new Clock(new TestState())
  assert.equal(clock.tick(-5), 0)
  assert.equal(clock.tick(NaN), 0)
  assert.equal(clock.tick(undefined), 0)
  assert.equal(clock.tick(10), 1)
})

test('tick follows the timestep of the state', () => {
  const state = new TestState()
  state.timestep = 0.005
  assert.equal(new Clock(state).tick(20), 4)
})

test('interpolated bodies move smoothly at 60 Hz and 144 Hz', () => {
  for (const hz of [60, 144]) {
    const body = new Body(1).setVelocity(1, 0).finalize()
    body.lateralFriction = 0
    const clock = new Clock(new TestState([body]))
    const drawn = []
    for (let frame = 0; frame < 100; frame++) {
      clock.tick(frame === 0 ? 0 : 1000 / hz)
      drawn.push(body.interpolatedOrigin(clock.alpha).x)
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

test('a clock at any frame rate runs the same steps as a replay loop', () => {
  // pile of boxes, one gets a target at step 50 as a recorded input
  const scene = () => {
    const boxes = []
    for (let i = 0; i < 12; i++) {
      boxes.push(new Body(i + 1)
        .setOrigin((i % 4) * 0.11 - 0.17 + 0.003 * i, 0.06 + 0.11 * Math.floor(i / 4))
        .setAngle(0.02 * i)
        .setForce(0, -2)
        .finalize())
    }
    const floor = new FixedBody(100).setOrigin(0, -0.5).setDimension(2, 1).finalize()
    const state = new TestState(boxes, [floor])
    state.postStep = function () {
      if (this.steps === 50) {
        boxes[0].setTarget(1, 0.5)
      }
    }
    return { state, boxes }
  }
  const bits = (boxes) => boxes.flatMap(b =>
    [b.origin.x, b.origin.y, b.angle, b.velocity.x, b.velocity.y, b.angularVelocity])

  // irregular frames: none, some and many steps, and a capped pause
  const live = scene()
  const clock = new Clock(live.state)
  for (let i = 0; i < 20; i++) {
    for (const elapsed of [0, 16.7, 5, 0, 33.3, 10 * 60 * 1000, 7, 16.6, 1, 50]) {
      clock.tick(elapsed)
    }
  }
  assert.ok(live.state.steps > 50 && live.boxes[0].hasTarget(), `${live.state.steps} steps`)

  const replay = scene()
  for (let i = 0; i < live.state.steps; i++) {
    replay.state.step()
  }
  assert.deepEqual(bits(replay.boxes), bits(live.boxes))
})
