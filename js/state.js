/*
 * The state contains all entities and advances them, including resolving
 * collisions.
 * 
 * The state also contains constants specific to bodies and collisions. This is
 * why we pass the state on to bodies and collisions, so that they can access
 * these constants.
 * 
 * @author Martin Hentschel, @hemasail
 */
function State() {
    this.movableBodies = [];
    this.fixedBodies = [];
    this.nextBodyId = 0;

    // constants
    this.RESTITUTION = 1; // 1 = elastic collision, <1 inelastic collision
    this.LATERAL_FRICTION = 1;
    this.ROTATIONAL_FRICTION = 3;
}

State.prototype.advance = function (timestep) {
    // check for collisions
    var collisions = this.collide(timestep);

    // apply forces
    this.movableBodies.forEach(function (body) {
        body.applyForces(timestep);
    });

    // apply impulses
    collisions.forEach(function (collision) {
        collision.apply();
    });

    // advance body
    this.movableBodies.forEach(function (body) {
        body.advance(timestep);
    });
};

State.prototype.collide = function (timestep) {
    var collisions = [];

    // collide movable bodies with each other
    var movableBodiesCount = this.movableBodies.length;
    for (var i = 0; i < movableBodiesCount - 1; i++) {
        for (var j = i + 1; j < movableBodiesCount; j++) {
            var newCollision = Body_collide(this, this.movableBodies[i],
                    this.movableBodies[j], timestep);
            if (newCollision !== null) {
                collisions.push(newCollision);
            }
        }
    }

    // collide each movable body with all fixed bodies
    var fixedBodiesCount = this.fixedBodies.length;
    for (var i = 0; i < movableBodiesCount; i++) {
        for (var j = 0; j < fixedBodiesCount; j++) {
            var newCollision = Body_collide(this, this.movableBodies[i],
                    this.fixedBodies[j], timestep);
            if (newCollision !== null) {
                collisions.push(newCollision);
            }
        }
    }

    return Collision_mergeCollisions(collisions);
};
