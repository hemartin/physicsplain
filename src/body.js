import { Collision } from './collision.js'
import { CollisionPoint } from './collisionpoint.js'
import { Vector } from './vector.js'

export const bodyInfiniteMass = -1

// margin of the bounding-circle check before colliding entities in detail,
// larger than the error margin of corners on an edge
export const boundingMargin = 1e-4

// wraps angle to (-PI, PI], the range of Math.atan2 and Vector.angle
const wrapAngle = (angle) => angle - 2 * Math.PI * Math.ceil(angle / (2 * Math.PI) - 0.5)

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

    // origin and angle before the last step, to draw bodies between the
    // last two steps (see interpolatedOrigin())
    this.previousOrigin = new Vector(0, 0)
    this.previousAngle = 0

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

    // inertia and corners of default values, so that a body is usable
    // without calling finalize()
    this.finalize()
  }

  /*
   * Finalizes the construction of body by calculating its inertia, inverted mass,
   * bounding radius, and the location of its corners.
   */
  finalize () {
    this.inertia =
      ((this.dimension.x * this.dimension.x +
        this.dimension.y * this.dimension.y) *
        this.mass) /
      12

    // radius of the circle around origin that contains all corners
    this.boundingRadius = 0.5 * Vector.length(this.dimension.x, this.dimension.y)
    this.calculateCorners()
    return this
  }

  // also moves the previous origin, so the body is not drawn moving there
  setOrigin (x, y) {
    this.origin.x = x
    this.origin.y = y
    this.previousOrigin.set(this.origin)
    return this
  }

  // also sets the previous angle, so the body is not drawn turning there
  setAngle (a) {
    this.angle = wrapAngle(a)
    this.previousAngle = this.angle
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
    return this
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
    return this
  }

  advance (timestep) {
    this.previousOrigin.set(this.origin)
    this.previousAngle = this.angle

    // origin.add(Vector.scale(velocity, timestep))
    this.origin.x += this.velocity.x * timestep
    this.origin.y += this.velocity.y * timestep

    this.angle = wrapAngle(this.angle + this.angularVelocity * timestep)

    this.calculateCorners()
  }

  /**
   * Origin for drawing between the last two steps, to avoid judder when
   * the screen refreshes at a different rate than physics steps.
   *
   * @param {Number} alpha 0 for the origin before the last step, 1 for the
   * current origin, as passed to State.postAdvance()
   * @returns {Vector} interpolated origin
   */
  interpolatedOrigin (alpha) {
    return new Vector(
      this.previousOrigin.x + (this.origin.x - this.previousOrigin.x) * alpha,
      this.previousOrigin.y + (this.origin.y - this.previousOrigin.y) * alpha
    )
  }

  /**
   * Angle for drawing between the last two steps, turning the short way
   * round (see interpolatedOrigin()).
   *
   * @param {Number} alpha 0 for the angle before the last step, 1 for the
   * current angle
   * @returns {Number} interpolated angle, may be outside (-PI, PI]
   */
  interpolatedAngle (alpha) {
    return this.previousAngle + wrapAngle(this.angle - this.previousAngle) * alpha
  }

  /**
   * Corners for drawing between the last two steps (see
   * interpolatedOrigin()).
   *
   * @param {Number} alpha 0 for the corners before the last step, 1 for
   * the current corners
   * @returns {Object} object with arrays cornerX and cornerY, like the
   * properties of this body
   */
  interpolatedCorners (alpha) {
    const origin = this.interpolatedOrigin(alpha)

    // rotate the current corners around the current origin back by the
    // part of the last turn not yet drawn
    const turn = this.interpolatedAngle(alpha) - this.angle
    const cos = Math.cos(turn)
    const sin = Math.sin(turn)
    const cornerX = []
    const cornerY = []
    for (let i = 0; i < 4; i++) {
      const x = this.cornerX[i] - this.origin.x
      const y = this.cornerY[i] - this.origin.y
      cornerX[i] = origin.x + x * cos - y * sin
      cornerY[i] = origin.y + x * sin + y * cos
    }
    return { cornerX, cornerY }
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
      // calculate angular force, turn the short way round
      let forceA = wrapAngle(this.targetAngle - this.angle)
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

    // kept to rotate points into this body's frame when colliding
    this.cos = directionX
    this.sin = directionY

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

  /**
   * @returns outward unit normal of the edge from corner edge to the next
   * corner (0 top, 1 left, 2 bottom, 3 right for an unrotated body)
   */
  edgeNormal (edge) {
    const corner1 = edge
    const corner2 = corner1 === 3 ? 0 : corner1 + 1
    let enX = this.cornerX[corner1] - this.cornerX[corner2]
    let enY = this.cornerY[corner1] - this.cornerY[corner2]
    const div = 1 / Vector.length(enX, enY)
    enX *= div
    enY *= div
    return new Vector(-enY, enX)
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
    // bodies too far apart to touch
    const distance = Vector.length(
      collidingBody.origin.x - this.origin.x,
      collidingBody.origin.y - this.origin.y
    )
    if (
      distance >
      this.boundingRadius + collidingBody.boundingRadius + boundingMargin
    ) {
      return null
    }

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
    // extent of colliding body in this body's frame, so that a point
    // sitting on a side edge (e.g. stacked aligned boxes) does not make
    // that side edge the closest edge
    const cos = this.cos
    const sin = -this.sin
    const extent = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
    for (let i = 0; i < 4; i++) {
      const cx = collidingBody.cornerX[i] - this.origin.x
      const cy = collidingBody.cornerY[i] - this.origin.y
      extent.minX = Math.min(extent.minX, cx * cos - cy * sin)
      extent.maxX = Math.max(extent.maxX, cx * cos - cy * sin)
      extent.minY = Math.min(extent.minY, cx * sin + cy * cos)
      extent.maxY = Math.max(extent.maxY, cx * sin + cy * cos)
    }

    for (let corner = 0; corner < 4; corner++) {
      this.collideSingleCorner(collision, collidingBody, corner, timestep, extent)
    }
  }

  collideSingleCorner (collision, collidingBody, corner, timestep, extent) {
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
    const cos = this.cos
    const sin = -this.sin
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
      const tx1 = relativeMoveX * cos - relativeMoveY * sin
      const ty1 = relativeMoveX * sin + relativeMoveY * cos
      relativeMoveX = tx1
      relativeMoveY = ty1

      const { minX, maxX, minY, maxY } = extent

      // get edge closest to point, i.e. edge of least penetration of
      // colliding body
      // top edge
      let separation = halfwidth - y
      let penetration = halfwidth - minY
      let minSeparation = separation
      let minPenetration = penetration
      let maxEdge = 0
      let minEdge = 0
      let crossSeparation = Infinity
      if (separation > eps && separation < -relativeMoveY) {
        maxEdge = 1
        crossSeparation = separation
      }

      // left edge
      separation = halflength + x
      penetration = halflength + maxX
      if (separation > eps && separation < relativeMoveX) {
        maxEdge |= 2
        crossSeparation = Math.min(crossSeparation, separation)
      }

      if (penetration < minPenetration) {
        minSeparation = separation
        minPenetration = penetration
        minEdge = 1
      }

      // bottom edge
      separation = halfwidth + y
      penetration = halfwidth + maxY
      if (separation > eps && separation < relativeMoveY) {
        maxEdge |= 4
        crossSeparation = Math.min(crossSeparation, separation)
      }

      if (penetration < minPenetration) {
        minSeparation = separation
        minPenetration = penetration
        minEdge = 2
      }

      // right edge
      separation = halflength - x
      penetration = halflength - minX
      if (separation > eps && separation < -relativeMoveX) {
        maxEdge |= 8
        crossSeparation = Math.min(crossSeparation, separation)
      }

      if (penetration < minPenetration) {
        minSeparation = separation
        minPenetration = penetration
        minEdge = 3
      }

      // create collision point
      let normalX
      let normalY
      if (maxEdge > 0) {
        minSeparation = crossSeparation
        let count = 0
        // normal = new Vector(0, 0)
        normalX = 0
        normalY = 0
        for (let i = 0; i < 4; i++) {
          if ((maxEdge & (1 << i)) > 0) {
            const edgeNormal = this.edgeNormal(i)
            normalX += edgeNormal.x
            normalY += edgeNormal.y
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
        const edgeNormal = this.edgeNormal(minEdge)
        normalX = edgeNormal.x
        normalY = edgeNormal.y
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
