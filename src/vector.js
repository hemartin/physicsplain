/**
 * Vector.
 *
 * @author Martin Hentschel
 */
export class Vector {
  constructor (x, y) {
    this.x = x
    this.y = y
  }

  set (v) {
    this.x = v.x
    this.y = v.y
    return this
  }

  add (v) {
    this.x += v.x
    this.y += v.y
    return this
  }

  subtract (v) {
    this.x -= v.x
    this.y -= v.y
    return this
  }

  scale (f) {
    this.x *= f
    this.y *= f
    return this
  }

  rotate (angle) {
    var cos = Math.cos(angle)
    var sin = Math.sin(angle)
    var tmpx = this.x * cos - this.y * sin
    var tmpy = this.x * sin + this.y * cos
    this.x = tmpx
    this.y = tmpy
    return this
  }

  normalize () {
    const length = this.length()
    if (length > 0 && length !== 1) {
      this.scale(1 / length)
    }
    return this
  }

  length () {
    return Math.sqrt(this.x * this.x + this.y * this.y)
  }

  distanceFrom (other) {
    var diffX = this.x - other.x
    var diffY = this.y - other.y
    return Vector.length(diffX, diffY)
  }

  clear () {
    this.x = 0
    this.y = 0
  }

  toString () {
    return this.x + ', ' + this.y
  }

  static cross (v1X, v1Y, v2X, v2Y) {
    return v1X * v2Y - v1Y * v2X
  }

  static dot (v1X, v1Y, v2X, v2Y) {
    return v1X * v2X + v1Y * v2Y
  }

  static length (x, y) {
    return Math.sqrt(x * x + y * y)
  }

  static angle (x, y) {
    let angle = Math.atan2(y, x)
    if (angle < 0) {
      angle += 2 * Math.PI
    }
    return angle
  }
}
