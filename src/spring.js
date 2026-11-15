import { Vector } from './vector.js'

/**
 * Damped spring between two bodies. Each end sits at a point on its body,
 * given in the body's frame, by default the body's centre. To fix an end to
 * a point in the world, attach it to a FixedBody: its infinite mass keeps the
 * spring from moving it, and its velocity enters the damping.
 *
 * The force along the spring, with a and b the two points in the world and
 * n = (b - a) / |b - a|, is
 * (stiffness * (|b - a| - restLength) + damping * (vb - va) . n) * n.
 * It pulls body A towards body B and body B towards body A when the spring
 * is stretched, and turns the bodies when it acts off their centres.
 *
 * The force is applied explicitly, once per step. It is stable while
 * sqrt(stiffness / m) * timestep < 2 and damping * timestep / m < 2, with m
 * the reduced mass mA * mB / (mA + mB), or mA if body B is fixed.
 *
 * @author Martin Hentschel
 */
export class Spring {
  constructor (bodyA, bodyB) {
    this.bodyA = bodyA
    this.bodyB = bodyB

    // ends of the spring, in the frames of bodyA and bodyB
    this.localPointA = new Vector(0, 0)
    this.localPointB = new Vector(0, 0)

    // distance of the two ends at which the spring has no stretch force
    this.restLength = 0

    // force per unit of stretch
    this.stiffness = 0

    // force per unit/s of the ends moving apart along the spring
    this.damping = 0
  }

  setLocalPointA (x, y) {
    this.localPointA.x = x
    this.localPointA.y = y
    return this
  }

  setLocalPointB (x, y) {
    this.localPointB.x = x
    this.localPointB.y = y
    return this
  }

  setRestLength (restLength) {
    this.restLength = restLength
    return this
  }

  setStiffness (stiffness) {
    this.stiffness = stiffness
    return this
  }

  setDamping (damping) {
    this.damping = damping
    return this
  }

  /**
   * Computes the force of this spring on body A, from the current origins,
   * angles and velocities. Body B feels the opposite force.
   *
   * @returns {Object} force (forceX, forceY) and the arms from the centres
   * of both bodies to the ends (armAX, armAY, armBX, armBY), or null if the
   * two ends coincide
   */
  force () {
    const bodyA = this.bodyA
    const bodyB = this.bodyB

    // arms from the centres to the ends, local points rotated by the angles
    // (cos and sin of a body are kept up to date by finalize() and advance())
    const armAX = this.localPointA.x * bodyA.cos - this.localPointA.y * bodyA.sin
    const armAY = this.localPointA.x * bodyA.sin + this.localPointA.y * bodyA.cos
    const armBX = this.localPointB.x * bodyB.cos - this.localPointB.y * bodyB.sin
    const armBY = this.localPointB.x * bodyB.sin + this.localPointB.y * bodyB.cos

    // from end a to end b
    const dX = bodyB.origin.x + armBX - bodyA.origin.x - armAX
    const dY = bodyB.origin.y + armBY - bodyA.origin.y - armAY
    const length = Vector.length(dX, dY)
    if (length === 0) {
      return null
    }
    const nX = dX / length
    const nY = dY / length

    // velocities of the ends, v + w x arm
    const velocityAX = bodyA.velocity.x - bodyA.angularVelocity * armAY
    const velocityAY = bodyA.velocity.y + bodyA.angularVelocity * armAX
    const velocityBX = bodyB.velocity.x - bodyB.angularVelocity * armBY
    const velocityBY = bodyB.velocity.y + bodyB.angularVelocity * armBX

    const magnitude = this.stiffness * (length - this.restLength) +
      this.damping * Vector.dot(velocityBX - velocityAX, velocityBY - velocityAY, nX, nY)

    return {
      forceX: magnitude * nX,
      forceY: magnitude * nY,
      armAX,
      armAY,
      armBX,
      armBY
    }
  }

  /**
   * Adds a force computed by force() to the velocities of both bodies, for
   * one step of length timestep.
   *
   * @param {Object} force result of force(), not null
   * @param {Number} timestep timestep
   */
  applyForce (force, timestep) {
    const { forceX, forceY, armAX, armAY, armBX, armBY } = force
    const bodyA = this.bodyA
    const bodyB = this.bodyB

    const scaleA = timestep * bodyA.invertedMass()
    bodyA.velocity.x += forceX * scaleA
    bodyA.velocity.y += forceY * scaleA
    bodyA.angularVelocity += Vector.cross(armAX, armAY, forceX, forceY) *
      timestep * bodyA.invertedInertia()

    const scaleB = timestep * bodyB.invertedMass()
    bodyB.velocity.x -= forceX * scaleB
    bodyB.velocity.y -= forceY * scaleB
    bodyB.angularVelocity -= Vector.cross(armBX, armBY, forceX, forceY) *
      timestep * bodyB.invertedInertia()
  }
}
