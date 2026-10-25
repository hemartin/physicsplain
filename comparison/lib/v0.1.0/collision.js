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

  apply () {
    const collisionCount = this.collisionPoints.length
    const originalDeltasX = []
    const originalDeltasY = []
    let iteration = 0
    let accumulatedImpulse = 0
    let previousAccumulatedImpulse = Number.MAX_VALUE
    do {
      if (accumulatedImpulse > 0) {
        previousAccumulatedImpulse = accumulatedImpulse
      }

      accumulatedImpulse = 0
      for (let j = 0; j < collisionCount; j++) {
        const collisionPoint = this.collisionPoints[j]
        const v1 = collisionPoint.collidingEntity.velocity
        const w1 = collisionPoint.collidingEntity.angularVelocity
        const v2 = collisionPoint.impactedEntity.velocity
        const w2 = collisionPoint.impactedEntity.angularVelocity

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

        const normalMass = collisionPoint.getNormalMass()

        // return new Vector(-f * vector.y, f * vector.x)

        // Vector delta = Vector.cross(r1, w1)
        let deltaX = -w1 * r1Y
        let deltaY = w1 * r1X

        // Vector t1 = Vector.cross(r2, w2)
        const t1X = -w2 * r2Y
        const t1Y = w2 * r2X

        // delta.substract(t1)
        deltaX -= t1X
        deltaY -= t1Y

        // delta.substract(v2)
        deltaX -= v2.x
        deltaY -= v2.y

        // delta.add(v1)
        deltaX += v1.x
        deltaY += v1.y

        if (iteration === 0) {
          // originalDeltas[j] = delta; // Vector.scale(delta, 0.9f)
          originalDeltasX[j] = deltaX * this.restitution
          originalDeltasY[j] = deltaY * this.restitution
        }

        let normalImpulse =
          (Vector.dot(
            originalDeltasX[j],
            originalDeltasY[j],
            collisionPoint.normalX,
            collisionPoint.normalY
          ) +
            Vector.dot(
              deltaX,
              deltaY,
              collisionPoint.normalX,
              collisionPoint.normalY
            )) *
          normalMass *
          -1

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
      }

      // apply all temp velocites
      for (let i = 0; i < collisionCount; i++) {
        this.collisionPoints[i].applyTempVelocities()
      }

      iteration++
    } while (
      accumulatedImpulse > 0.001 &&
      iteration < 50 &&
      accumulatedImpulse <= previousAccumulatedImpulse
    )
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
