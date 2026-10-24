import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Body, FixedBody, FixedLine, Vector } from '../src/physicsplain.js'
import { TestState, collideAndApply } from './helpers.js'

// floor with its top edge at y = 0
const floor = () => new FixedBody(100).setOrigin(0, -0.5).setDimension(2, 1).finalize()

test('narrow box bounces off the floor elastically', () => {
  const box = new Body(1).setOrigin(0, 0.199).setDimension(0.02, 0.4).setVelocity(0, -1).finalize()
  collideAndApply(new TestState([box], [floor()]))
  assert.ok(Math.abs(box.velocity.y - 1) < 0.1, `vy ${box.velocity.y}`)
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

test('stacked box drifting sideways keeps the top normal', () => {
  // corners of upper box sit exactly on the side edges of lower box
  const lower = new Body(1).finalize()
  const upper = new Body(2).setOrigin(0, 0.099).setVelocity(0.001, -0.01).finalize()
  const points = new TestState([lower, upper]).collide(0.01).flatMap(c => c.collisionPoints)
  assert.equal(points.length, 2)
  for (const p of points) {
    assert.ok(Math.abs(p.normalX) < 1e-9 && Math.abs(p.normalY - 1) < 1e-9, `normal (${p.normalX}, ${p.normalY})`)
  }
})

test('separation belongs to the edge of the normal', () => {
  // corner crosses the left edge 0.02 deep, 0.005 below the top edge
  const impacted = new FixedBody(1).finalize()
  const colliding = new Body(2).setOrigin(-0.08, 0.095).setVelocity(3, 0).finalize()
  const points = new TestState([colliding], [impacted]).collide(0.01).flatMap(c => c.collisionPoints)
  assert.equal(points.length, 2)
  for (const p of points) {
    assert.ok(Math.abs(Math.abs(p.normalX) - 1) < 1e-9 && Math.abs(p.normalY) < 1e-9, `normal (${p.normalX}, ${p.normalY})`)
    assert.ok(Math.abs(p.separation - 0.02) < 1e-9, `separation ${p.separation}`)
  }
})

for (const [name, offset, restitution] of [['aligned', 0, 0], ['offset', 0.01, 0], ['aligned', 0, 1], ['offset', 0.01, 1]]) {
  test(`${name} stack of three boxes keeps its height under gravity, restitution ${restitution}`, () => {
    const boxes = [0, 1, 2].map(i => new Body(i + 1).setOrigin(offset * i, 0.05 + 0.1 * i).setForce(0, -2).finalize())
    const state = new TestState(boxes, [floor()])
    state.restitution = restitution
    for (let i = 0; i < 500; i++) {
      state.advanceByTimestep(0.01)
    }
    const height = Math.max(...boxes[2].cornerY)
    assert.ok(height > 0.29, `stack height ${height}`)
  })
}

test('narrow box bounce follows restitution', () => {
  for (const restitution of [0, 0.5]) {
    const box = new Body(1).setOrigin(0, 0.199).setDimension(0.02, 0.4).setVelocity(0, -1).finalize()
    const state = new TestState([box], [floor()])
    state.restitution = restitution
    collideAndApply(state)
    assert.ok(Math.abs(box.velocity.y - restitution) < 0.05, `restitution ${restitution}, vy ${box.velocity.y}`)
  }
})

test('rotated narrow box bounces elastically without gaining energy', () => {
  const box = new Body(1).setOrigin(0, 0.199).setAngle(Math.PI / 2).setDimension(0.4, 0.02).setVelocity(0, -1).finalize()
  collideAndApply(new TestState([box], [floor()]))
  const energy = 0.5 * box.mass * (box.velocity.x ** 2 + box.velocity.y ** 2) +
    0.5 * box.inertia * box.angularVelocity ** 2
  assert.ok(Math.abs(box.velocity.y - 1) < 0.1, `vy ${box.velocity.y}`)
  assert.ok(energy < 0.5 * 1.01, `energy ${energy}`)
})

test('wide box resting on the floor does not tilt', () => {
  const box = new Body(1).setOrigin(0, 0.01).setDimension(0.4, 0.02).setForce(0, -2).finalize()
  const state = new TestState([box], [floor()])
  state.restitution = 0
  for (let i = 0; i < 1000; i++) {
    state.advanceByTimestep(0.01)
  }
  assert.ok(Math.abs(box.angle) < 1e-4, `angle ${box.angle}`)
})

test('box stacked on another box does not sink into it', () => {
  const lower = new Body(1).setOrigin(0, 0).finalize()
  const upper = new Body(2).setOrigin(0, 0.09).setVelocity(0, -1).finalize()
  collideAndApply(new TestState([lower, upper]))
  assert.ok(upper.velocity.y > -0.5, `upper vy ${upper.velocity.y}`)
})

test('stacked boxes under gravity do not keep sinking', () => {
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

test('box pushed into the floor moves out without bouncing', () => {
  const line = new FixedLine(100, new Vector(-1, 0), new Vector(1, 0))
  for (const fixed of [floor(), line]) {
    const box = new Body(1).setOrigin(0, 0.04).setForce(0, -2).finalize()
    const state = new TestState([box], [fixed])
    state.restitution = 0
    let maxY = box.origin.y
    for (let i = 0; i < 100; i++) {
      state.advanceByTimestep(0.01)
      maxY = Math.max(maxY, box.origin.y)
    }
    const penetration = -Math.min(...box.cornerY)
    assert.ok(penetration < 0.002, `penetration ${penetration}`)
    assert.ok(maxY < 0.05, `max y ${maxY}`)
    assert.ok(Math.abs(box.velocity.y) < 0.001, `vy ${box.velocity.y}`)
  }
})

test('box resting on the floor stays put', () => {
  const box = new Body(1).setOrigin(0, 0.05).setForce(0, -2).finalize()
  const state = new TestState([box], [floor()])
  state.restitution = 0
  for (let i = 0; i < 1000; i++) {
    state.advanceByTimestep(0.01)
    assert.ok(Math.abs(box.origin.y - 0.05) < 0.0001, `step ${i}, y ${box.origin.y}`)
    assert.ok(Math.abs(box.velocity.y) < 0.001, `step ${i}, vy ${box.velocity.y}`)
  }
})

test('elastic bounce of a penetrating box keeps its speed', () => {
  const box = new Body(1).setOrigin(0, 0.04).setVelocity(0, -1).finalize()
  collideAndApply(new TestState([box], [floor()]))
  assert.ok(Math.abs(box.velocity.y - 1) < 0.01, `vy ${box.velocity.y}`)
})

test('elastic bounce under gravity keeps its height', () => {
  const box = new Body(1).setOrigin(0, 0.55).setForce(0, -2).finalize()
  box.lateralFriction = 0
  box.rotationalFriction = 0
  const state = new TestState([box], [floor()])
  state.restitution = 1
  const apexes = []
  let previousVy = 0
  for (let i = 0; i < 1500; i++) {
    state.advanceByTimestep(0.01)
    if (previousVy > 0 && box.velocity.y <= 0) {
      apexes.push(box.origin.y)
    }
    previousVy = box.velocity.y
  }
  assert.ok(apexes.length >= 5, `${apexes.length} bounces`)
  for (const apex of apexes) {
    assert.ok(Math.abs(apex - 0.55) < 0.001, `apexes ${apexes.map(a => a.toFixed(4))}`)
  }
})

test('narrow box landing on its short end does not start spinning', () => {
  for (const width of [0.01, 0.02]) {
    for (const restitution of [0, 0.5, 1]) {
      const box = new Body(1).setOrigin(0, 0.205).setDimension(width, 0.4).setVelocity(0, -1).finalize()
      box.lateralFriction = 0
      box.rotationalFriction = 0
      const state = new TestState([box], [floor()])
      state.restitution = restitution
      let maxAngularVelocity = 0
      for (let i = 0; i < 20; i++) {
        state.advanceByTimestep(0.01)
        maxAngularVelocity = Math.max(maxAngularVelocity, Math.abs(box.angularVelocity))
      }
      assert.ok(maxAngularVelocity < 1e-6, `width ${width}, restitution ${restitution}: angularVelocity ${maxAngularVelocity}`)
    }
  }
})

test('box rotating on the floor is pushed only at the corner moving into it', () => {
  // left bottom corner moves down into the floor, right bottom corner moves
  // up; penetration is below the slop, so there is no push-out bias
  for (const angularVelocity of [2, 10, 30]) {
    const box = new Body(1).setOrigin(0, 0.0095).setDimension(0.4, 0.02).setVelocity(0, -0.1).setAngularVelocity(angularVelocity).finalize()
    const energy = () => 0.5 * box.mass * (box.velocity.x ** 2 + box.velocity.y ** 2) + 0.5 * box.inertia * box.angularVelocity ** 2
    const before = energy()
    const state = new TestState([box], [floor()])
    state.restitution = 0
    const points = collideAndApply(state).flatMap(c => c.collisionPoints)
    assert.equal(points.length, 2)
    const [left, right] = points[0].contactPointX < points[1].contactPointX ? points : [points[1], points[0]]
    const message = `angularVelocity ${angularVelocity}`
    assert.ok(left.accumulatedImpulse > 0, message)
    assert.ok(Math.abs(left.getNormalVelocity()) < 1e-9, message)
    assert.equal(right.accumulatedImpulse, 0, message)
    assert.ok(right.getNormalVelocity() > 0, message)
    assert.ok(energy() < before, message)
  }
})

test('overlapping fixed bodies in the list of moving bodies do not produce NaN', () => {
  const a = new FixedBody(1).setOrigin(0, 0).finalize()
  const b = new FixedBody(2).setOrigin(0.05, 0.05).finalize()
  const state = new TestState([a, b])
  assert.equal(collideAndApply(state).length, 1)
  for (const body of [a, b]) {
    assert.deepEqual([body.velocity.x, body.velocity.y, body.angularVelocity], [0, 0, 0])
  }
})
