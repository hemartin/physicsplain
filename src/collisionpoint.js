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

  /**
   * @returns relative velocity of colliding entity to impacted entity at
   * contact point along normal, negative if entities move into each other
   */
  getNormalVelocity () {
    const v1 = this.collidingEntity.velocity
    const w1 = this.collidingEntity.angularVelocity
    const v2 = this.impactedEntity.velocity
    const w2 = this.impactedEntity.angularVelocity

    // Vector r1 = Vector.substract(contactPoint, collidingEntity.getOrigin())
    const ceo = this.collidingEntity.origin
    const r1X = this.contactPointX - ceo.x
    const r1Y = this.contactPointY - ceo.y

    // Vector r2 = Vector.substract(contactPoint, impactedEntity.getOrigin())
    const ieo = this.impactedEntity.origin
    const r2X = this.contactPointX - ieo.x
    const r2Y = this.contactPointY - ieo.y

    // Vector delta = v1 + cross(w1, r1) - v2 - cross(w2, r2)
    const deltaX = v1.x - w1 * r1Y - v2.x + w2 * r2Y
    const deltaY = v1.y + w1 * r1X - v2.y - w2 * r2X
    return Vector.dot(deltaX, deltaY, this.normalX, this.normalY)
  }

  /**
   * @returns change of the normal velocity at this point per unit impulse
   * along the (same) normal at the other point, between the same entities
   */
  getCoupling (other) {
    // Vector r1 = Vector.substract(contactPoint, collidingEntity.getOrigin())
    const ceo = this.collidingEntity.origin
    const rn1 = Vector.cross(this.contactPointX - ceo.x, this.contactPointY - ceo.y, this.normalX, this.normalY)
    const otherRn1 = Vector.cross(other.contactPointX - ceo.x, other.contactPointY - ceo.y, this.normalX, this.normalY)

    // Vector r2 = Vector.substract(contactPoint, impactedEntity.getOrigin())
    const ieo = this.impactedEntity.origin
    const rn2 = Vector.cross(this.contactPointX - ieo.x, this.contactPointY - ieo.y, this.normalX, this.normalY)
    const otherRn2 = Vector.cross(other.contactPointX - ieo.x, other.contactPointY - ieo.y, this.normalX, this.normalY)

    return (
      this.collidingEntity.invertedMass() +
      this.impactedEntity.invertedMass() +
      rn1 * otherRn1 * this.collidingEntity.invertedInertia() +
      rn2 * otherRn2 * this.impactedEntity.invertedInertia()
    )
  }

  /**
   * Applies an impulse along the normal at this point: pushes colliding
   * entity along the normal, impacted entity against it.
   */
  applyImpulse (normalImpulse) {
    // Vector r1 = Vector.substract(contactPoint, collidingEntity.getOrigin())
    const ceo = this.collidingEntity.origin
    const r1X = this.contactPointX - ceo.x
    const r1Y = this.contactPointY - ceo.y

    // Vector r2 = Vector.substract(contactPoint, impactedEntity.getOrigin())
    const ieo = this.impactedEntity.origin
    const r2X = this.contactPointX - ieo.x
    const r2Y = this.contactPointY - ieo.y

    // Vector impulse = Vector.scale(normal, normalImpulse)
    const impulseX = this.normalX * normalImpulse
    const impulseY = this.normalY * normalImpulse

    const ceIm = this.collidingEntity.invertedMass()
    const nw1 =
      this.collidingEntity.invertedInertia() *
      Vector.cross(r1X, r1Y, impulseX, impulseY)
    const ieIm = this.impactedEntity.invertedMass()
    const nw2 =
      -this.impactedEntity.invertedInertia() *
      Vector.cross(r2X, r2Y, impulseX, impulseY)
    this.addTempVelocities(
      impulseX * ceIm,
      impulseY * ceIm,
      nw1,
      -impulseX * ieIm,
      -impulseY * ieIm,
      nw2
    )
    this.applyTempVelocities()
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
