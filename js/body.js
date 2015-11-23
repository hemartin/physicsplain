/*
 * Rigid body.
 * 
 * Heavily inspired by Erin Catto's GDC slides and his Box2D library. Also
 * inspired by the demos of myphysicslab.com.
 * 
 * @author Martin Hentschel, @hemasail
 */

// static constants
var Body_INFINITE_MASS = -1;
var Body_EPS = 1e-5;

/*
 * Constructs a rigid body using default values. Call finalize after modifying
 * any values to compute the body's inertia and the position of corners.
 */
function Body(state) {
    this.state = state;
    this.id = state.nextBodyId++;
    this.origin = new Vector(0, 0);
    this.angle = 0;
    this.dimension = new Vector(0.1, 0.1);
    this.mass = 1;
    this.velocity = new Vector(0, 0);
    this.angularVelocity = 0;
    
    // force that drives body forward
    this.force = new Vector(0, 0);
    
    // remember to call finalize()
    this.cx = [0, 0, 0, 0];
    this.cy = [0, 0, 0, 0];
}

/*
 * FixedBody inherits from Body. The only difference being that its mass is
 * infinite and so it will never move if impacted by a collision.
 */
function FixedBody(state) {
    Body.call(this, state);
    this.setMass(Body_INFINITE_MASS);
}
FixedBody.prototype = Object.create(Body.prototype);
FixedBody.prototype.constructor = FixedBody;

/*
 * Finalizes the constructino of body by calculating its inertia, inverted mass,
 * and the location of its corners.
 */
Body.prototype.finalize = function() {
    this.inertia = (this.dimension.x * this.dimension.x + this.dimension.y * this.dimension.y)
            * this.mass / 12;
    this.calculateCorners();
    return this;
};

Body.prototype.setOrigin = function(x, y) {
    this.origin.x = x;
    this.origin.y = y;
    return this;
};

Body.prototype.setAngle = function(a) {
    this.angle = a;
    return this;
};

Body.prototype.setDimension = function(x, y) {
    this.dimension.x = x;
    this.dimension.y = y;
    return this;
};

Body.prototype.setMass = function(m) {
    this.mass = m;
    return this;
};

Body.prototype.setForce = function(x, y) {
    this.force.x = x;
    this.force.y = y;
    return this;
};

Body.prototype.advance = function (timestep) {
    // origin.add(Vector.scale(velocity, timestep));
    this.origin.x += this.velocity.x * timestep;
    this.origin.y += this.velocity.y * timestep;
    
    this.angle += this.angularVelocity * timestep;
    if (this.angle > Math.Pi) {
        this.angle -= 2 * Math.Pi;
    }
    else if (this.angle < -Math.Pi) {
        this.angle += 2 * Math.Pi;
    }
    
    this.calculateCorners();
};

Body.prototype.applyForces = function (timestep) {
    // apply force
    this.velocity.x += this.force.x * timestep * this.invertedMass();
    this.velocity.y += this.force.y * timestep * this.invertedMass();

    // apply friction
    this.velocity.scale(Math.max(0, 1 - timestep * this.state.LATERAL_FRICTION));
    this.angularVelocity *= Math.max(0, 1 - timestep * this.state.ROTATIONAL_FRICTION);
};

