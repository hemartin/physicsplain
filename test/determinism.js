/**
 * Hashes of results that must be the same in every engine, bit for bit.
 * Plain ES module without Node-only imports: test/determinism.test.js runs
 * it in Node, test/browsers.js in Chromium, Firefox and WebKit.
 *
 * If a change alters results on purpose (e.g. a solver change), run
 * `npm test`, copy the new hashes from the failure into expectedHashes, and
 * explain in the pull request why they changed.
 *
 * @author Martin Hentschel
 */
import {
  atan2,
  Body,
  cos,
  FixedArc,
  FixedBody,
  FixedCircle,
  FixedFloor,
  sin,
  State,
  Vector
} from '../src/physicsplain.js'

export const expectedHashes = {
  sin: '7a717096a3e48cab724bf5fd79e5c2115fe71b84146112462c64f4b5645a6bfe',
  cos: '9aea828a1cd8e0b185f99eb397b025d02de8e9610a4e263062898da9661b15bd',
  atan2: 'e4e9fa4aee7b151a469585b8ea786df787a388a18abe09fa60599acc11385761',
  pile: 'f9cb2d7bada51ef601ef9fba977622be16767fcc3cdecc00bb2bd8a1f81c0f8d',
  bounce: 'bfdf5b87acf242e6fa12dd365378a715a58899ea285ceb0a2c0f0344f87f99dd',
  steering: '082509e27046bf781c8c30b13befb01d9c8be9b5e751cca4fc8c3cc6f6decbbd'
}

/**
 * @returns {Promise<Object>} hashes by name, like expectedHashes
 */
export async function computeHashes () {
  const hashes = {}
  const detmathResults = detmath()
  for (const name of ['sin', 'cos', 'atan2']) {
    hashes[name] = await sha256(detmathResults[name])
  }
  for (const [name, scene] of Object.entries(scenes)) {
    hashes[name] = await sha256(run(scene(), 600))
  }
  return hashes
}

// sha256 of the bits of all values, so any change in the last bit shows;
// NaN fails, as engines may store it with different bits
async function sha256 (values) {
  const view = new DataView(new ArrayBuffer(8 * values.length))
  values.forEach((value, i) => {
    if (Number.isNaN(value)) {
      throw new Error(`NaN at index ${i}`)
    }
    view.setFloat64(8 * i, value, true)
  })
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', view))
  return Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('')
}

// seeded random 32-bit integers (mulberry32), integer math only, so the
// inputs are the same in every engine
function random (seed) {
  const randomInt = () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return (t ^ (t >>> 14)) >>> 0
  }
  const bits = new DataView(new ArrayBuffer(8))
  return {
    int: randomInt,
    // in [-1, 1)
    unit: () => randomInt() / 2 ** 31 - 1,
    // any double but NaN
    double: () => {
      let x
      do {
        bits.setUint32(0, randomInt())
        bits.setUint32(4, randomInt())
        x = bits.getFloat64(0)
      } while (Number.isNaN(x))
      return x
    }
  }
}

// sin and cos on 1M inputs, atan2 on 1M pairs; the hashes equal those of
// V8's Math.sin, Math.cos and Math.atan2 in Node.js 24
function detmath () {
  const rnd = random(56)
  const inputs = []
  // angles of bodies
  for (let i = 0; i < 600000; i++) {
    inputs.push(rnd.unit() * Math.PI)
  }
  // any allowed argument
  for (let i = 0; i < 100000; i++) {
    inputs.push(rnd.unit() * 1647099)
  }
  // near multiples of PI/2, hardest to reduce
  for (let i = 0; i < 100000; i++) {
    inputs.push((rnd.int() % 1048576) * (Math.PI / 2) * (1 + rnd.unit() * 2 ** -50))
  }
  // every magnitude, down to subnormals
  while (inputs.length < 1000000) {
    const x = rnd.double()
    if (Math.abs(x) < 1647100) {
      inputs.push(x)
    }
  }

  const atan2Results = []
  // directions, in all quadrants
  for (let i = 0; i < 500000; i++) {
    atan2Results.push(atan2(rnd.unit(), rnd.unit()))
  }
  // every magnitude and ratio, including infinities
  for (let i = 0; i < 500000; i++) {
    atan2Results.push(atan2(rnd.double(), rnd.double()))
  }
  return { sin: inputs.map(sin), cos: inputs.map(cos), atan2: atan2Results }
}

