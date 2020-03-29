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
class Collision {
    constructor(restitution) {
        this.restitution = restitution
        this.collisionPoints = []
    }

    merge(collision) {
        for (const cp of collision.collisionPoints) {
            this.collisionPoints.push(cp)
        }
    }

    apply() {
        const collisionCount = this.collisionPoints.length
        const originalDeltas_x = []
        const originalDeltas_y = []
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
                const r1_x = collisionPoint.contactPoint_x - ceo.x
                const r1_y = collisionPoint.contactPoint_y - ceo.y

                // Vector r2 = Vector.substract(collisionPoint.contactPoint,
                // collisionPoint.impactedEntity.getOrigin())
                const ieo = collisionPoint.impactedEntity.origin
                const r2_x = collisionPoint.contactPoint_x - ieo.x
                const r2_y = collisionPoint.contactPoint_y - ieo.y

                const normalMass = collisionPoint.getNormalMass()

                // return new Vector(-f * vector.y, f * vector.x)

                // Vector delta = Vector.cross(r1, w1)
                let delta_x = -w1 * r1_y
                let delta_y = w1 * r1_x

                // Vector t1 = Vector.cross(r2, w2)
                const t1_x = -w2 * r2_y
                const t1_y = w2 * r2_x

                // delta.substract(t1)
                delta_x -= t1_x
                delta_y -= t1_y

                // delta.substract(v2)
                delta_x -= v2.x
                delta_y -= v2.y

                // delta.add(v1)
                delta_x += v1.x
                delta_y += v1.y

                if (iteration === 0) {
                    // originalDeltas[j] = delta; // Vector.scale(delta, 0.9f)
                    originalDeltas_x[j] = delta_x * this.restitution
                    originalDeltas_y[j] = delta_y * this.restitution
                }

                let normalImpulse = -(Vector.dot(originalDeltas_x[j],
                    originalDeltas_y[j], collisionPoint.normal_x,
                    collisionPoint.normal_y)
                    + Vector.dot(delta_x, delta_y, collisionPoint.normal_x,
                        collisionPoint.normal_y))
                    * normalMass

                // clamp
                const tmp = collisionPoint.accumulatedImpulse
                collisionPoint.accumulatedImpulse = Math.max(
                    collisionPoint.accumulatedImpulse + normalImpulse, 0)
                normalImpulse = collisionPoint.accumulatedImpulse - tmp
                //console.log("impulse: " + normalImpulse)

                accumulatedImpulse += Math.abs(normalImpulse)

                // Vector impulse = Vector.scale(collisionPoint.normal,
                // normalImpulse)
                const impulse_x = collisionPoint.normal_x * normalImpulse
                const impulse_y = collisionPoint.normal_y * normalImpulse

                // Vector nv1 = Vector.scale(impulse,
                // collisionPoint.collidingEntity.invertedMass())
                const ce_im = collisionPoint.collidingEntity.invertedMass()
                const nv1_x = impulse_x * ce_im
                const nv1_y = impulse_y * ce_im

                const nw1 = collisionPoint.collidingEntity.invertedInertia()
                    * Vector.cross(r1_x, r1_y, impulse_x, impulse_y)

                // Vector nv2 = Vector.scale(impulse,
                // collisionPoint.impactedEntity.invertedMass())
                const ie_im = collisionPoint.impactedEntity.invertedMass()
                let nv2_x = impulse_x * ie_im
                let nv2_y = impulse_y * ie_im

                // nv2.negate()
                nv2_x = -nv2_x
                nv2_y = -nv2_y

                const nw2 = -collisionPoint.impactedEntity.invertedInertia()
                    * Vector.cross(r2_x, r2_y, impulse_x, impulse_y)
                collisionPoint.addTempVelocities(nv1_x, nv1_y, nw1, nv2_x, nv2_y,
                    nw2)
            }

            // apply all temp velocites
            for (let i = 0; i < collisionCount; i++) {
                this.collisionPoints[i].applyTempVelocities()
            }

            iteration++
        } while (collisionCount > 1 && accumulatedImpulse > 0.001 && iteration < 50
            && accumulatedImpulse <= previousAccumulatedImpulse)
    }

    static mergeCollisions(collisions) {
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
            }
            else {
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

export { Collision }
