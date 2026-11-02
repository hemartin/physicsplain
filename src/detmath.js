/**
 * Deterministic sin, cos and atan2.
 *
 * ECMAScript lets engines approximate Math.sin, Math.cos and Math.atan2 as
 * they like, so results may differ in the last bit between browsers. These
 * functions use only arithmetic that every engine computes exactly the same
 * way and therefore give the same results everywhere. They are ported from
 * fdlibm 5.3 (http://www.netlib.org/fdlibm/), with one fix to atan2 from
 * FreeBSD msun, and match V8's Math.* in Node.js 24.
 *
 * @author Martin Hentschel
 *
 * Original fdlibm notice:
 *
 * Copyright (C) 1993 by Sun Microsystems, Inc. All rights reserved.
 *
 * Developed at SunPro, a Sun Microsystems, Inc. business.
 * Permission to use, copy, modify, and distribute this
 * software is freely granted, provided that this notice
 * is preserved.
 */

// reads the high and low 32 bits of a double, like fdlibm's __HI and __LO
const float = new Float64Array(1)
const words = new Int32Array(float.buffer)
const hiIndex = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1 ? 1 : 0
const loIndex = 1 - hiIndex
const high = (x) => {
  float[0] = x
  return words[hiIndex]
}
const fromHigh = (hi) => {
  words[hiIndex] = hi
  words[loIndex] = 0
  return float[0]
}

// high word of the largest argument of sin and cos, |x| < 1647100 (about
// 2^20 * PI / 2)
const maxHigh = 0x413921fb

// kernel sin on [-PI/4, PI/4], y is the tail of x
const S1 = -1.66666666666666324348e-01
const S2 = 8.33333333332248946124e-03
const S3 = -1.98412698298579493134e-04
const S4 = 2.75573137070700676789e-06
const S5 = -2.50507602534068634195e-08
const S6 = 1.58969099521155010221e-10

const kernelSin = (x, y, hasTail) => {
  if ((high(x) & 0x7fffffff) < 0x3e400000) { // |x| < 2^-27
    return x
  }
  const z = x * x
  const v = z * x
  const r = S2 + z * (S3 + z * (S4 + z * (S5 + z * S6)))
  if (!hasTail) {
    return x + v * (S1 + z * r)
  }
  return x - ((z * (0.5 * y - v * r) - y) - v * S1)
}

// kernel cos on [-PI/4, PI/4], y is the tail of x
const C1 = 4.16666666666666019037e-02
const C2 = -1.38888888888741095749e-03
const C3 = 2.48015872894767294178e-05
const C4 = -2.75573143513906633035e-07
const C5 = 2.08757232129817482790e-09
const C6 = -1.13596475577881948265e-11

const kernelCos = (x, y) => {
  const ix = high(x) & 0x7fffffff
  if (ix < 0x3e400000) { // |x| < 2^-27
    return 1
  }
  const z = x * x
  const r = z * (C1 + z * (C2 + z * (C3 + z * (C4 + z * (C5 + z * C6)))))
  if (ix < 0x3fd33333) { // |x| < 0.3
    return 1 - (0.5 * z - (z * r - x * y))
  }
  const qx = ix > 0x3fe90000 ? 0.28125 : fromHigh(ix - 0x00200000)
  const hz = 0.5 * z - qx
  const a = 1 - qx
  return a - (hz - (z * r - x * y))
}

// argument reduction for |x| < 1647100: remPio2 returns n and
// sets reduced[0] + reduced[1] = x - n * PI / 2, in [-PI/4, PI/4]
const invPio2 = 6.36619772367581382433e-01
const pio2a = 1.57079632673412561417e+00 // first 33 bits of PI/2
const pio2aTail = 6.07710050650619224932e-11 // PI/2 - pio2a
const pio2b = 6.07710050630396597660e-11 // second 33 bits of PI/2
const pio2bTail = 2.02226624879595063154e-21 // PI/2 - (pio2a + pio2b)
const pio2c = 2.02226624871116645580e-21 // third 33 bits of PI/2
const pio2cTail = 8.47842766036889956997e-32 // PI/2 - (pio2a + pio2b + pio2c)

const reduced = new Float64Array(2)