class SceneState extends State {
  constructor (movingBodies, fixedBodies, inputs = {}) {
    super()
    this.movingBodies = movingBodies
    this.fixedBodies = fixedBodies
    // inputs by step number, applied in postStep()
    this.inputs = inputs
  }

  * getMovingBodies () {
    yield * this.movingBodies
  }

  * getFixedBodies () {
    yield * this.fixedBodies
  }

  postStep () {
    this.inputs[this.steps]?.(this.movingBodies)
  }
}

// bits of all moving bodies after each step
function run (state, steps) {
  const values = []
  for (let i = 0; i < steps; i++) {
    state.step()
    for (const body of state.getMovingBodies()) {
      values.push(body.origin.x, body.origin.y, body.angle,
        body.velocity.x, body.velocity.y, body.angularVelocity)
    }
  }
  return values
}

const scenes = {
  // 30 boxes, slightly turned, fall onto a fixed body and settle
  pile () {
    const boxes = []
    for (let i = 0; i < 30; i++) {
      boxes.push(new Body(i + 1)
        .setOrigin((i % 6) * 0.11 - 0.28 + 0.004 * (i % 5), 0.06 + 0.12 * Math.floor(i / 6))
        .setAngle(0.03 * (i % 7) - 0.09)
        .setForce(0, -2)
        .finalize())
    }
    const floor = new FixedBody(100).setOrigin(0, -0.5).setDimension(2, 1).finalize()
    const state = new SceneState(boxes, [floor])
    state.restitution = 0
    return state
  },

  // spinning boxes bounce elastically off fixed bodies, circles, arcs and
  // floors
  bounce () {
    const boxes = []
    for (let i = 0; i < 6; i++) {
      boxes.push(new Body(i + 1)
        .setOrigin(-0.9 + 0.1 * i, 0.4 - 0.15 * i)
        .setVelocity(3 - 0.2 * i, 0.5 * (i % 3) - 0.5)
        .setAngularVelocity(2 * i - 5)
        .finalize())
    }
    for (const box of boxes) {
      box.lateralFriction = 0
      box.rotationalFriction = 0
    }
    const state = new SceneState(boxes, [
      new FixedBody(10).setOrigin(0, 0.6).setDimension(2.4, 0.2).finalize(),
      new FixedBody(11).setOrigin(0, -0.6).setDimension(2.4, 0.2).finalize(),
      new FixedCircle(12, new Vector(0.1, 0), 0.15),
      new FixedCircle(13, new Vector(-0.5, 0.1), 0.1),
      new FixedArc(14, new Vector(0.5, 0), 0.5, 0.2, 0, Math.PI * 0.5),
      new FixedArc(15, new Vector(0.5, 0), 0.5, 0.2, Math.PI * 1.5, Math.PI * 2),
      new FixedFloor(16, new Vector(-1.1, 0.5), new Vector(-1.1, -0.5)), // faces right
      new FixedFloor(17, new Vector(-0.3, -0.5), new Vector(0.2, -0.3))
    ])
    state.restitution = 1
    return state
  },

  // bodies steer towards targets and target angles set as inputs at fixed
  // steps, turning across +-PI
  steering () {
    const bodies = [0, 1, 2, 3].map(i => new Body(i + 1)
      .setOrigin(-0.6 + 0.4 * i, 0.2 * (i % 2))
      .setAngle(3 - 2 * i)
      .finalize())
    const inputs = {
      1: ([a, b]) => {
        a.setTarget(0.8, 0.4)
        a.thrust = 4
        b.setTargetAngle(3.1)
      },
      100: ([a, b, c]) => {
        a.setTargetAngle(-3.1)
        const target = new Vector(0.7, 0).rotate(2.5)
        c.setTarget(target.x, target.y)
        b.setTargetAngle(-3.1)
      },
      200: ([a, b, c, d]) => {
        a.setTarget(-0.8, -0.3)
        d.setVelocity(-2, 0.5)
        d.setAngularForce(0.3)
      },
      300: ([a, b, c, d]) => {
        a.unsetTarget()
        b.unsetTargetAngle()
        c.setTarget(0, 0)
        d.setAngularForce(0)
      },
      450: ([a]) => {
        a.setTargetAngle(Math.PI)
        a.setForce(0.5, -0.5)
      }
    }
    return new SceneState(bodies, [new FixedCircle(10, new Vector(0, -0.1), 0.12)], inputs)
  }
}
