/*
 * A collision point models exactly one point of collision between two entities.
 * 
 * @author Martin Hentschel, @hemasail
 */
function CollisionPoint(collidingEntity, impactedEntity,
        normal_x, normal_y, contactPoint_x, contactPoint_y, separation) {

    this.collidingEntity = collidingEntity;
    this.impactedEntity = impactedEntity;
    this.normal_x = normal_x;
    this.normal_y = normal_y;
    this.contactPoint_x = contactPoint_x;
    this.contactPoint_y = contactPoint_y;
    this.separation = separation;

    this.accumulatedImpulse = 0;
    this.nv1 = new Vector(0, 0);
    this.nw1 = 0;
    this.nv2 = new Vector(0, 0);
    this.nw2 = 0;
}

CollisionPoint.prototype.getNormalMass = function () {
    // Vector r1 = Vector.substract(collidingEntity.getOrigin(), contactPoint);
    var ceo = this.collidingEntity.origin;
    var r1_x = ceo.x - this.contactPoint_x;
    var r1_y = ceo.y - this.contactPoint_y;

    // Vector r2 = Vector.substract(impactedEntity.getOrigin(), contactPoint);
    var ieo = this.impactedEntity.origin;
    var r2_x = ieo.x - this.contactPoint_x;
    var r2_y = ieo.y - this.contactPoint_y;

    var cp1 = Vector_cross(r1_x, r1_y, this.normal_x, this.normal_y);
    cp1 *= cp1;
    var cp2 = Vector_cross(r2_x, r2_y, this.normal_x, this.normal_y);
    cp2 *= cp2;
    return 1 / (this.collidingEntity.invertedMass()
            + this.impactedEntity.invertedMass()
            + cp1 * this.collidingEntity.invertedInertia()
            + cp2 * this.impactedEntity.invertedInertia());
};

CollisionPoint.prototype.addTempVelocities = function (v1_x, v1_y, w1,
        v2_x, v2_y, w2) {
    this.nv1.x += v1_x;
    this.nv1.y += v1_y;
    this.nw1 += w1;
    this.nv2.x += v2_x;
    this.nv2.y += v2_y;
    this.nw2 += w2;
};

CollisionPoint.prototype.applyTempVelocities = function () {
    this.collidingEntity.addVelocity(this.nv1);
    this.collidingEntity.addAngularVelocity(this.nw1);
    this.impactedEntity.addVelocity(this.nv2);
    this.impactedEntity.addAngularVelocity(this.nw2);
    this.nv1.clear();
    this.nw1 = 0;
    this.nv2.clear();
    this.nw2 = 0;
};