Body.prototype.calculateCorners = function () {
    var direction_y = Math.sin(this.angle);
    var direction_x = Math.cos(this.angle);

    // Vector tangent = Vector.tangent(direction);
    var tangent_x = -direction_y;
    var tangent_y = direction_x;

    this.cx[0] = this.origin.x + direction_x * this.dimension.x * 0.5 + tangent_x * this.dimension.y * 0.5;
    this.cy[0] = this.origin.y + direction_y * this.dimension.x * 0.5 + tangent_y * this.dimension.y * 0.5;
    this.cx[1] = this.origin.x - direction_x * this.dimension.x * 0.5 + tangent_x * this.dimension.y * 0.5;
    this.cy[1] = this.origin.y - direction_y * this.dimension.x * 0.5 + tangent_y * this.dimension.y * 0.5;
    this.cx[2] = this.origin.x - direction_x * this.dimension.x * 0.5 - tangent_x * this.dimension.y * 0.5;
    this.cy[2] = this.origin.y - direction_y * this.dimension.x * 0.5 - tangent_y * this.dimension.y * 0.5;
    this.cx[3] = this.origin.x + direction_x * this.dimension.x * 0.5 - tangent_x * this.dimension.y * 0.5;
    this.cy[3] = this.origin.y + direction_y * this.dimension.x * 0.5 - tangent_y * this.dimension.y * 0.5;
};

Body.prototype.invertedMass = function () {
    if (this.isFixedBody()) {
        return 0;
    }
    return 1 / this.mass;
};

Body.prototype.invertedInertia = function () {
    if (this.isFixedBody() || this.inertia === 0) {
        return 0;
    }
    return 1 / this.inertia;
};

Body.prototype.isFixedBody = function () {
    return this.mass === Body_INFINITE_MASS;
};

Body.prototype.addVelocity = function (velocity) {
    this.velocity.add(velocity);
};

Body.prototype.addAngularVelocity = function (angularVelocity) {
    this.angularVelocity += angularVelocity;
};

