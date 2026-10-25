import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Body, FixedCircle, Vector } from '../src/physicsplain.js'
import { TestState, diamond, diamondRadius } from './helpers.js'

const circle = () => new FixedCircle(1, new Vector(0, 0), 0.2)

test('body far from the circle does not collide', () => {
  const body = new Body(2).setOrigin(1, 1).finalize()
  assert.equal(circle().collide(body, 0.01, 1), null)
})

test('corner inside the circle collides with normal away from the center', () => {
  // body rotated by 45 degrees, its lowest corner is at (0, 0.189)
  const body = new Body(2).setOrigin(0, 0.26).setAngle(Math.PI / 4).finalize()
  const collision = circle().collide(body, 0.01, 1)
  assert.notEqual(collision, null)
  assert.equal(collision.collisionPoints.length, 1)
  const point = collision.collisionPoints[0]
  assert.ok(Math.abs(point.normalX) < 1e-9, `normalX ${point.normalX}`)
  assert.ok(Math.abs(point.normalY - 1) < 1e-9, `normalY ${point.normalY}`)
})

test('circle pushing into an edge collides with the edge normal', () => {
  // wide body, its bottom edge is inside the circle but its corners are not
  const body = new Body(2).setOrigin(0, 0.24).setDimension(0.4, 0.1).finalize()
  const collision = circle().collide(body, 0.01, 1)
  assert.notEqual(collision, null)
  assert.equal(collision.collisionPoints.length, 1)
  const point = collision.collisionPoints[0]
  assert.ok(Math.abs(point.contactPointX) < 1e-9, `contactPointX ${point.contactPointX}`)
  assert.ok(Math.abs(point.contactPointY - 0.19) < 1e-9, `contactPointY ${point.contactPointY}`)
  assert.ok(Math.abs(point.normalX) < 1e-9, `normalX ${point.normalX}`)
  assert.ok(Math.abs(point.normalY - 1) < 1e-9, `normalY ${point.normalY}`)
})

test('body falling onto the circle bounces back up', () => {
  const body = new Body(2).setOrigin(0, 0.3).setDimension(0.4, 0.1).setVelocity(0, -1).finalize()
  body.lateralFriction = 0
  body.rotationalFriction = 0
  const state = new TestState([body], [circle()])
  for (let i = 0; i < 30; i++) {
    state.advanceByTimestep(0.01)
  }
  assert.ok(body.velocity.y > 0.5, `vy ${body.velocity.y}`)
  assert.ok(Math.min(...body.cornerY) > 0.19, `bottom ${Math.min(...body.cornerY)}`)
})

test('corner just reaching into the circle collides', () => {
  // circle() has radius 0.2
  assert.notEqual(circle().collide(diamond(0.2 + diamondRadius - 1e-6, 0), 0.01, 1), null)
  assert.equal(circle().collide(diamond(0.2 + diamondRadius + 1e-3, 0), 0.01, 1), null)
})
