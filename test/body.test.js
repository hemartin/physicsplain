import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Body, FixedBody } from '../src/physicsplain.js'

test('finalize computes corners of axis-aligned body', () => {
  const body = new Body(1).setOrigin(1, 2).setDimension(0.4, 0.2).finalize()
  assert.deepEqual(body.cornerX.map(x => +x.toFixed(9)), [1.2, 0.8, 0.8, 1.2])
  assert.deepEqual(body.cornerY.map(y => +y.toFixed(9)), [2.1, 2.1, 1.9, 1.9])
})

test('advance moves body by velocity', () => {
  const body = new Body(1).setVelocity(1, -2).finalize()
  body.advance(0.5)
  assert.deepEqual([body.origin.x, body.origin.y], [0.5, -1])
})

test('fixed body has infinite mass', () => {
  const body = new FixedBody(1).finalize()
  assert.equal(body.invertedMass(), 0)
  assert.equal(body.invertedInertia(), 0)
})

test('body accelerates towards its target and ignores force', () => {
  const body = new Body(1).setForce(0, 5).finalize()
  assert.equal(body.setTarget(1, 0), body)
  assert.equal(body.hasTarget(), true)
  for (let i = 0; i < 10; i++) {
    body.applyForces(0.01)
    body.advance(0.01)
  }
  assert.ok(body.velocity.x > 0, `vx ${body.velocity.x}`)
  assert.equal(body.velocity.y, 0)
})

test('body stops accelerating after unsetTarget', () => {
  const body = new Body(1).setTarget(1, 0).finalize()
  body.applyForces(0.01)
  body.unsetTarget()
  assert.equal(body.hasTarget(), false)
  const vx = body.velocity.x
  body.applyForces(0.01)
  assert.ok(body.velocity.x < vx, `vx ${body.velocity.x} not below ${vx}`)
})

test('body turns towards its target angle', () => {
  const body = new Body(1).finalize()
  assert.equal(body.setTargetAngle(1), body)
  assert.equal(body.hasTargetAngle(), true)
  body.applyForces(0.01)
  assert.ok(body.angularVelocity > 0, `angularVelocity ${body.angularVelocity}`)
})

test('body stops turning after unsetTargetAngle', () => {
  const body = new Body(1).setTargetAngle(1).finalize()
  body.unsetTargetAngle()
  assert.equal(body.hasTargetAngle(), false)
  body.applyForces(0.01)
  assert.equal(body.angularVelocity, 0)
})

test('angle wraps to [-PI, PI]', { todo: 'issue #4' }, () => {
  const body = new Body(1).setAngularVelocity(10).finalize()
  for (let i = 0; i < 100; i++) {
    body.advance(0.01)
  }
  assert.ok(Math.abs(body.angle) <= Math.PI, `angle ${body.angle}`)
})

test('target-angle steering turns the short way', () => {
  // target 3PI/2 points the same way as -PI/2, which is 0.01 rad clockwise
  const body = new Body(1).setAngle(-Math.PI / 2 + 0.01).finalize()
  body.setTargetAngle(3 * Math.PI / 2)
  body.applyForces(0.01)
  assert.ok(body.angularVelocity < 0, `angularVelocity ${body.angularVelocity}`)
})

test('target-angle steering turns the short way after several turns', () => {
  // angle 4PI - 0.1 points the same way as -0.1, so target 0 is 0.1 rad counter-clockwise
  const body = new Body(1).setAngle(4 * Math.PI - 0.1).finalize()
  body.setTargetAngle(0)
  body.applyForces(0.01)
  assert.ok(body.angularVelocity > 0, `angularVelocity ${body.angularVelocity}`)
})

test('target-angle steering turns when target is exactly opposite', () => {
  const body = new Body(1).finalize()
  body.setTargetAngle(Math.PI)
  body.applyForces(0.01)
  assert.ok(Math.abs(body.angularVelocity) > 0, `angularVelocity ${body.angularVelocity}`)
})

test('target-angle steering does not turn when target points the same way', () => {
  const body = new Body(1).setAngle(-Math.PI / 2).finalize()
  body.setTargetAngle(3 * Math.PI / 2)
  body.applyForces(0.01)
  assert.equal(body.angularVelocity, 0)
})

test('body without finalize() has finite inertia', { todo: 'issue #8' }, () => {
  const body = new Body(1).setOrigin(0, 0).setAngularForce(1)
  body.applyForces(0.01)
  body.advance(0.01)
  assert.ok(Number.isFinite(body.angularVelocity), `angularVelocity ${body.angularVelocity}`)
})
