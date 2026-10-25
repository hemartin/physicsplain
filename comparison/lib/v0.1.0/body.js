import { Collision } from './collision.js'
import { CollisionPoint } from './collisionpoint.js'
import { Vector } from './vector.js'

export const bodyInfiniteMass = -1

/**
 * Rigid body.
 *
 * Heavily inspired by Erin Catto's GDC slides and his Box2D library. Also
 * inspired by the demos of myphysicslab.com.

 * Constructs a rigid body using default values. Call finalize after modifying
 * any values to compute the body's inertia and the position of corners.
 *
 * @author Martin Hentschel
 */
export class Body {
  constructor (id) {
    this.id = id
    this.origin = new Vector(0, 0)
    this.angle = 0
    this.dimension = new Vector(0.1, 0.1)
    this.mass = 1
    this.velocity = new Vector(0, 0)
    this.angularVelocity = 0

    this.lateralFriction = 1
    this.rotationalFriction = 1

    // force that drives body forward
    this.force = new Vector(0, 0)
    this.angularForce = 0

    // target, where body is heading to (if targetSet = true)
    this.target = new Vector(0, 0)
    this.targetSet = false
    this.thrust = 2

    this.targetAngle = 0
    this.targetAngleSet = false
    this.angleThrust = 0.02

    // corners, computed when calling finalize() after construction and
    // after every call to advance()
    this.cornerX = [0, 0, 0, 0]
    this.cornerY = [0, 0, 0, 0]
  }

  /*
   * Finalizes the construction of body by calculating its inertia, inverted mass,
   * and the location of its corners.
   */
  finalize () {
    this.inertia =
      ((this.dimension.x * this.dimension.x +
        this.dimension.y * this.dimension.y) *
        this.mass) /
      12
    this.calculateCorners()
    return this
  }

  setOrigin (x, y) {
    this.origin.x = x
    this.origin.y = y
    return this
  }

  setAngle (a) {
    this.angle = a
    return this
  }

  setDimension (x, y) {
    this.dimension.x = x
    this.dimension.y = y
    return this
  }

  setMass (m) {
    this.mass = m
    return this
  }

  setVelocity (x, y) {
    this.velocity.x = x
    this.velocity.y = y
    return this
  }

  setAngularVelocity (a) {
    this.angularVelocity = a
    return this
  }

  setForce (x, y) {
    this.force.x = x
    this.force.y = y
    return this
  }

  setAngularForce (a) {
    this.angularForce = a
    return this
  }

  setTarget (x, y) {
    this.target.x = x
    this.target.y = y
    this.targetSet = true
    return this
  }

  hasTarget () {
    return this.targetSet
  }

  unsetTarget () {
    this.targetSet = false
  }

  setTargetAngle (a) {
    this.targetAngle = a
    this.targetAngleSet = true
    return this
  }

  hasTargetAngle () {
    return this.targetAngleSet
  }

  unsetTargetAngle () {
    this.targetAngleSet = false
  }

  advance (timestep) {
    // origin.add(Vector.scale(velocity, timestep))
    this.origin.x += this.velocity.x * timestep
    this.origin.y += this.velocity.y * timestep

    this.angle += this.angularVelocity * timestep
    if (this.angle > Math.Pi) {
      this.angle -= 2 * Math.Pi
    } else if (this.angle < -Math.Pi) {
      this.angle += 2 * Math.Pi
    }

    this.calculateCorners()
  }

  applyForces (timestep) {
    // if target is set, we ignore force
    if (this.targetSet) {
      // calculate force
      let forceX = this.target.x - this.origin.x
      let forceY = this.target.y - this.origin.y
      const forceLen = Vector.length(forceX, forceY)

      // avoid division by zero
      if (forceLen > 0) {
        forceX *= this.thrust / forceLen
        forceY *= this.thrust / forceLen

        // apply force
        this.velocity.x += forceX * timestep * this.invertedMass()
        this.velocity.y += forceY * timestep * this.invertedMass()
      }
    } else {
      // apply force if target is not set
      this.velocity.x += this.force.x * timestep * this.invertedMass()
      this.velocity.y += this.force.y * timestep * this.invertedMass()
    }

    if (this.targetAngleSet) {
      // calculate angular force
      let forceA = this.targetAngle - this.angle
      if (forceA !== 0) {
        forceA = this.angleThrust * Math.sign(forceA)
        this.angularVelocity += forceA * timestep * this.invertedInertia()
      }
    } else {
      // apply angular force if target is not set
      this.angularVelocity +=
        this.angularForce * timestep * this.invertedInertia()
    }

    // apply friction
    this.velocity.scale(Math.max(0, 1 - timestep * this.lateralFriction))
    this.angularVelocity *= Math.max(0, 1 - timestep * this.rotationalFriction)
  }

