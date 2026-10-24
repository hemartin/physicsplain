import { UnionFind } from './unionfind.js'
import { Vector } from './vector.js'

/**
 * A collision contains one or more collision points.
 *
 * Before merging collisions, a collision contains all collision points between
 * two entities. After merging collisions, a collision contains all collision
 * points of connected entities.
 *
 * For example, if the following bodies collide:
 *   A <-> B
 *   B <-> C
 *   D <-> E
 *
 * We compute three collisions at first, and end up with two collisions after
 * merging:
 *   Collision 1: A <-> B <-> C
 *   Collision 2: D <-> E
 *
 * Collision.apply() resolves all collisions by applying appropriate impulses
 * to all connected entities.
 *
 * @author Martin Hentschel
 */
export class Collision {
  constructor (restitution) {
    this.restitution = restitution
    this.collisionPoints = []
  }

  merge (collision) {
    for (const cp of collision.collisionPoints) {
      this.collisionPoints.push(cp)
    }
  }

  apply (timestep) {
    const collisionCount = this.collisionPoints.length

    // target velocity along normal: bounce based on the relative velocity
    // before solving, or push apart penetrating entities (Baumgarte), but
    // not both to avoid adding energy
    const targets = []
    for (let j = 0; j < collisionCount; j++) {
      const collisionPoint = this.collisionPoints[j]
      const bounce =
        -Math.min(collisionPoint.getNormalVelocity(), 0) * this.restitution
      const bias =
        (0.2 / timestep) * Math.max(collisionPoint.separation - 0.001, 0)
      targets[j] = Math.max(bounce, bias)
    }

    // sequential impulses: apply impulse of each collision point right away
    let iteration = 0
    let accumulatedImpulse = 0
    do {
      accumulatedImpulse = 0
      for (let j = 0; j < collisionCount; j++) {
        const collisionPoint = this.collisionPoints[j]

        // Vector r1 = Vector.substract(collisionPoint.contactPoint,
        // collisionPoint.collidingEntity.getOrigin())
        const ceo = collisionPoint.collidingEntity.origin
        const r1X = collisionPoint.contactPointX - ceo.x
        const r1Y = collisionPoint.contactPointY - ceo.y

        // Vector r2 = Vector.substract(collisionPoint.contactPoint,
        // collisionPoint.impactedEntity.getOrigin())
        const ieo = collisionPoint.impactedEntity.origin
        const r2X = collisionPoint.contactPointX - ieo.x
        const r2Y = collisionPoint.contactPointY - ieo.y

        let normalImpulse =
          (targets[j] - collisionPoint.getNormalVelocity()) *
          collisionPoint.getNormalMass()

        // clamp
        const tmp = collisionPoint.accumulatedImpulse
        collisionPoint.accumulatedImpulse = Math.max(
          collisionPoint.accumulatedImpulse + normalImpulse,
          0
        )
        normalImpulse = collisionPoint.accumulatedImpulse - tmp
        // console.log("impulse: " + normalImpulse)

        accumulatedImpulse += Math.abs(normalImpulse)

        // Vector impulse = Vector.scale(collisionPoint.normal,
        // normalImpulse)
        const impulseX = collisionPoint.normalX * normalImpulse
        const impulseY = collisionPoint.normalY * normalImpulse

        // Vector nv1 = Vector.scale(impulse,
        // collisionPoint.collidingEntity.invertedMass())
        const ceIm = collisionPoint.collidingEntity.invertedMass()
        const nv1X = impulseX * ceIm
        const nv1Y = impulseY * ceIm

        const nw1 =
          collisionPoint.collidingEntity.invertedInertia() *
          Vector.cross(r1X, r1Y, impulseX, impulseY)

        // Vector nv2 = Vector.scale(impulse,
        // collisionPoint.impactedEntity.invertedMass())
        const ieIm = collisionPoint.impactedEntity.invertedMass()
        let nv2X = impulseX * ieIm
        let nv2Y = impulseY * ieIm

        // nv2.negate()
        nv2X = -nv2X
        nv2Y = -nv2Y

        const nw2 =
          -collisionPoint.impactedEntity.invertedInertia() *
          Vector.cross(r2X, r2Y, impulseX, impulseY)
        collisionPoint.addTempVelocities(nv1X, nv1Y, nw1, nv2X, nv2Y, nw2)
        collisionPoint.applyTempVelocities()
      }

      iteration++
    } while (accumulatedImpulse > 0.000001 && iteration < 50)
  }

  static mergeCollisions (collisions) {
    // no need to merge if there is only one (or zero) collisions
    if (collisions.length <= 1) {
      return collisions
    }

    // find connected components using union-find algorithm
    const unionFind = new UnionFind()

    // build connected components
    for (const collision of collisions) {
      const cp = collision.collisionPoints[0]
      unionFind.union(cp.collidingEntity.id, cp.impactedEntity.id)
    }

    // merge collision points of each component into a single collision
    const mergedCollisionMap = []
    for (const collision of collisions) {
      const cp = collision.collisionPoints[0]
      const compId = unionFind.find(cp.collidingEntity.id)
      if (mergedCollisionMap[compId] === undefined) {
        mergedCollisionMap[compId] = collision
      } else {
        mergedCollisionMap[compId].merge(collision)
      }
    }

    // un-sparse map
    const mergedCollisions = []
    for (const compId in mergedCollisionMap) {
      mergedCollisions.push(mergedCollisionMap[compId])
    }
    return mergedCollisions
  }
}
