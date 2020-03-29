/**
 * Rigid body.
 * 
 * Heavily inspired by Erin Catto's GDC slides and his Box2D library. Also
 * inspired by the demos of myphysicslab.com.
 * 
 * @author Martin Hentschel
 */

const Body_INFINITE_MASS = -1
const Body_EPS = 1e-5

/*
 * Constructs a rigid body using default values. Call finalize after modifying
 * any values to compute the body's inertia and the position of corners.
 */
class Body {

    constructor(id) {
        this.id = id
        this.origin = new Vector(0, 0)
        this.angle = 0
        this.dimension = new Vector(0.1, 0.1)
        this.mass = 1
        this.velocity = new Vector(0, 0)
        this.angularVelocity = 0

        this.lateralFriction = 1;
        this.rotationalFriction = 1;

        // force that drives body forward
        this.force = new Vector(0, 0)

        // remember to call finalize()
        this.cx = [0, 0, 0, 0]
        this.cy = [0, 0, 0, 0]
    }

    /*
     * Finalizes the construction of body by calculating its inertia, inverted mass,
     * and the location of its corners.
     */
    finalize() {
        this.inertia = (this.dimension.x * this.dimension.x + this.dimension.y * this.dimension.y) * this.mass / 12
        this.calculateCorners()
        return this
    }

    setOrigin(x, y) {
        this.origin.x = x
        this.origin.y = y
        return this
    }

    setAngle(a) {
        this.angle = a
        return this
    }

    setDimension(x, y) {
        this.dimension.x = x
        this.dimension.y = y
        return this
    }

    setMass(m) {
        this.mass = m
        return this
    }

    setForce(x, y) {
        this.force.x = x
        this.force.y = y
        return this
    }

    advance(timestep) {
        // origin.add(Vector.scale(velocity, timestep))
        this.origin.x += this.velocity.x * timestep
        this.origin.y += this.velocity.y * timestep

        this.angle += this.angularVelocity * timestep
        if (this.angle > Math.Pi) {
            this.angle -= 2 * Math.Pi
        }
        else if (this.angle < -Math.Pi) {
            this.angle += 2 * Math.Pi
        }

        this.calculateCorners()
    }

    applyForces(timestep) {
        // apply force
        this.velocity.x += this.force.x * timestep * this.invertedMass()
        this.velocity.y += this.force.y * timestep * this.invertedMass()

        // apply friction
        this.velocity.scale(Math.max(0, 1 - timestep * this.lateralFriction))
        this.angularVelocity *= Math.max(0, 1 - timestep * this.rotationalFriction)
    }

    calculateCorners() {
        const direction_y = Math.sin(this.angle)
        const direction_x = Math.cos(this.angle)

        // Vector tangent = Vector.tangent(direction)
        const tangent_x = -direction_y
        const tangent_y = direction_x

        this.cx[0] = this.origin.x + direction_x * this.dimension.x * 0.5 + tangent_x * this.dimension.y * 0.5
        this.cy[0] = this.origin.y + direction_y * this.dimension.x * 0.5 + tangent_y * this.dimension.y * 0.5
        this.cx[1] = this.origin.x - direction_x * this.dimension.x * 0.5 + tangent_x * this.dimension.y * 0.5
        this.cy[1] = this.origin.y - direction_y * this.dimension.x * 0.5 + tangent_y * this.dimension.y * 0.5
        this.cx[2] = this.origin.x - direction_x * this.dimension.x * 0.5 - tangent_x * this.dimension.y * 0.5
        this.cy[2] = this.origin.y - direction_y * this.dimension.x * 0.5 - tangent_y * this.dimension.y * 0.5
        this.cx[3] = this.origin.x + direction_x * this.dimension.x * 0.5 - tangent_x * this.dimension.y * 0.5
        this.cy[3] = this.origin.y + direction_y * this.dimension.x * 0.5 - tangent_y * this.dimension.y * 0.5
    }

    invertedMass() {
        if (this.isFixedBody()) {
            return 0
        }
        return 1 / this.mass
    }

    invertedInertia() {
        if (this.isFixedBody() || this.inertia === 0) {
            return 0
        }
        return 1 / this.inertia
    }

    isFixedBody() {
        return this.mass === Body_INFINITE_MASS
    }

    addVelocity(velocity) {
        this.velocity.add(velocity)
    }

    addAngularVelocity(angularVelocity) {
        this.angularVelocity += angularVelocity
    }

