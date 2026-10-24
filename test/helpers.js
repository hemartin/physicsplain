import { State } from '../src/physicsplain.js'

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
    collision.apply()
  }
  return collisions
}
