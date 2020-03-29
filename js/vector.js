/**
 * Vector.
 *
 * @author Martin Hentschel
 */
class Vector {
    constructor(x, y) {
        this.x = x
        this.y = y
    }

    set(v) {
        this.x = v.x
        this.y = v.y
        return this
    }

    add(v) {
        this.x += v.x
        this.y += v.y
        return this
    }

    scale(f) {
        this.x *= f
        this.y *= f
        return this
    }

    normalize() {
        const length = this.length()
        if (length > 0 && length !== 1) {
            this.scale(1 / length)
        }
        return this
    }

    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y)
    }

    clear() {
        this.x = 0
        this.y = 0
    }

    toString() {
        return this.x + ", " + this.y
    }

    static cross(v1_x, v1_y, v2_x, v2_y) {
        return v1_x * v2_y - v1_y * v2_x
    }

    static dot(v1_x, v1_y, v2_x, v2_y) {
        return v1_x * v2_x + v1_y * v2_y
    }

    static length(x, y) {
        return Math.sqrt(x * x + y * y)
    }
}

export { Vector }