Body.prototype.collideSingleCorner = function (collision, collidingBody,
        corner, timestep) {
    // Vector vertex = collidingBody.vertex(corner);
    var vertex_x = collidingBody.cx[corner];
    var vertex_y = collidingBody.cy[corner];

    // this center as origin
    // Vector q = Vector.substract(vertex, origin);
    var x = vertex_x - this.origin.x;
    var y = vertex_y - this.origin.y;

    // q.rotate(-angle);
    var cos = Math.cos(-this.angle);
    var sin = Math.sin(-this.angle);
    var tx = x * cos - y * sin;
    var ty = x * sin + y * cos;
    x = tx;
    y = ty;

    // check if within bounds
    var halflength = this.dimension.x * 0.5;
    var halfwidth = this.dimension.y * 0.5;
    if (x >= -halflength - Body_EPS && x <= halflength + Body_EPS
            && y >= -halfwidth - Body_EPS && y <= halfwidth + Body_EPS) {
        // relative velocity
        var v1 = collidingBody.velocity;
        var w1 = collidingBody.angularVelocity;
        var v2 = this.velocity;
        var w2 = this.angularVelocity;

        // Vector r1 = Vector.substract(vertex, collidingBody.getOrigin());
        var r1_x = vertex_x - collidingBody.origin.x;
        var r1_y = vertex_y - collidingBody.origin.y;

        // Vector r2 = Vector.substract(vertex, getOrigin());
        var r2_x = vertex_x - this.origin.x;
        var r2_y = vertex_y - this.origin.y;

        // Vector relativeVelocity = Vector.cross(r1, w1);
        var relativeVelocity_x = -w1 * r1_y;
        var relativeVelocity_y = w1 * r1_x;

        // Vector t1 = Vector.cross(r2, w2);
        var t1_x = -w2 * r2_y;
        var t1_y = w2 * r2_x;

        // relativeVelocity.substract(t1);
        relativeVelocity_x -= t1_x;
        relativeVelocity_y -= t1_y;

        // relativeVelocity.substract(v2);
        relativeVelocity_x -= v2.x;
        relativeVelocity_y -= v2.y;

        // relativeVelocity.add(v1);
        relativeVelocity_x += v1.x;
        relativeVelocity_y += v1.y;

        // Vector relativeMove = Vector.scale(relativeVelocity, timestep);
        var relativeMove_x = relativeVelocity_x * timestep;
        var relativeMove_y = relativeVelocity_y * timestep;

        // relativeMove.rotate(-getAngle());
        var cos1 = Math.cos(-this.angle);
        var sin1 = Math.sin(-this.angle);
        var tx1 = relativeMove_x * cos1 - relativeMove_y * sin1;
        var ty1 = relativeMove_x * sin1 + relativeMove_y * cos1;
        relativeMove_x = tx1;
        relativeMove_y = ty1;

        // get edge closest to point
        // top edge
        var separation = halfwidth - y;
        var minSeparation = separation;
        var maxEdge = 0;
        var minEdge = 0;
        if (separation < -relativeMove_y) {
            maxEdge = 1;
        }

        // left edge
        separation = halflength + x;
        if (separation < relativeMove_x) {
            maxEdge |= 2;
        }

        if (separation < minSeparation) {
            minSeparation = separation;
            minEdge = 1;
        }

        // bottom edge
        separation = halfwidth + y;
        if (separation < relativeMove_y) {
            maxEdge |= 4;
        }

        if (separation < minSeparation) {
            minSeparation = separation;
            minEdge = 2;
        }

        // right edge
        separation = halflength - x;
        if (separation < -relativeMove_x) {
            maxEdge |= 8;
        }

        if (separation < minSeparation) {
            minSeparation = separation;
            minEdge = 3;
        }

        // create collision point
        var normal_x;
        var normal_y;
        if (maxEdge > 0) {
            var count = 0;
            // normal = new Vector(0, 0);
            normal_x = 0;
            normal_y = 0;
            for (var i = 0; i < 4; i++) {
                if ((maxEdge & (1 << i)) > 0) {
                    // normal.add(edgeNormal(i));
                    var impactedCorner1 = i;
                    var impactedCorner2 = (impactedCorner1 === 3) ? 0 : impactedCorner1 + 1;
                    var en_x = this.cx[impactedCorner1] - this.cx[impactedCorner2];
                    var en_y = this.cy[impactedCorner1] - this.cy[impactedCorner2];
                    var div = 1 / Vector_length(en_x, en_y);
                    en_x *= div;
                    en_y *= div;
                    var tmp = en_x;
                    en_x = -en_y;
                    en_y = tmp;
                    normal_x += en_x;
                    normal_y += en_y;
                    count++;
                }
            }

            if (count > 1) {
                // normal.scale(1f / normal.dimension.x());
                var normal_len = Vector_length(normal_x, normal_y);
                normal_x /= normal_len;
                normal_y /= normal_len;
            }
        } else {
            // normal = edgeNormal(minEdge);
            var impactedCorner1 = minEdge;
            var impactedCorner2 = (impactedCorner1 === 3) ? 0 : impactedCorner1 + 1;
            var en_x = this.cx[impactedCorner1] - this.cx[impactedCorner2];
            var en_y = this.cy[impactedCorner1] - this.cy[impactedCorner2];
            var div = 1 / Vector_length(en_x, en_y);
            en_x *= div;
            en_y *= div;
            var tmp = en_x;
            en_x = -en_y;
            en_y = tmp;
            normal_x = en_x;
            normal_y = en_y;
        }

        var collisionPoint = new CollisionPoint(collidingBody, this, normal_x,
                normal_y, vertex_x, vertex_y, minSeparation);
        collision.collisionPoints.push(collisionPoint);
    }
};

// static methods
function Body_collide(state, body1, body2, timestep) {
    var collision = new Collision(state);    
    Body_collideAllCorners(collision, body1, body2, timestep);
    
    if (collision.collisionPoints.length < 2) {
        Body_collideAllCorners(collision, body2, body1, timestep);
    }
    
    if (collision.collisionPoints.length === 0) {
        return null;
    }
    return collision;
}

function Body_collideAllCorners(collision, collidingBody, impactedBody,
        timestep) {
    for (var corner = 0; corner < 4; corner++) {
        impactedBody.collideSingleCorner(collision, collidingBody, corner, timestep);
    }
}
