import { Collision } from './collision.js'
import { CollisionPoint } from './collisionpoint.js'
import { FixedEntity } from './fixedentity.js'
import { Vector } from './vector.js'

/**
 * Fixed floor: a one-sided line from start to end that bodies can only hit
 * from its front. The front is the side its normal points to, the left side
 * when looking from start to end: a floor from (-1, 0) to (1, 0) is hit from
 * above, a floor from (1, 0) to (-1, 0) from below. A floor can face any
 * direction, e.g. a wall from (0, -1) to (0, 1) is hit from the left.
 *
 * Bodies behind a floor pass through it, like a one-way platform, unless
 * their origin crossed the floor during the last step: fast bodies are
 * pushed back to the front.
 *
 * @author Martin Hentschel
 */
export class FixedFloor extends FixedEntity {
  /**
   * Constructs a new fixed floor.
   *
   * @param {Number} id id of fixed floor
   * @param {Vector} start start coordinate
   * @param {Vector} end end coordinate; the front is on the left when
   * looking from start to end
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
    // ignore bodies behind this floor, unless their origin crossed the floor
    // during the last step (fast bodies)
    const origin = collidingBody.origin
    const velocity = collidingBody.velocity
    const n = this.normal
    const originY = Vector.dot(origin.x - this.start.x, origin.y - this.start.y, n.x, n.y)
    const previousOriginY = originY - Vector.dot(velocity.x, velocity.y, n.x, n.y) * timestep
    if (originY < 0 && previousOriginY < 0) {
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
   * Returns true if colliding body overlaps with this floor, i.e. at least
   * one corner is in front of it and at least one corner behind it (see
   * overlapInfo()).
   *
   * @param {Body} collidingBody colliding body
   * @returns {Boolean} true if colliding body overlaps with this floor
   */
  overlaps (collidingBody) {
    return this.overlapInfo(collidingBody).overlaps
  }

  /**
   * Returns on which sides of this floor the colliding body is. Only
   * corners between the floor's start and end count. LeftOf is true if at
   * least one corner is on or in front of the floor (on the left when
   * looking from start to end), rightOf if at least one corner is behind
   * it. Overlaps is leftOf && rightOf.
   *
   * @param {Body} collidingBody colliding body
   * @returns {Object} object with Boolean properties leftOf, rightOf and
   * overlaps
   */
  overlapInfo (collidingBody) {
    // leftOf and rightOf remember if at least one corner of
    // collidingBody is in front of (or behind) this floor
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

    // collidingBody overlaps with this floor if at least one corner is in
    // front of it and at least one corner is behind it
    return {
      leftOf: leftOf,
      rightOf: rightOf,
      overlaps: leftOf && rightOf
    }
  }
}
