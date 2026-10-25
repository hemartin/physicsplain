import { Collision } from './collision.js'
import { CollisionPoint } from './collisionpoint.js'
import { Vector } from './vector.js'

/**
 * Fixed arc at given origin and radius. Start angle and end angle define
 * the two points where the arg starts and ends on the unit circle. The
 * right most point of the circle is 0. The top is PI/2. The left most point
 * is PI. Width denotes the "thickness" of the arc.
 *
 * @author Martin Hentschel
 */
export class FixedArc {
  constructor (id, origin, radius, width, startAngle, endAngle) {
    this.id = id
    this.origin = origin
    this.velocity = new Vector(0, 0)
    this.angularVelocity = 0
    this.radius = radius
    this.width = width
    this.startAngle = startAngle
    this.endAngle = endAngle
  }

  collide (collidingBody, timestep, restitution) {
    let collision = null
    for (let corner = 0; corner < 4; corner++) {
      // Vector vertex = body.vertex(i);
      const vertexX = collidingBody.cornerX[corner]
      const vertexY = collidingBody.cornerY[corner]
      const diffX = vertexX - this.origin.x
      const diffY = vertexY - this.origin.y
      const distance = Vector.length(diffX, diffY)
      const angle = Vector.angle(diffX, diffY)
      if (
        distance >= this.radius &&
        distance < this.radius + this.width &&
        angle > this.startAngle &&
        angle < this.endAngle
      ) {
        if (collision === null) {
          collision = new Collision(restitution)
        }
        const separation = distance - this.radius

        // Vector normal = Vector.unitVector(vertex, origin);
        let normalX = this.origin.x - vertexX
        let normalY = this.origin.y - vertexY
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
