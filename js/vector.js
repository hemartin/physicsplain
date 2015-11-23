/*
 * Vector.
 * 
 * @author Martin Hentschel, @hemasail
 */
function Vector(x, y) {
    this.x = x;
    this.y = y;
}

Vector.prototype.set = function (v) {
    this.x = v.x;
    this.y = v.y;
    return this;
};

Vector.prototype.add = function (v) {
    this.x += v.x;
    this.y += v.y;
    return this;
};

Vector.prototype.scale = function (f) {
    this.x *= f;
    this.y *= f;
    return this;
};

Vector.prototype.normalize = function() {
    var length = this.length();
    if (length > 0 && length !== 1) {
        this.scale(1 / length);
    }
    return this;
};

Vector.prototype.length = function () {
    return Math.sqrt(this.x * this.x + this.y * this.y);
};

Vector.prototype.clear = function () {
    this.x = 0;
    this.y = 0;
};

Vector.prototype.toString = function () {
    return this.x + ", " + this.y;
};

// static functions
function Vector_cross(v1_x, v1_y, v2_x, v2_y) {
    return v1_x * v2_y - v1_y * v2_x;
}

function Vector_dot(v1_x, v1_y, v2_x, v2_y) {
    return v1_x * v2_x + v1_y * v2_y;
}

function Vector_length(x, y) {
    return Math.sqrt(x * x + y * y);
}
