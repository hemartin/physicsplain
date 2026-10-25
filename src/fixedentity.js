import { Vector } from './vector.js'

/**
 * Base class of fixed entities that are not bodies (FixedArc, FixedCircle,
 * FixedFloor). A fixed entity has infinite mass and never moves.
 *
 * @author Martin Hentschel
 */
export class FixedEntity {
  constructor (id, origin) {
    this.id = id
    this.origin = origin
    this.velocity = new Vector(0, 0)
    this.angularVelocity = 0
  }

  // this is a fixed entity
  invertedMass () {
    return 0
  }

  // this is a fixed entity
  invertedInertia () {
    return 0
  }

  // fixed entity has no velocity
  addVelocity (velocity) {}

  // fixed entity has no angular velocity
  addAngularVelocity (angularVelocity) {}
}
