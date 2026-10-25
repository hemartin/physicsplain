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
   * @param {Number} fixedTimestep fixed timestep in seconds (0.01), the
   * same timestep used to integrate bodies
   */
  postStep (fixedTimestep) {}

  /**
   * Called after advancing physics of bodies. Override if needed to
   * udpate graphics. Most of the time, multiple steps of physics
   * simulations will be run in one call to advance(). Graphics should
   * only be updated after all steps have finished to avoid
   * unnecessary computation.
   *
   * Physics runs in fixed steps of 10 ms, so the current time usually lies
   * between two steps. Draw bodies at Body.interpolatedOrigin(alpha),
   * interpolatedAngle(alpha) or interpolatedCorners(alpha) to avoid
   * judder, e.g. at 60 Hz frames alternate between 1 and 2 steps. This
   * draws bodies up to one step (10 ms) behind physics.
   *
   * @param {Number} now current timestamp
   * @param {Number} alpha time since the last step as a fraction of a
   * step, from 0 (draw the state before the last step) to 1 (draw the
   * current state)
   */
  postAdvance (now, alpha) {}

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
   * Advances bodies given current timestamp. Elapsed time since the last
   * call is capped at 250 ms, so physics pauses rather than catching up
   * after long gaps (e.g. a hidden browser tab).
   *
   * @param {Number} now current timestamp in ms
   */
  advance (now) {
    // call callback
    this.preAdvance(now)

    const fixedTimestep = 10 // in ms

    if (this.previous === 0) {
      this.previous = now
    }
    // cap elapsed time (e.g. after the tab was hidden) to avoid freezing
    let timestep = Math.min(now - this.previous, 250) + this.remainder

    // move physics forward in fixed intervals
    while (timestep > fixedTimestep) {
      this.advanceByTimestep(fixedTimestep / 1000)
      timestep -= fixedTimestep

      // call callback, lets application update physics (e.g. targets)
      this.postStep(fixedTimestep / 1000)
    }
    this.previous = now
    this.remainder = timestep

    // call callback, lets application update graphics
    this.postAdvance(now, this.remainder / fixedTimestep)
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
      collision.apply(timestep)
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