const remPio2 = (x) => {
  const hx = high(x)
  const ix = hx & 0x7fffffff
  if (ix < 0x4002d97c) { // |x| < 3PI/4, n = +-1
    if (hx > 0) {
      let z = x - pio2a
      if (ix !== 0x3ff921fb) { // 33 + 53 bits of PI/2 suffice
        reduced[0] = z - pio2aTail
        reduced[1] = (z - reduced[0]) - pio2aTail
      } else { // x is near PI/2, use 33 + 33 + 53 bits
        z -= pio2b
        reduced[0] = z - pio2bTail
        reduced[1] = (z - reduced[0]) - pio2bTail
      }
      return 1
    }
    let z = x + pio2a
    if (ix !== 0x3ff921fb) {
      reduced[0] = z + pio2aTail
      reduced[1] = (z - reduced[0]) + pio2aTail
    } else {
      z += pio2b
      reduced[0] = z + pio2bTail
      reduced[1] = (z - reduced[0]) + pio2bTail
    }
    return -1
  }

  // medium size
  let t = Math.abs(x)
  const n = (t * invPio2 + 0.5) | 0
  let r = t - n * pio2a
  let w = n * pio2aTail // first round good to 85 bits
  const j = ix >> 20
  reduced[0] = r - w
  let i = j - ((high(reduced[0]) >> 20) & 0x7ff)
  if (i > 16) { // second iteration needed, good to 118 bits
    t = r
    w = n * pio2b
    r = t - w
    w = n * pio2bTail - ((t - r) - w)
    reduced[0] = r - w
    i = j - ((high(reduced[0]) >> 20) & 0x7ff)
    if (i > 49) { // third iteration needed, 151 bits
      t = r
      w = n * pio2c
      r = t - w
      w = n * pio2cTail - ((t - r) - w)
      reduced[0] = r - w
    }
  }
  reduced[1] = (r - reduced[0]) - w
  if (hx < 0) {
    reduced[0] = -reduced[0]
    reduced[1] = -reduced[1]
    return -n
  }
  return n
}

const tooLarge = (x) =>
  new RangeError(`argument ${x} is too large, |x| must be less than 1647100`)

/**
 * Sine of x, the same in every engine.
 *
 * @param {Number} x angle in radians, |x| < 1647100 (about 2^20 * PI / 2)
 * @returns {Number} sine of x, NaN if x is NaN or infinite
 * @throws {RangeError} if x is finite and too large
 */
export function sin (x) {
  const ix = high(x) & 0x7fffffff
  if (ix <= 0x3fe921fb) { // |x| ~< PI/4
    return kernelSin(x, 0, false)
  }
  if (ix >= 0x7ff00000) { // NaN or infinite
    return NaN
  }
  if (ix > maxHigh) {
    throw tooLarge(x)
  }
  switch (remPio2(x) & 3) {
    case 0: return kernelSin(reduced[0], reduced[1], true)
    case 1: return kernelCos(reduced[0], reduced[1])
    case 2: return -kernelSin(reduced[0], reduced[1], true)
    default: return -kernelCos(reduced[0], reduced[1])
  }
}

/**
 * Cosine of x, the same in every engine.
 *
 * @param {Number} x angle in radians, |x| < 1647100 (about 2^20 * PI / 2)
 * @returns {Number} cosine of x, NaN if x is NaN or infinite
 * @throws {RangeError} if x is finite and too large
 */
export function cos (x) {
  const ix = high(x) & 0x7fffffff
  if (ix <= 0x3fe921fb) { // |x| ~< PI/4
    return kernelCos(x, 0)
  }
  if (ix >= 0x7ff00000) { // NaN or infinite
    return NaN
  }
  if (ix > maxHigh) {
    throw tooLarge(x)
  }
  switch (remPio2(x) & 3) {
    case 0: return kernelCos(reduced[0], reduced[1])
    case 1: return -kernelSin(reduced[0], reduced[1], true)
    case 2: return -kernelCos(reduced[0], reduced[1])
    default: return kernelSin(reduced[0], reduced[1], true)
  }
}

// arctangent, atanHi[i] + atanLo[i] = atan(0.5), atan(1), atan(1.5), atan(inf)
const atanHi = [
  4.63647609000806093515e-01,
  7.85398163397448278999e-01,
  9.82793723247329054082e-01,
  1.57079632679489655800e+00
]
const atanLo = [
  2.26987774529616870924e-17,
  3.06161699786838301793e-17,
  1.39033110312309984516e-17,
  6.12323399573676603587e-17
]
const aT = [
  3.33333333333329318027e-01,
  -1.99999999998764832476e-01,
  1.42857142725034663711e-01,
  -1.11111104054623557880e-01,
  9.09088713343650656196e-02,
  -7.69187620504482999495e-02,
  6.66107313738753120669e-02,
  -5.83357013379057348645e-02,
  4.97687799461593236017e-02,
  -3.65315727442169155270e-02,
  1.62858201153657823623e-02
]

