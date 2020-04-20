import { Collision } from './collision.js'
import { CollisionPoint } from './collisionpoint.js'
import { Vector } from './vector.js'

/**
 * Fixed line at given start and end coordinates.
 *
 * @author Martin Hentschel
 */
export class FixedLine {
  /**
   * Constructs a new fixed line.
   *
   * @param {Number} id id of fixed line
   * @param {Vector} start start coordinate
   * @param {Vector} end end coordinate
   */
  constructor (id, start, end) {
    this.id = id
    this.origin = start
    this.start = start
    this.end = end
    const diffX = end.x - start.x
    const diffY = end.y - start.y
    this.angle = Vector.angle(diffX, diffY)
    this.length = Vector.length(diffX, diffY)
    this.normal = new Vector(-diffY, diffX).scale(1 / this.length)
    this.velocity = new Vector(0, 0)
    this.angularVelocity = 0
  }

  collide (collidingBody, timestep, restitution) {
    let collision = null
    for (let corner = 0; corner < 4; corner++) {
      // Vector vertex = body.vertex(corner);
      const vertexX = collidingBody.cornerX[corner]
      const vertexY = collidingBody.cornerY[corner]

      // this center as origin
      // Vector q = Vector.substract(vertex, origin);
      const qX = vertexX - this.start.x
      const qY = vertexY - this.start.y

      // Vector t = q.rotate(-angle)
      const cos = Math.cos(-this.angle)
      const sin = Math.sin(-this.angle)
      const tX = qX * cos - qY * sin
      const tY = qX * sin + qY * cos

      if (tX >= 0 && tX <= this.length && tY < 0) {
        if (collision === null) {
          collision = new Collision(restitution)
        }
        const separation = -tY
        const collisionPoint = new CollisionPoint(
          collidingBody,
          this,
          this.normal.x,
          this.normal.y,
          vertexX,
          vertexY,
          separation
        )
        collision.collisionPoints.push(collisionPoint)
      }
    }
    return collision
  }

  /**
   * Returns true if colliding body overlaps with this line. Also returns
   * leftOf and rightOf properties. LeftOf is defined as the x coordinate
   * of at least one corner of the colliding body being within bounds of
   * this line and the y coordinate of the corner being above this line.
   * The line and body are rotated for the line to be horizontal to
   * determine leftOf. RightOf is defined just as leftOf but with the
   * y coordinate being below this line.
   *
   * @param {Body} collidingBody colliding body
   */
  overlaps (collidingBody) {
    // leftOf and rightOf remember if at least one corner of
    // collidingBody is left of (or rigth of) line
    let leftOf = false
    let rightOf = false

    for (let corner = 0; corner < 4; corner++) {
      // Vector vertex = body.vertex(corner);
      const vertexX = collidingBody.cornerX[corner]
      const vertexY = collidingBody.cornerY[corner]

      // this center as origin
      // Vector q = Vector.substract(vertex, origin);
      const qX = vertexX - this.start.x
      const qY = vertexY - this.start.y

      // Vector t = q.rotate(-angle)
      const cos = Math.cos(-this.angle)
      const sin = Math.sin(-this.angle)
      const tX = qX * cos - qY * sin
      const tY = qX * sin + qY * cos

      if (tX >= 0 && tX <= this.length) {
        leftOf = leftOf || tY >= 0
        rightOf = rightOf || tY < 0
      }
    }

    // collidingBody overlaps with line if at least one corner is left of
    // and at leastone corner is right of line
    return {
      leftOf: leftOf,
      rightOf: rightOf,
      overlaps: leftOf && rightOf
    }
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
