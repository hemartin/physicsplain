import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Body, FixedBody, Spring } from '../src/physicsplain.js'
import { TestState } from './helpers.js'

// body without drag, so only the spring changes its velocity
const freeBody = (id) => {
  const body = new Body(id)
  body.lateralFriction = 0
  body.rotationalFriction = 0
  return body
}

class SpringState extends TestState {
  constructor (movingBodies, fixedBodies, springs) {
    super(movingBodies, fixedBodies)
    this.springs = springs
  }

  * getSprings () {
    yield * this.springs
  }
}

// body of mass 1 hanging 0.2 below the rest length of a spring to a fixed
// body at the origin; returns the displacement from rest after each step
function hang (stiffness, damping, steps) {
  const anchor = new FixedBody('anchor').finalize()
  const body = freeBody('body').setOrigin(0, -1.2).finalize()
  const spring = new Spring(anchor, body).setRestLength(1).setStiffness(stiffness).setDamping(damping)
  const state = new SpringState([body], [], [spring])
  const displacements = []
  for (let i = 0; i < steps; i++) {
    state.step()
    displacements.push(-body.origin.y - 1)
  }
  return { anchor, body, displacements }
}

test('local points default to the centres of the bodies', () => {
  const spring = new Spring(new Body('a'), new Body('b'))
  assert.deepEqual([spring.localPointA.x, spring.localPointA.y], [0, 0])
  assert.deepEqual([spring.localPointB.x, spring.localPointB.y], [0, 0])
})

test('setters return the spring', () => {
  const spring = new Spring(new Body('a'), new Body('b'))
  for (const setter of ['setLocalPointA', 'setLocalPointB']) {
    assert.equal(spring[setter](0.1, 0.2), spring)
  }
  for (const setter of ['setRestLength', 'setStiffness', 'setDamping']) {
    assert.equal(spring[setter](1), spring)
  }
  assert.deepEqual([spring.localPointA.x, spring.localPointA.y], [0.1, 0.2])
  assert.deepEqual([spring.restLength, spring.stiffness, spring.damping], [1, 1, 1])
})

test('a body on a spring to a fixed body oscillates at sqrt(stiffness / mass)', () => {
  const stiffness = 32
  const { displacements } = hang(stiffness, 0, 1000)

  // upward zero crossings, one per period
  const crossings = []
  for (let i = 1; i < displacements.length; i++) {
    if (displacements[i - 1] < 0 && displacements[i] >= 0) {
      // interpolate between the two steps
      const t = i - 1 + displacements[i - 1] / (displacements[i - 1] - displacements[i])
      crossings.push(t * 0.01)
    }
  }
  assert.ok(crossings.length >= 8, `crossings ${crossings.length}`)
  const period = (crossings.at(-1) - crossings[0]) / (crossings.length - 1)
  const expected = 2 * Math.PI / Math.sqrt(stiffness)
  assert.ok(Math.abs(period / expected - 1) < 0.005, `period ${period}, expected ${expected}`)

  // without damping, the amplitude stays
  const maximum = Math.max(...displacements.slice(-200))
  assert.ok(Math.abs(maximum / 0.2 - 1) < 0.02, `amplitude ${maximum}`)
})

test('the oscillation decays at damping / (2 * mass)', () => {
  const damping = 0.63
  const { displacements } = hang(32, damping, 1000)

  // peaks, where the body turns at the bottom
  const peaks = []
  for (let i = 1; i < displacements.length - 1; i++) {
    if (displacements[i] > displacements[i - 1] && displacements[i] >= displacements[i + 1]) {
      peaks.push([i * 0.01, displacements[i]])
    }
  }
  assert.ok(peaks.length >= 8, `peaks ${peaks.length}`)
  const [t0, d0] = peaks[0]
  const [t1, d1] = peaks.at(-1)
  const rate = Math.log(d0 / d1) / (t1 - t0)
  const expected = damping / 2
  assert.ok(Math.abs(rate / expected - 1) < 0.02, `decay rate ${rate}, expected ${expected}`)
})

test('the spring does not move the fixed body', () => {
  const { anchor } = hang(32, 0.63, 100)
  assert.deepEqual([anchor.origin.x, anchor.origin.y, anchor.angle], [0, 0, 0])
  assert.deepEqual([anchor.velocity.x, anchor.velocity.y, anchor.angularVelocity], [0, 0, 0])
})

