import { Collision } from './collision.js'

/**
 * Abstract state class that advances moving bodies. It collides moving bodies
 * with each other and collides moving bodies with fixed bodies. Moving bodies
 * and fixed bodies are passed via two generator functions *movingBodies() and
 * *fixedBodies() which must be overridden by concrete state implementations.
 *
 * @author Martin Hentschel
 */
export class State {
  constructor () {
    this.start = 0
    this.previous = 0
    this.remainder = 0

    // restitution: 1 = elastic collision, <1 inelastic collision
    this.restitution = 1
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
   * Called before advancing physics of bodies. Override if needed.
   *
   * @param {Number} now current timestamp
   */
  preAdvance (now) {}

  /**
   * Called after each step when advancing physics. Override if needed
   * to update physics (e.g. set new targets of bodies). This keeps
   * physics consistent even if application is replayed at different
   * frames per second later.
   *
   * @param {Number} fixedTimestep fixed timestep
   */
  postStep (fixedTimestep) {}

  /**
   * Called after advancing physics of bodies. Override if needed to
   * udpate graphics. Most of the time, multiple steps of physics
   * simulations will be run in one call to advance(). Graphics should
   * only be updated after all steps have finished to avoid
   * unnecessary computation.
   *
   * @param {Number} now current timestamp
   */
  postAdvance (now) {}

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
   * Advances bodies given current timestamp.
   *
   * @param {Number} now current timestamp in ms
   */
  advance (now) {
    // call callback
    this.preAdvance(now)

    const fixedTimestep = 10 // in ms

    if (this.start === 0) {
      this.start = now
    }
    if (this.previous === 0) {
      this.previous = now
    }
    let timestep = now - this.previous + this.remainder

    // move physics forward in fixed intervals
    while (timestep > fixedTimestep) {
      this.advanceByTimestep(fixedTimestep / 1000)
      timestep -= fixedTimestep

      // call callback, lets application update physics (e.g. targets)
      this.postStep(fixedTimestep)
    }
    this.previous = now
    this.remainder = timestep

    // call callback, lets application update graphics
    this.postAdvance(now)
  }

  /**
   * Advances bodies by given timestamp (typically in the order of 10
   * milliseconds).
   *
   * @param {Number} timestep timestep
   */
  advanceByTimestep (timestep) {
    // check for collisions
    const collisions = this.collide(timestep)

    // apply forces
    for (const body of this.getMovingBodies()) {
      body.applyForces(timestep)
    }

    // apply impulses
    for (const collision of collisions) {
      collision.apply()
    }

    // advance body
    for (const body of this.getMovingBodies()) {
      body.advance(timestep)
    }
  }

  /**
   * Collides all movable bodies with each other and all movable bodies against
   * all fixed bodies. Applies predicate (if defined) to evaluate if bodies
   * should collide.
   *
   * @param {Number} timestep timestep
   */
  collide (timestep) {
    const collisions = []

    // collide movable bodies with each other
    const lookedAt = new Set()
    for (const movingBody1 of this.getMovingBodies()) {
      // remember id of movingBody1
      lookedAt.add(movingBody1.id)

      // collide bodies if id not in set
      for (const movingBody2 of this.getMovingBodies()) {
        if (
          !lookedAt.has(movingBody2.id) &&
          this.collideBodies(movingBody1, movingBody2) &&
          this.collideBodies(movingBody2, movingBody1)
        ) {
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
      for (const movingBody of this.getMovingBodies()) {
        if (
          this.collideBodies(fixedBody, movingBody) &&
          this.collideBodies(movingBody, fixedBody)
        ) {
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
