import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Body, FixedBody, Vector } from '../src/physicsplain.js'
import { diamond, diamondRadius } from './helpers.js'

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

test('angle wraps to (-PI, PI] when spinning clockwise', () => {
  const body = new Body(1).setAngularVelocity(-10).finalize()
  for (let i = 0; i < 100; i++) {
    body.advance(0.01)
  }
  // -10 rad is the same direction as -10 + 4PI
  assert.ok(Math.abs(body.angle - (-10 + 4 * Math.PI)) < 1e-9, `angle ${body.angle}`)
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
  assert.equal(body.unsetTarget(), body)
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

test('body stops turning after unsetTargetAngle', () => {
  const body = new Body(1).setTargetAngle(1).finalize()
  assert.equal(body.unsetTargetAngle(), body)
  assert.equal(body.hasTargetAngle(), false)
  body.applyForces(0.01)
  assert.equal(body.angularVelocity, 0)
})

test('angle wraps to (-PI, PI]', () => {
  const body = new Body(1).setAngularVelocity(10).finalize()
  for (let i = 0; i < 100; i++) {
    body.advance(0.01)
  }
  assert.ok(Math.abs(body.angle) <= Math.PI, `angle ${body.angle}`)
})

test('setAngle wraps to (-PI, PI]', () => {
  assert.ok(Math.abs(new Body(1).setAngle(3 * Math.PI / 2).angle + Math.PI / 2) < 1e-12)
  assert.ok(Math.abs(new Body(1).setAngle(10).angle - (10 - 4 * Math.PI)) < 1e-12)
  assert.equal(new Body(1).setAngle(-0.5).angle, -0.5)
})

test('body angle and Vector.angle share the boundary at PI', () => {
  assert.equal(new Body(1).setAngle(Math.PI).angle, Math.PI)
  assert.equal(new Body(1).setAngle(-Math.PI).angle, Math.PI)
  assert.equal(Vector.angle(-1, 0), Math.PI)
})

test('body aimed with Vector.angle keeps that angle', () => {
  for (const [x, y] of [[1, 1], [-1, 1], [-1, -1], [1, -1], [-1, 0]]) {
    const direction = Vector.angle(x, y)
    const body = new Body(1).setAngle(direction).finalize()
    body.advance(0.01)
    assert.equal(body.angle, direction, `direction (${x}, ${y})`)
  }
})

test('angle wraps after more than one turn in a single step', () => {
  const body = new Body(1).setAngularVelocity(100).finalize()
  body.advance(0.1)
  assert.ok(Math.abs(body.angle - (10 - 4 * Math.PI)) < 1e-12, `angle ${body.angle}`)
})

test('target-angle steering turns the short way', () => {
  // target 3PI/2 points the same way as -PI/2, which is 0.01 rad clockwise
  const body = new Body(1).setAngle(-Math.PI / 2 + 0.01).finalize()
  body.setTargetAngle(3 * Math.PI / 2)
  body.applyForces(0.01)
  assert.ok(body.angularVelocity < 0, `angularVelocity ${body.angularVelocity}`)
})

test('body without finalize() has finite inertia', () => {
  const body = new Body(1).setOrigin(0, 0).setAngularForce(1)
  body.applyForces(0.01)
  body.advance(0.01)
  assert.ok(Number.isFinite(body.angularVelocity), `angularVelocity ${body.angularVelocity}`)
})

test('body without finalize() turns like a finalized body with default values', () => {
  const body = new Body(1).setAngularForce(1)
  const finalized = new Body(2).setAngularForce(1).finalize()
  body.applyForces(0.01)
  finalized.applyForces(0.01)
  assert.equal(body.angularVelocity, finalized.angularVelocity)
  assert.deepEqual(body.cornerX, finalized.cornerX)
  assert.deepEqual(body.cornerY, finalized.cornerY)
})

test('finalize computes the bounding radius, half the diagonal', () => {
  assert.equal(new Body(1).setDimension(0.6, 0.8).finalize().boundingRadius, 0.5)
})

test('edgeNormal points out of the body', () => {
  const body = new Body(1).setDimension(0.4, 0.2).finalize()
  const normals = [0, 1, 2, 3].map(edge => body.edgeNormal(edge)).map(n => [n.x, n.y].map(c => +c.toFixed(9) + 0))
  assert.deepEqual(normals, [[0, 1], [-1, 0], [0, -1], [1, 0]])
})

test('bodies whose corners just touch collide, bodies just apart do not', () => {
  const body = diamond(0, 0)
  assert.notEqual(body.collide(diamond(2 * diamondRadius - 1e-6, 0), 0.01, 1), null)
  assert.equal(body.collide(diamond(2 * diamondRadius + 1e-3, 0), 0.01, 1), null)
})

test('interpolated origin, angle and corners lie between the last two steps', () => {
  const body = new Body(1).setOrigin(1, 2).setAngle(0.5).setVelocity(1, -2).setAngularVelocity(10).finalize()
  const cornerX = [...body.cornerX]
  const cornerY = [...body.cornerY]
  body.advance(0.01)
  const close = (a, b) => Math.abs(a - b) < 1e-12

  const start = body.interpolatedOrigin(0)
  const half = body.interpolatedOrigin(0.5)
  const end = body.interpolatedOrigin(1)
  assert.deepEqual([start.x, start.y], [1, 2])
  assert.ok(close(half.x, 1.005) && close(half.y, 1.99), `half ${half}`)
  assert.deepEqual([end.x, end.y], [body.origin.x, body.origin.y])

  assert.equal(body.interpolatedAngle(0), 0.5)
  assert.ok(close(body.interpolatedAngle(0.5), 0.55))
  assert.equal(body.interpolatedAngle(1), body.angle)

  const before = body.interpolatedCorners(0)
  const after = body.interpolatedCorners(1)
  for (let i = 0; i < 4; i++) {
    assert.ok(close(before.cornerX[i], cornerX[i]) && close(before.cornerY[i], cornerY[i]), `corner ${i} before`)
    assert.ok(close(after.cornerX[i], body.cornerX[i]) && close(after.cornerY[i], body.cornerY[i]), `corner ${i} after`)
  }
})

test('interpolated angle turns the short way across PI', () => {
  const body = new Body(1).setAngle(Math.PI - 0.05).setAngularVelocity(10).finalize()
  body.advance(0.01)
  // angle wrapped from PI - 0.05 to -PI + 0.05, half way is PI
  assert.ok(body.angle < 0, `angle ${body.angle}`)
  assert.ok(Math.abs(Math.cos(body.interpolatedAngle(0.5)) + 1) < 1e-12, `angle ${body.interpolatedAngle(0.5)}`)
})

test('setOrigin and setAngle move a body without drawing it moving there', () => {
  const body = new Body(1).setVelocity(1, 0).finalize()
  body.advance(0.01)
  body.setOrigin(5, 5).setAngle(1)
  const origin = body.interpolatedOrigin(0)
  assert.deepEqual([origin.x, origin.y, body.interpolatedAngle(0)], [5, 5, 1])
})
