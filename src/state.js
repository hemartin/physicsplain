import { Collision } from './collision.js'
import { defaultRestitution, defaultTimestep } from './constants.js'

/**
 * Abstract state class that advances moving bodies. It collides moving bodies
 * with each other and collides moving bodies with fixed bodies. Moving bodies
 * and fixed bodies are passed via two generator functions *movingBodies() and
 * *fixedBodies() which must be overridden by concrete state implementations.
 *
 * Each call to step() advances physics by one fixed step, independent of
 * wall-clock time, so the same steps give the same results in every engine.
 * A Clock runs the steps as time passes in the browser.
 *
 * @author Martin Hentschel
 */
export class State {
  constructor () {
    // number of steps run so far
    this.steps = 0

    // length of a physics step in seconds; set before the first step, and
    // replay with the same value
    this.timestep = defaultTimestep

    // restitution: 1 = elastic collision, <1 inelastic collision
    this.restitution = defaultRestitution
  }

  /**
   * @return{Generator} All moving bodies as an iterable. This is a generator
   * method. Must be overridden by a state implementation.
   */
  * getMovingBodies () {}

  /**
   * @return{Generator} All fixed bodies as an iterable. This is a generator
   * method. Must be overridden by a state implementation.
   */
  * getFixedBodies () {}

  /**
   * @returns {Number} simulated time in seconds, steps * timestep
   */
  get time () {
    return this.steps * this.timestep
  }

  /**
   * Called at the end of each step, after steps was increased. Override
   * to apply inputs and game logic that change bodies (e.g. set targets).
   * This keeps physics the same when the game is replayed, at any frame
   * rate.
   */
  postStep () {}

  /**
   * Evaluates whether two bodies should collide. Order of bodies does not
   * matter.
   *
   * @param {Body} body1 first body (or circle or arc)
   * @param {Body} body2 second body (or circle or arc)
   * @returns true if bodies should collide
   */
  collideBodies (body1, body2) {
    return true
  }

  /**
   * Advances bodies by one step of length timestep, then calls postStep().
   */
  step () {
    const timestep = this.timestep

    // check for collisions
    const collisions = this.collide()

    // apply forces
    for (const body of this.getMovingBodies()) {
      body.applyForces(timestep)
    }

    // apply impulses
    for (const collision of collisions) {
      collision.apply(timestep)
    }

    // advance body
    for (const body of this.getMovingBodies()) {
      body.advance(timestep)
    }

    this.steps++
    this.postStep()
  }

  /**
   * Collides all movable bodies with each other and all movable bodies against
   * all fixed bodies. Applies predicate (if defined) to evaluate if bodies
   * should collide.
   */
  collide () {
    const timestep = this.timestep
    const collisions = []

    // moving bodies once per step; collide each pair of movable bodies once
    // (by index, ids may be missing or duplicate)
    const movingBodies = [...this.getMovingBodies()]
    for (let i = 0; i < movingBodies.length; i++) {
      const movingBody1 = movingBodies[i]
      for (let j = i + 1; j < movingBodies.length; j++) {
        const movingBody2 = movingBodies[j]
        if (this.collideBodies(movingBody1, movingBody2)) {
          const collision = movingBody1.collide(
            movingBody2,
            timestep,
            this.restitution
          )
          if (collision !== null) {
            collisions.push(collision)
          }
        }
      }
    }

    // collide each movable body with all fixed bodies
    for (const fixedBody of this.getFixedBodies()) {
      for (const movingBody of movingBodies) {
        if (this.collideBodies(fixedBody, movingBody)) {
          const collision = fixedBody.collide(
            movingBody,
            timestep,
            this.restitution
          )
          if (collision !== null) {
            collisions.push(collision)
          }
        }
      }
    }

    return Collision.mergeCollisions(collisions)
  }
}
