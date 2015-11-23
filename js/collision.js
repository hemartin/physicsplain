/*
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
 * @author Martin Hentschel, @hemasail
 */

function Collision(state) {
    this.state = state;
    this.collisionPoints = [];
}

Collision.prototype.merge = function (collision) {
    this.collisionPoints.addAll(collision.collisionPoints);
};

Collision.prototype.apply = function () {
    var collisionCount = this.collisionPoints.length;
    var originalDeltas_x = [];
    var originalDeltas_y = [];
    var iteration = 0;
    var accumulatedImpulse = 0;
    var previousAccumulatedImpulse = Number.MAX_VALUE;
    do {
        if (accumulatedImpulse > 0) {
            previousAccumulatedImpulse = accumulatedImpulse;
        }

        accumulatedImpulse = 0;
        for (var j = 0; j < collisionCount; j++) {
            var collisionPoint = this.collisionPoints[j];
            var v1 = collisionPoint.collidingEntity.velocity;
            var w1 = collisionPoint.collidingEntity.angularVelocity;
            var v2 = collisionPoint.impactedEntity.velocity;
            var w2 = collisionPoint.impactedEntity.angularVelocity;

            // Vector r1 = Vector.substract(collisionPoint.contactPoint,
            // collisionPoint.collidingEntity.getOrigin());
            var ceo = collisionPoint.collidingEntity.origin;
            var r1_x = collisionPoint.contactPoint_x - ceo.x;
            var r1_y = collisionPoint.contactPoint_y - ceo.y;

            // Vector r2 = Vector.substract(collisionPoint.contactPoint,
            // collisionPoint.impactedEntity.getOrigin());
            var ieo = collisionPoint.impactedEntity.origin;
            var r2_x = collisionPoint.contactPoint_x - ieo.x;
            var r2_y = collisionPoint.contactPoint_y - ieo.y;

            var normalMass = collisionPoint.getNormalMass();

            // return new Vector(-f * vector.y, f * vector.x);

            // Vector delta = Vector.cross(r1, w1);
            var delta_x = -w1 * r1_y;
            var delta_y = w1 * r1_x;

            // Vector t1 = Vector.cross(r2, w2);
            var t1_x = -w2 * r2_y;
            var t1_y = w2 * r2_x;

            // delta.substract(t1);
            delta_x -= t1_x;
            delta_y -= t1_y;

            // delta.substract(v2);
            delta_x -= v2.x;
            delta_y -= v2.y;

            // delta.add(v1);
            delta_x += v1.x;
            delta_y += v1.y;

            if (iteration === 0) {
                // originalDeltas[j] = delta; // Vector.scale(delta, 0.9f);
                originalDeltas_x[j] = delta_x * this.state.RESTITUTION;
                originalDeltas_y[j] = delta_y * this.state.RESTITUTION;
            }

            var normalImpulse = -(Vector_dot(originalDeltas_x[j],
                        originalDeltas_y[j], collisionPoint.normal_x,
                        collisionPoint.normal_y)
                    + Vector_dot(delta_x, delta_y, collisionPoint.normal_x,
                        collisionPoint.normal_y))
                    * normalMass;

            // clamp
            var tmp = collisionPoint.accumulatedImpulse;
            collisionPoint.accumulatedImpulse = Math.max(
                    collisionPoint.accumulatedImpulse + normalImpulse, 0);
            normalImpulse = collisionPoint.accumulatedImpulse - tmp;
            //console.log("impulse: " + normalImpulse);

            accumulatedImpulse += Math.abs(normalImpulse);

            // Vector impulse = Vector.scale(collisionPoint.normal,
            // normalImpulse);
            var impulse_x = collisionPoint.normal_x * normalImpulse;
            var impulse_y = collisionPoint.normal_y * normalImpulse;

            // Vector nv1 = Vector.scale(impulse,
            // collisionPoint.collidingEntity.invertedMass());
            var ce_im = collisionPoint.collidingEntity.invertedMass();
            var nv1_x = impulse_x * ce_im;
            var nv1_y = impulse_y * ce_im;

            var nw1 = collisionPoint.collidingEntity.invertedInertia()
                    * Vector_cross(r1_x, r1_y, impulse_x, impulse_y);

            // Vector nv2 = Vector.scale(impulse,
            // collisionPoint.impactedEntity.invertedMass());
            var ie_im = collisionPoint.impactedEntity.invertedMass();
            var nv2_x = impulse_x * ie_im;
            var nv2_y = impulse_y * ie_im;

            // nv2.negate();
            nv2_x = -nv2_x;
            nv2_y = -nv2_y;

            var nw2 = -collisionPoint.impactedEntity.invertedInertia()
                    * Vector_cross(r2_x, r2_y, impulse_x, impulse_y);
            collisionPoint.addTempVelocities(nv1_x, nv1_y, nw1, nv2_x, nv2_y,
                    nw2);
        }

        // apply all temp velocites
        for (var i = 0; i < collisionCount; i++) {
            this.collisionPoints[i].applyTempVelocities();
        }

        iteration++;
    } while (collisionCount > 1 && accumulatedImpulse > 0.001 && iteration < 50
            && accumulatedImpulse <= previousAccumulatedImpulse);
};

function Collision_mergeCollisions (collisions) {
    // no need to merge if there is only one (or zero) collisions
    if (collisions.length <= 1) {
        return collisions;
    }
    
    // find connected components using union-find algorithm
    var unionFind = new UnionFind();
    
    // build connected components
    collisions.forEach(function (collision) {
        var cp = collision.collisionPoints[0];
        unionFind.union(cp.collidingEntity.id, cp.impactedEntity.id);
    });
    
    // merge collision points of each component into a single collision
    var mergedCollisionMap = [];
    collisions.forEach(function (collision) {
        var cp = collision.collisionPoints[0];
        var compId = unionFind.find(cp.collidingEntity.id);
        if (mergedCollisionMap[compId] === undefined) {
            mergedCollisionMap[compId] = collision;
        }
        else {
            mergedCollisionMap[compId].merge(collision);
        }
    });
    
    // un-sparse map
    var mergedCollisions = [];
    mergedCollisionMap.forEach(function (collision) {
        mergedCollisions.push(collision);
    });
    return mergedCollisions;
}
