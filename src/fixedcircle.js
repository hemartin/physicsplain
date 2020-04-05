import { Collision } from './collision.js'
import { CollisionPoint } from './collisionpoint.js'
import { Vector } from './vector.js'

/**
 * Fixed circle at given origin and radius.
 *
 * @author Martin Hentschel
 */
export class FixedCircle {
  constructor (id, origin, radius) {
    this.id = id
    this.origin = origin
    this.radius = radius
    this.velocity = new Vector(0, 0)
    this.angularVelocity = 0
  }

  collide (collidingBody, timestep, restitution) {
    let collision = null

    // check if corner is inside
    let foundCollision = false
    for (let corner = 0; corner < 4; corner++) {
      const vertexX = collidingBody.cornerX[corner]
      const vertexY = collidingBody.cornerY[corner]
      const diffX = vertexX - this.origin.x
      const diffY = vertexY - this.origin.y
      const distance = Vector.length(diffX, diffY)
      if (distance <= this.radius) {
        if (collision === null) {
          collision = new Collision(restitution)
        }
        const separation = this.radius - distance

        // Vector normal = Vector.unitVector(origin, vertex);
        let normalX = vertexX - this.origin.x
        let normalY = vertexY - this.origin.y
        const normalLen = Vector.length(normalX, normalY)
        normalX /= normalLen
        normalY /= normalLen

        const collisionPoint = new CollisionPoint(
          collidingBody,
          this,
          normalX,
          normalY,
          vertexX,
          vertexY,
          separation
        )
        collision.collisionPoints.push(collisionPoint)
        foundCollision = true
      }
    }

    // check if edge collides
    for (let edge = 0; edge < 4 && !foundCollision; edge++) {
      const bodyCorner1 = edge
      const bodyCorner2 = edge === 3 ? 0 : edge + 1

      const p1X = collidingBody.cornerX[bodyCorner1]
      const p1Y = collidingBody.cornerY[bodyCorner1]
      const p2X = collidingBody.cornerX[bodyCorner2]
      const p2Y = collidingBody.cornerY[bodyCorner2]

      // Vector normal = Vector.normal(p1, p2);
      let normalX = p2X - p1X
      let normalY = p2Y - p1Y
      const div = 1.0 / Math.sqrt(normalX * normalX + normalY * normalY)
      normalX *= div
      normalY *= div
      const tmp = normalX
      normalX = -normalY
      normalY = tmp

      const q1X = this.origin.x
      const q1Y = this.origin.y

      // Vector q2 = Vector.scale(normal, radius);
      let q2X = normalX * this.radius
      let q2Y = normalY * this.radius

      // q2.add(origin);
      q2X += this.origin.x
      q2Y += this.origin.y

      // Vector cp = Vector.intersectLineSegments(p1, p2, q1, q2);
      let cpX = NaN
      let cpY = NaN

      // solve A * x = b
      const a11 = p2X - p1X
      const a12 = q1X - q2X
      const a21 = p2Y - p1Y
      const a22 = q1Y - q2Y
      const b1 = q1X - p1X
      const b2 = q1Y - p1Y
      let det = a11 * a22 - a12 * a21
      det = 1.0 / det
      const r = det * (a22 * b1 - a12 * b2)
      const t = det * (a11 * b2 - a21 * b1)

      if (r >= 0 && r <= 1 && t >= 0 && t <= 1) {
        const cX = p2X - p1X
        const cY = p2Y - p1Y
        cpX = cX * r + p1X
        cpY = cY * r + p1Y
      }

      if (!isNaN(cpX)) {
        if (collision == null) {
          collision = new Collision(restitution)
        }

        const collisionPoint = new CollisionPoint(
          collidingBody,
          this,
          normalX,
          normalY,
          cpX,
          cpY,
          0
        )
        collision.collisionPoints.push(collisionPoint)
        foundCollision = true
      }
    }
    return collision
  }

  // this is a fixed entity
  invertedMass () {
    return 0
  }

  // this is a fixed entity
  invertedInertia () {
    return 0
  }

  // fixed entity has no velocity
  addVelocity (velocity) {}

  // fixed entity has no angular velocity
  addAngularVelocity (angularVelocity) {}
}