test('the velocity of a fixed body enters the damping', () => {
  const anchor = new FixedBody('anchor').setVelocity(0, 1).finalize()
  const body = freeBody('body').setOrigin(0, -1).finalize()
  const spring = new Spring(anchor, body).setRestLength(1).setDamping(2)
  new SpringState([body], [], [spring]).step()
  // the anchor moves away from the body, the damping pulls the body after it
  assert.ok(body.velocity.y > 0, `vy ${body.velocity.y}`)
  assert.deepEqual([anchor.velocity.x, anchor.velocity.y], [0, 1])
})

test('a spring with zero stiffness and damping changes nothing', () => {
  const run = (withSpring) => {
    const a = new Body('a').setOrigin(0, 0).setVelocity(1, 0.5).setAngularVelocity(2).finalize()
    const b = new Body('b').setOrigin(0.5, 0.3).setVelocity(-1, 0).setAngularVelocity(-1).finalize()
    const springs = withSpring ? [new Spring(a, b).setLocalPointA(0.05, 0).setRestLength(0.2)] : []
    const state = new SpringState([a, b], [], springs)
    for (let i = 0; i < 100; i++) {
      state.step()
    }
    return [a, b].flatMap(body => [body.origin.x, body.origin.y, body.angle,
      body.velocity.x, body.velocity.y, body.angularVelocity])
  }
  assert.deepEqual(run(true), run(false))
})

test('two bodies feel equal and opposite forces', () => {
  const a = freeBody('a').setOrigin(0, 0).setMass(1).finalize()
  const b = freeBody('b').setOrigin(1, 0.5).setMass(3).setVelocity(0.2, 0).finalize()
  const spring = new Spring(a, b).setRestLength(0.5).setStiffness(20).setDamping(0.5)
  const state = new SpringState([a, b], [], [spring])
  for (let i = 0; i < 50; i++) {
    state.step()
    // momentum stays 3 * 0.2 along x, 0 along y
    const px = a.mass * a.velocity.x + b.mass * b.velocity.x
    const py = a.mass * a.velocity.y + b.mass * b.velocity.y
    assert.ok(Math.abs(px - 0.6) < 1e-12, `px ${px}`)
    assert.ok(Math.abs(py) < 1e-12, `py ${py}`)
  }
  // stretched spring pulls the bodies together
  assert.ok(a.velocity.x > 0 && b.velocity.x < 0.2, `vx ${a.velocity.x}, ${b.velocity.x}`)
})

test('a spring at an off-centre local point turns the body', () => {
  const anchor = new FixedBody('anchor').setOrigin(0.05, 1).finalize()
  const body = freeBody('body').finalize()
  const spring = new Spring(body, anchor).setLocalPointA(0.05, 0).setRestLength(0.5).setStiffness(10)
  new SpringState([body], [], [spring]).step()
  // pulled up at its right edge, the body turns counterclockwise
  assert.ok(body.angularVelocity > 0, `angularVelocity ${body.angularVelocity}`)
  assert.ok(body.velocity.y > 0, `vy ${body.velocity.y}`)
})

test('local points turn with the body', () => {
  const a = new Body('a').setAngle(Math.PI / 2).finalize()
  const b = new Body('b').setOrigin(0, 1).finalize()
  const spring = new Spring(a, b).setLocalPointA(0.5, 0)
  // turned by 90 degrees, the end of a sits at (0, 0.5), half way to b
  const { armAX, armAY, forceX } = spring.force()
  assert.ok(Math.abs(armAX) < 1e-15 && armAY === 0.5, `arm ${armAX}, ${armAY}`)
  assert.ok(forceX === 0, `forceX ${forceX}`)
})

test('a spring whose two ends coincide exerts no force', () => {
  const a = new Body('a').finalize()
  const b = new Body('b').finalize()
  const spring = new Spring(a, b).setRestLength(1).setStiffness(10)
  assert.equal(spring.force(), null)
  const state = new SpringState([a, b], [], [spring])
  // the overlapping bodies would push each other apart
  state.collideBodies = () => false
  state.step()
  assert.deepEqual([a.velocity.x, a.velocity.y, b.velocity.x, b.velocity.y], [0, 0, 0, 0])
})
