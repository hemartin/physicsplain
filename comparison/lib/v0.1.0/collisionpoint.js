import { Vector } from './vector.js'

/**
 * A collision point models exactly one point of collision between two entities.
 *
 * @author Martin Hentschel
 */
export class CollisionPoint {
  constructor (
    collidingEntity,
    impactedEntity,
    normalX,
    normalY,
    contactPointX,
    contactPointY,
    separation
  ) {
    this.collidingEntity = collidingEntity
    this.impactedEntity = impactedEntity
    this.normalX = normalX
    this.normalY = normalY
    this.contactPointX = contactPointX
    this.contactPointY = contactPointY
    this.separation = separation

    this.accumulatedImpulse = 0
    this.nv1 = new Vector(0, 0)
    this.nw1 = 0
    this.nv2 = new Vector(0, 0)
    this.nw2 = 0
  }

  getNormalMass () {
    // Vector r1 = Vector.substract(collidingEntity.getOrigin(), contactPoint)
    const ceo = this.collidingEntity.origin
    const r1X = ceo.x - this.contactPointX
    const r1Y = ceo.y - this.contactPointY

    // Vector r2 = Vector.substract(impactedEntity.getOrigin(), contactPoint)
    const ieo = this.impactedEntity.origin
    const r2X = ieo.x - this.contactPointX
    const r2Y = ieo.y - this.contactPointY

    let cp1 = Vector.cross(r1X, r1Y, this.normalX, this.normalY)
    cp1 *= cp1
    let cp2 = Vector.cross(r2X, r2Y, this.normalX, this.normalY)
    cp2 *= cp2
    return (
      1 /
      (this.collidingEntity.invertedMass() +
        this.impactedEntity.invertedMass() +
        cp1 * this.collidingEntity.invertedInertia() +
        cp2 * this.impactedEntity.invertedInertia())
    )
  }

  addTempVelocities (v1X, v1Y, w1, v2X, v2Y, w2) {
    this.nv1.x += v1X
    this.nv1.y += v1Y
    this.nw1 += w1
    this.nv2.x += v2X
    this.nv2.y += v2Y
    this.nw2 += w2
  }

  applyTempVelocities () {
    this.collidingEntity.addVelocity(this.nv1)
    this.collidingEntity.addAngularVelocity(this.nw1)
    this.impactedEntity.addVelocity(this.nv2)
    this.impactedEntity.addAngularVelocity(this.nw2)
    this.nv1.clear()
    this.nw1 = 0
    this.nv2.clear()
    this.nw2 = 0
  }
}
