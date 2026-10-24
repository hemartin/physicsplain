import { boundingMargin } from './body.js'
import { Collision } from './collision.js'
import { CollisionPoint } from './collisionpoint.js'
import { FixedEntity } from './fixedentity.js'
import { Vector } from './vector.js'

/**
 * Fixed line at given start and end coordinates.
 *
 * @author Martin Hentschel
 */
export class FixedLine extends FixedEntity {
  /**
   * Constructs a new fixed line.
   *
   * @param {Number} id id of fixed line
   * @param {Vector} start start coordinate
   * @param {Vector} end end coordinate
   */
  constructor (id, start, end) {
    super(id, start)
    this.start = start
    this.end = end
    const diffX = end.x - start.x
    const diffY = end.y - start.y
    this.angle = Vector.angle(diffX, diffY)
    this.length = Vector.length(diffX, diffY)
    this.normal = new Vector(-diffY, diffX).scale(1 / this.length)

    // rotation by -angle into this line's frame (line along the x axis)
    this.cos = Math.cos(-this.angle)
    this.sin = Math.sin(-this.angle)
  }

  collide (collidingBody, timestep, restitution) {
    // ignore bodies behind this line, unless their origin crossed the line
    // during the last step (fast bodies)
    const origin = collidingBody.origin
    const velocity = collidingBody.velocity
    const n = this.normal
    const originY = Vector.dot(origin.x - this.start.x, origin.y - this.start.y, n.x, n.y)
    const previousOriginY = originY - Vector.dot(velocity.x, velocity.y, n.x, n.y) * timestep
    if (originY < 0 && previousOriginY < 0) {
      return null
    }

    // ignore bodies too far in front of this line or beyond its ends to
    // touch it, in this line's frame: a colliding corner is below the line
    // and between its ends, and within the bounding radius of origin
    const radius = collidingBody.boundingRadius + boundingMargin
    const originX =
      (origin.x - this.start.x) * this.cos - (origin.y - this.start.y) * this.sin
    if (originY > radius || originX < -radius || originX > this.length + radius) {
      return null
    }

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
      const tX = qX * this.cos - qY * this.sin
      const tY = qX * this.sin + qY * this.cos

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
   * Returns true if colliding body overlaps with this line, i.e. at least
   * one corner is leftOf and at least one corner is rightOf this line (see
   * overlapInfo()).
   *
   * @param {Body} collidingBody colliding body
   * @returns {Boolean} true if colliding body overlaps with this line
   */
  overlaps (collidingBody) {
    return this.overlapInfo(collidingBody).overlaps
  }

  /**
   * Returns leftOf, rightOf and overlaps properties of colliding body
   * relative to this line. LeftOf is defined as the x coordinate
   * of at least one corner of the colliding body being within bounds of
   * this line and the y coordinate of the corner being above this line.
   * The line and body are rotated for the line to be horizontal to
   * determine leftOf. RightOf is defined just as leftOf but with the
   * y coordinate being below this line. Overlaps is leftOf && rightOf.
   *
   * @param {Body} collidingBody colliding body
   * @returns {Object} object with Boolean properties leftOf, rightOf and
   * overlaps
   */
  overlapInfo (collidingBody) {
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
      const tX = qX * this.cos - qY * this.sin
      const tY = qX * this.sin + qY * this.cos

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
}
