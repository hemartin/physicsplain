import { Body, State } from '../src/physicsplain.js'

/**
 * Minimal state for tests that serves bodies from two arrays.
 */
export class TestState extends State {
  constructor (movingBodies = [], fixedBodies = []) {
    super()
    this.movingBodies = movingBodies
    this.fixedBodies = fixedBodies
  }

  * getMovingBodies () {
    yield * this.movingBodies
  }

  * getFixedBodies () {
    yield * this.fixedBodies
  }
}

/**
 * Collides all bodies of state once and applies the resulting impulses.
 */
export function collideAndApply (state, timestep = 0.01) {
  const collisions = state.collide(timestep)
  for (const collision of collisions) {
    collision.apply(timestep)
  }
  return collisions
}

/**
 * Box turned by 45 degrees at (x, y), its corners point along the x and y
 * axes. Its corner reaches out by diamondRadius, as far as the bounding
 * circle.
 */
export const diamond = (x, y) => new Body(2).setOrigin(x, y).setAngle(Math.PI / 4).finalize()
export const diamondRadius = 0.05 * Math.SQRT2
