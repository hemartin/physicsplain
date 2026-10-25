import { UnionFind } from './unionfind.js'

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
    // when the collision was detected, or push apart penetrating entities (Baumgarte), but
    // not both to avoid adding energy; correct at most 0.005 of penetration
    // to limit the push from deep or badly estimated contacts
    const targets = []
    for (let j = 0; j < collisionCount; j++) {
      const collisionPoint = this.collisionPoints[j]
      const bounce =
        -Math.min(collisionPoint.initialNormalVelocity, 0) * this.restitution
      const penetration = Math.max(collisionPoint.separation - 0.001, 0)
      const bias = (0.2 / timestep) * Math.min(penetration, 0.005)
      targets[j] = Math.max(bounce, bias)
    }

    // two collision points between the same entities are solved together
    // (block solver); solving them one after the other converges slowly if
    // they are close together relative to the entity size, e.g. a narrow box
    // landing on its short side, and leaves it spinning; it also makes the
    // result depend on their order, so mirrored scenes would drift apart
    const pairedWithNext = []
    for (let j = 0; j + 1 < collisionCount; j++) {
      pairedWithNext[j] =
        !pairedWithNext[j - 1] &&
        Collision.isPair(this.collisionPoints[j], this.collisionPoints[j + 1])
    }

    // sequential impulses: apply impulse of each collision point right away
    let iteration = 0
    let accumulatedImpulse = 0
    do {
      accumulatedImpulse = 0
      for (let j = 0; j < collisionCount; j++) {
        if (pairedWithNext[j]) {
          accumulatedImpulse += Collision.solvePair(
            this.collisionPoints[j],
            this.collisionPoints[j + 1],
            targets[j],
            targets[j + 1]
          )
          j++
          continue
        }

        const collisionPoint = this.collisionPoints[j]
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

        accumulatedImpulse += Math.abs(normalImpulse)
        collisionPoint.applyImpulse(normalImpulse)
      }

      iteration++
    } while (accumulatedImpulse > 0.000001 && iteration < 50)
  }

  // true if both points are between the same two entities, in either role
  // (corner of A in B and corner of B in A)
  static isPair (cp1, cp2) {
    return (
      (cp1.collidingEntity === cp2.collidingEntity &&
        cp1.impactedEntity === cp2.impactedEntity) ||
      (cp1.collidingEntity === cp2.impactedEntity &&
        cp1.impactedEntity === cp2.collidingEntity)
    )
  }

  /**
   * Solves two collision points together: finds accumulated impulses x1,
   * x2 >= 0 such that the normal velocities reach their targets, or exceed
   * them where an impulse is 0 (as in Box2D's block solver).
   *
   * @returns sum of absolute impulse changes
   */
  static solvePair (cp1, cp2, target1, target2) {
    const k11 = 1 / cp1.getNormalMass()
    const k22 = 1 / cp2.getNormalMass()
    const k12 = cp1.getCoupling(cp2)
    const a1 = cp1.accumulatedImpulse
    const a2 = cp2.accumulatedImpulse

    // points (almost) on top of each other, or pushing along (almost) the
    // same line, cannot be solved together: solve them as one point
    const det = k11 * k22 - k12 * k12
    if (!(k11 * k11 < 1000 * det)) {
      return Collision.solveMerged(cp1, cp2, k11, k22, k12, target1, target2)
    }

    // normal velocity minus target after impulses x: K * x + b
    const b1 = cp1.getNormalVelocity() - target1 - (k11 * a1 + k12 * a2)
    const b2 = cp2.getNormalVelocity() - target2 - (k12 * a1 + k22 * a2)

    // try both points pushing, then only one of them, then neither
    let x1 = a1
    let x2 = a2
    const both1 = -(k22 * b1 - k12 * b2) / det
    const both2 = -(k11 * b2 - k12 * b1) / det
    if (both1 >= 0 && both2 >= 0) {
      x1 = both1
      x2 = both2
    } else if (-b1 / k11 >= 0 && k12 * (-b1 / k11) + b2 >= 0) {
      x1 = -b1 / k11
      x2 = 0
    } else if (-b2 / k22 >= 0 && k12 * (-b2 / k22) + b1 >= 0) {
      x1 = 0
      x2 = -b2 / k22
    } else if (b1 >= 0 && b2 >= 0) {
      x1 = 0
      x2 = 0
    }

    cp1.accumulatedImpulse = x1
    cp2.accumulatedImpulse = x2
    cp1.applyImpulse(x1 - a1)
    cp2.applyImpulse(x2 - a2)
    return Math.abs(x1 - a1) + Math.abs(x2 - a2)
  }

  /**
   * Solves two collision points as one: both get half of the impulse, and
   * the mean normal velocity reaches the mean target. Unlike solving them
   * one after the other, the result does not depend on their order.
   *
   * @returns sum of absolute impulse changes
   */
  static solveMerged (cp1, cp2, k11, k22, k12, target1, target2) {
    // mean normal velocity change per unit impulse shared equally
    const k = (k11 + 2 * k12 + k22) / 4
    const a = cp1.accumulatedImpulse + cp2.accumulatedImpulse
    const meanVelocity =
      (cp1.getNormalVelocity() - target1 + cp2.getNormalVelocity() - target2) / 2
    const x = Math.max(a - meanVelocity / k, 0)

    cp1.accumulatedImpulse = x / 2
    cp2.accumulatedImpulse = x / 2
    cp1.applyImpulse((x - a) / 2)
    cp2.applyImpulse((x - a) / 2)
    return Math.abs(x - a)
  }

  static mergeCollisions (collisions) {
    // no need to merge if there is only one (or zero) collisions
    if (collisions.length <= 1) {
      return collisions
    }

    // find connected components using union-find algorithm
    const unionFind = new UnionFind()

    // build connected components (keyed by entity, ids may be missing or
    // duplicate)
    for (const collision of collisions) {
      const cp = collision.collisionPoints[0]
      unionFind.union(cp.collidingEntity, cp.impactedEntity)
    }

    // merge collision points of each component into a single collision
    const mergedCollisionMap = new Map()
    for (const collision of collisions) {
      const cp = collision.collisionPoints[0]
      const comp = unionFind.find(cp.collidingEntity)
      if (!mergedCollisionMap.has(comp)) {
        mergedCollisionMap.set(comp, collision)
      } else {
        mergedCollisionMap.get(comp).merge(collision)
      }
    }
    return [...mergedCollisionMap.values()]
  }
}