  calculateCorners () {
    const directionY = Math.sin(this.angle)
    const directionX = Math.cos(this.angle)

    // Vector tangent = Vector.tangent(direction)
    const tangentX = -directionY
    const tangentY = directionX

    this.cornerX[0] =
      this.origin.x +
      directionX * this.dimension.x * 0.5 +
      tangentX * this.dimension.y * 0.5
    this.cornerY[0] =
      this.origin.y +
      directionY * this.dimension.x * 0.5 +
      tangentY * this.dimension.y * 0.5
    this.cornerX[1] =
      this.origin.x -
      directionX * this.dimension.x * 0.5 +
      tangentX * this.dimension.y * 0.5
    this.cornerY[1] =
      this.origin.y -
      directionY * this.dimension.x * 0.5 +
      tangentY * this.dimension.y * 0.5
    this.cornerX[2] =
      this.origin.x -
      directionX * this.dimension.x * 0.5 -
      tangentX * this.dimension.y * 0.5
    this.cornerY[2] =
      this.origin.y -
      directionY * this.dimension.x * 0.5 -
      tangentY * this.dimension.y * 0.5
    this.cornerX[3] =
      this.origin.x +
      directionX * this.dimension.x * 0.5 -
      tangentX * this.dimension.y * 0.5
    this.cornerY[3] =
      this.origin.y +
      directionY * this.dimension.x * 0.5 -
      tangentY * this.dimension.y * 0.5
  }

  invertedMass () {
    if (this.isFixedBody()) {
      return 0
    }
    return 1 / this.mass
  }

  invertedInertia () {
    if (this.isFixedBody() || this.inertia === 0) {
      return 0
    }
    return 1 / this.inertia
  }

  isFixedBody () {
    return this.mass === bodyInfiniteMass
  }

  addVelocity (velocity) {
    this.velocity.add(velocity)
  }

  addAngularVelocity (angularVelocity) {
    this.angularVelocity += angularVelocity
  }

  /**
   * Collides other body with this body. This is the impacted body. The
   * other body is the colliding body.
   *
   * @param {Body}   collidingBody other body
   * @param {Number} timestep      timestep
   * @param {Number} restitution   restitution
   * @returns collision, or null if not colliding
   */
  collide (collidingBody, timestep, restitution) {
    const collision = new Collision(restitution)
    this.collideAllCorners(collision, collidingBody, timestep)

    if (collision.collisionPoints.length < 2) {
      collidingBody.collideAllCorners(collision, this, timestep)
    }

    if (collision.collisionPoints.length === 0) {
      return null
    }
    return collision
  }

  collideAllCorners (collision, collidingBody, timestep) {
    for (let corner = 0; corner < 4; corner++) {
      this.collideSingleCorner(collision, collidingBody, corner, timestep)
    }
  }