const atan = (x) => {
  const hx = high(x)
  const ix = hx & 0x7fffffff
  if (ix >= 0x44100000) { // |x| >= 2^66, x is not NaN here
    return hx > 0 ? atanHi[3] + atanLo[3] : -atanHi[3] - atanLo[3]
  }
  let id
  if (ix < 0x3fdc0000) { // |x| < 0.4375
    if (ix < 0x3e200000) { // |x| < 2^-29
      return x
    }
    id = -1
  } else {
    x = Math.abs(x)
    if (ix < 0x3ff30000) { // |x| < 1.1875
      if (ix < 0x3fe60000) { // 7/16 <= |x| < 11/16
        id = 0
        x = (2 * x - 1) / (2 + x)
      } else { // 11/16 <= |x| < 19/16
        id = 1
        x = (x - 1) / (x + 1)
      }
    } else if (ix < 0x40038000) { // |x| < 2.4375
      id = 2
      x = (x - 1.5) / (1 + 1.5 * x)
    } else { // 2.4375 <= |x| < 2^66
      id = 3
      x = -1 / x
    }
  }
  // odd and even parts of the polynomial
  const z = x * x
  const w = z * z
  const s1 = z * (aT[0] + w * (aT[2] + w * (aT[4] + w * (aT[6] + w * (aT[8] + w * aT[10])))))
  const s2 = w * (aT[1] + w * (aT[3] + w * (aT[5] + w * (aT[7] + w * aT[9]))))
  if (id < 0) {
    return x - x * (s1 + s2)
  }
  const result = atanHi[id] - ((x * (s1 + s2) - atanLo[id]) - x)
  return hx < 0 ? -result : result
}

const pi = 3.14159265358979311600e+00
const piLo = 1.2246467991473532e-16 // PI - pi
const piO2 = 1.57079632679489655800e+00
const piO4 = 7.8539816339744827900e-01

/**
 * Arctangent of y / x in [-PI, PI], the same in every engine. -PI only for
 * y = -0 and negative x.
 *
 * @param {Number} y y coordinate
 * @param {Number} x x coordinate
 * @returns {Number} angle of (x, y) in radians
 */
export function atan2 (y, x) {
  if (Number.isNaN(x) || Number.isNaN(y)) {
    return NaN
  }
  if (x === 1) {
    return atan(y)
  }
  const hx = high(x)
  const hy = high(y)
  const ix = hx & 0x7fffffff
  const iy = hy & 0x7fffffff
  let m = ((hy >> 31) & 1) | ((hx >> 30) & 2) // 2 * sign(x) + sign(y)

  if (y === 0) {
    switch (m) {
      case 0:
      case 1: return y // atan(+-0 / +anything) = +-0
      case 2: return pi // atan(+0 / -anything) = PI
      default: return -pi // atan(-0 / -anything) = -PI
    }
  }
  if (x === 0) {
    return hy < 0 ? -piO2 : piO2
  }
  if (ix === 0x7ff00000) { // x is infinite
    if (iy === 0x7ff00000) {
      switch (m) {
        case 0: return piO4 // atan(+inf / +inf)
        case 1: return -piO4 // atan(-inf / +inf)
        case 2: return 3 * piO4 // atan(+inf / -inf)
        default: return -3 * piO4 // atan(-inf / -inf)
      }
    }
    switch (m) {
      case 0: return 0 // atan(+finite / +inf)
      case 1: return -0 // atan(-finite / +inf)
      case 2: return pi // atan(+finite / -inf)
      default: return -pi // atan(-finite / -inf)
    }
  }
  if (iy === 0x7ff00000) { // y is infinite
    return hy < 0 ? -piO2 : piO2
  }

  const k = (iy - ix) >> 20 // difference of exponents
  let z
  if (k > 60) { // |y / x| > 2^60, PI/2 for either sign of x (FreeBSD msun)
    z = piO2 + 0.5 * piLo
    m &= 1
  } else if (hx < 0 && k < -60) { // |y| / x < -2^60
    z = 0
  } else {
    z = atan(Math.abs(y / x))
  }
  switch (m) {
    case 0: return z // atan(+, +)
    case 1: return -z // atan(-, +)
    case 2: return pi - (z - piLo) // atan(+, -)
    default: return (z - piLo) - pi // atan(-, -)
  }
}