    collideSingleCorner(collision, collidingBody, corner, timestep) {
        // Vector vertex = collidingBody.vertex(corner)
        const vertex_x = collidingBody.cx[corner]
        const vertex_y = collidingBody.cy[corner]

        // this center as origin
        // Vector q = Vector.substract(vertex, origin)
        let x = vertex_x - this.origin.x
        let y = vertex_y - this.origin.y

        // q.rotate(-angle)
        const cos = Math.cos(-this.angle)
        const sin = Math.sin(-this.angle)
        const tx = x * cos - y * sin
        const ty = x * sin + y * cos
        x = tx
        y = ty

        // check if within bounds
        const halflength = this.dimension.x * 0.5
        const halfwidth = this.dimension.y * 0.5
        if (x >= -halflength - Body_EPS && x <= halflength + Body_EPS
            && y >= -halfwidth - Body_EPS && y <= halfwidth + Body_EPS) {
            // relative velocity
            const v1 = collidingBody.velocity
            const w1 = collidingBody.angularVelocity
            const v2 = this.velocity
            const w2 = this.angularVelocity

            // Vector r1 = Vector.substract(vertex, collidingBody.getOrigin())
            const r1_x = vertex_x - collidingBody.origin.x
            const r1_y = vertex_y - collidingBody.origin.y

            // Vector r2 = Vector.substract(vertex, getOrigin())
            const r2_x = vertex_x - this.origin.x
            const r2_y = vertex_y - this.origin.y

            // Vector relativeVelocity = Vector.cross(r1, w1)
            let relativeVelocity_x = -w1 * r1_y
            let relativeVelocity_y = w1 * r1_x

            // Vector t1 = Vector.cross(r2, w2)
            const t1_x = -w2 * r2_y
            const t1_y = w2 * r2_x

            // relativeVelocity.substract(t1)
            relativeVelocity_x -= t1_x
            relativeVelocity_y -= t1_y

            // relativeVelocity.substract(v2)
            relativeVelocity_x -= v2.x
            relativeVelocity_y -= v2.y

            // relativeVelocity.add(v1)
            relativeVelocity_x += v1.x
            relativeVelocity_y += v1.y

            // Vector relativeMove = Vector.scale(relativeVelocity, timestep)
            let relativeMove_x = relativeVelocity_x * timestep
            let relativeMove_y = relativeVelocity_y * timestep

            // relativeMove.rotate(-getAngle())
            const cos1 = Math.cos(-this.angle)
            const sin1 = Math.sin(-this.angle)
            const tx1 = relativeMove_x * cos1 - relativeMove_y * sin1
            const ty1 = relativeMove_x * sin1 + relativeMove_y * cos1
            relativeMove_x = tx1
            relativeMove_y = ty1

            // get edge closest to point
            // top edge
            let separation = halfwidth - y
            let minSeparation = separation
            let maxEdge = 0
            let minEdge = 0
            if (separation < -relativeMove_y) {
                maxEdge = 1
            }

            // left edge
            separation = halflength + x
            if (separation < relativeMove_x) {
                maxEdge |= 2
            }

            if (separation < minSeparation) {
                minSeparation = separation
                minEdge = 1
            }

            // bottom edge
            separation = halfwidth + y
            if (separation < relativeMove_y) {
                maxEdge |= 4
            }

            if (separation < minSeparation) {
                minSeparation = separation
                minEdge = 2
            }

            // right edge
            separation = halflength - x
            if (separation < -relativeMove_x) {
                maxEdge |= 8
            }

            if (separation < minSeparation) {
                minSeparation = separation
                minEdge = 3
            }

            // create collision point
            let normal_x
            let normal_y
            if (maxEdge > 0) {
                let count = 0
                // normal = new Vector(0, 0)
                normal_x = 0
                normal_y = 0
                for (let i = 0; i < 4; i++) {
                    if ((maxEdge & (1 << i)) > 0) {
                        // normal.add(edgeNormal(i))
                        const impactedCorner1 = i
                        const impactedCorner2 = (impactedCorner1 === 3) ? 0 : impactedCorner1 + 1
                        let en_x = this.cx[impactedCorner1] - this.cx[impactedCorner2]
                        let en_y = this.cy[impactedCorner1] - this.cy[impactedCorner2]
                        const div = 1 / Vector.length(en_x, en_y)
                        en_x *= div
                        en_y *= div
                        const tmp = en_x
                        en_x = -en_y
                        en_y = tmp
                        normal_x += en_x
                        normal_y += en_y
                        count++
                    }
                }

                if (count > 1) {
                    // normal.scale(1f / normal.dimension.x())
                    const normal_len = Vector.length(normal_x, normal_y)
                    normal_x /= normal_len
                    normal_y /= normal_len
                }
            } else {
                // normal = edgeNormal(minEdge)
                const impactedCorner1 = minEdge
                const impactedCorner2 = (impactedCorner1 === 3) ? 0 : impactedCorner1 + 1
                let en_x = this.cx[impactedCorner1] - this.cx[impactedCorner2]
                let en_y = this.cy[impactedCorner1] - this.cy[impactedCorner2]
                const div = 1 / Vector.length(en_x, en_y)
                en_x *= div
                en_y *= div
                const tmp = en_x
                en_x = -en_y
                en_y = tmp
                normal_x = en_x
                normal_y = en_y
            }

            const collisionPoint = new CollisionPoint(collidingBody, this, normal_x,
                normal_y, vertex_x, vertex_y, minSeparation)
            collision.collisionPoints.push(collisionPoint)
        }
    }

    // static methods
    static collide(state, body1, body2, timestep) {
        const collision = new Collision(state.restitution)
        Body.collideAllCorners(collision, body1, body2, timestep)

        if (collision.collisionPoints.length < 2) {
            Body.collideAllCorners(collision, body2, body1, timestep)
        }

        if (collision.collisionPoints.length === 0) {
            return null
        }
        return collision
    }

    static collideAllCorners(collision, collidingBody, impactedBody, timestep) {
        for (let corner = 0; corner < 4; corner++) {
            impactedBody.collideSingleCorner(collision, collidingBody, corner, timestep)
        }
    }
}