  collideSingleCorner (collision, collidingBody, corner, timestep) {
    // error margin
    const eps = 1e-5

    // Vector vertex = collidingBody.vertex(corner)
    const vertexX = collidingBody.cornerX[corner]
    const vertexY = collidingBody.cornerY[corner]

    // this center as origin
    // Vector q = Vector.substract(vertex, origin)
    let x = vertexX - this.origin.x
    let y = vertexY - this.origin.y

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
    if (
      x >= -halflength - eps &&
      x <= halflength + eps &&
      y >= -halfwidth - eps &&
      y <= halfwidth + eps
    ) {
      // relative velocity
      const v1 = collidingBody.velocity
      const w1 = collidingBody.angularVelocity
      const v2 = this.velocity
      const w2 = this.angularVelocity

      // Vector r1 = Vector.substract(vertex, collidingBody.getOrigin())
      const r1X = vertexX - collidingBody.origin.x
      const r1Y = vertexY - collidingBody.origin.y

      // Vector r2 = Vector.substract(vertex, getOrigin())
      const r2X = vertexX - this.origin.x
      const r2Y = vertexY - this.origin.y

      // Vector relativeVelocity = Vector.cross(r1, w1)
      let relativeVelocityX = -w1 * r1Y
      let relativeVelocityY = w1 * r1X

      // Vector t1 = Vector.cross(r2, w2)
      const t1X = -w2 * r2Y
      const t1Y = w2 * r2X

      // relativeVelocity.substract(t1)
      relativeVelocityX -= t1X
      relativeVelocityY -= t1Y

      // relativeVelocity.substract(v2)
      relativeVelocityX -= v2.x
      relativeVelocityY -= v2.y

      // relativeVelocity.add(v1)
      relativeVelocityX += v1.x
      relativeVelocityY += v1.y

      // Vector relativeMove = Vector.scale(relativeVelocity, timestep)
      let relativeMoveX = relativeVelocityX * timestep
      let relativeMoveY = relativeVelocityY * timestep

      // relativeMove.rotate(-getAngle())
      const cos1 = Math.cos(-this.angle)
      const sin1 = Math.sin(-this.angle)
      const tx1 = relativeMoveX * cos1 - relativeMoveY * sin1
      const ty1 = relativeMoveX * sin1 + relativeMoveY * cos1
      relativeMoveX = tx1
      relativeMoveY = ty1

      // get edge closest to point
      // top edge
      let separation = halfwidth - y
      let minSeparation = separation
      let maxEdge = 0
      let minEdge = 0
      if (separation < -relativeMoveY) {
        maxEdge = 1
      }

      // left edge
      separation = halflength + x
      if (separation < relativeMoveX) {
        maxEdge |= 2
      }

      if (separation < minSeparation) {
        minSeparation = separation
        minEdge = 1
      }

      // bottom edge
      separation = halfwidth + y
      if (separation < relativeMoveY) {
        maxEdge |= 4
      }

      if (separation < minSeparation) {
        minSeparation = separation
        minEdge = 2
      }

      // right edge
      separation = halflength - x
      if (separation < -relativeMoveX) {
        maxEdge |= 8
      }

      if (separation < minSeparation) {
        minSeparation = separation
        minEdge = 3
      }

      // create collision point
      let normalX
      let normalY
      if (maxEdge > 0) {
        let count = 0
        // normal = new Vector(0, 0)
        normalX = 0
        normalY = 0
        for (let i = 0; i < 4; i++) {
          if ((maxEdge & (1 << i)) > 0) {
            // normal.add(edgeNormal(i))
            const impactedCorner1 = i
            const impactedCorner2 =
              impactedCorner1 === 3 ? 0 : impactedCorner1 + 1
            let enX =
              this.cornerX[impactedCorner1] - this.cornerX[impactedCorner2]
            let enY =
              this.cornerY[impactedCorner1] - this.cornerY[impactedCorner2]
            const div = 1 / Vector.length(enX, enY)
            enX *= div
            enY *= div
            const tmp = enX
            enX = -enY
            enY = tmp
            normalX += enX
            normalY += enY
            count++
          }
        }

        if (count > 1) {
          // normal.scale(1f / normal.dimension.x())
          const normalLen = Vector.length(normalX, normalY)
          normalX /= normalLen
          normalY /= normalLen
        }
      } else {
        // normal = edgeNormal(minEdge)
        const impactedCorner1 = minEdge
        const impactedCorner2 = impactedCorner1 === 3 ? 0 : impactedCorner1 + 1
        let enX = this.cornerX[impactedCorner1] - this.cornerX[impactedCorner2]
        let enY = this.cornerY[impactedCorner1] - this.cornerY[impactedCorner2]
        const div = 1 / Vector.length(enX, enY)
        enX *= div
        enY *= div
        const tmp = enX
        enX = -enY
        enY = tmp
        normalX = enX
        normalY = enY
      }

      const collisionPoint = new CollisionPoint(
        collidingBody,
        this,
        normalX,
        normalY,
        vertexX,
        vertexY,
        minSeparation
      )
      collision.collisionPoints.push(collisionPoint)
    }
  }
}
