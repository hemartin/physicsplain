/*
 * Scenes shown side by side, built once with physicsplain v0.1.0 and once
 * with v0.2.0. Each scene's build(lib) gets the library's module namespace
 * and returns the bodies plus optional hooks, so both columns run exactly
 * the same setup.
 *
 * No DOM access here: bench.js and the Node checks import this file too.
 */

// FixedLine was renamed to FixedFloor after v0.1.0
export const floorClass = (lib) => lib.FixedFloor ?? lib.FixedLine

const v = (lib, x, y) => new lib.Vector(x, y)

// colors of the bug demos, from the palette of the examples page
export const palette = {
  background: '#e9ebe3',
  body: '#0b3536',
  accent: '#0098d8',
  spark: '#f54123',
  fixed: '#5d7374',
  faint: '#c9cdbf'
}

/*
 * Penetration depth of two rectangles (separating axis test), 0 if they
 * don't overlap. Used by readouts only, independent of either library.
 */
export function overlapDepth (a, b) {
  let min = Infinity
  for (const body of [a, b]) {
    for (let e = 0; e < 2; e++) {
      let ax = body.cornerX[e + 1] - body.cornerX[e]
      let ay = body.cornerY[e + 1] - body.cornerY[e]
      const len = Math.hypot(ax, ay)
      ax /= len
      ay /= len
      let lo1 = Infinity; let hi1 = -Infinity; let lo2 = Infinity; let hi2 = -Infinity
      for (let k = 0; k < 4; k++) {
        const p1 = -a.cornerX[k] * ay + a.cornerY[k] * ax
        const p2 = -b.cornerX[k] * ay + b.cornerY[k] * ax
        lo1 = Math.min(lo1, p1); hi1 = Math.max(hi1, p1)
        lo2 = Math.min(lo2, p2); hi2 = Math.max(hi2, p2)
      }
      const overlap = Math.min(hi1, hi2) - Math.max(lo1, lo2)
      if (!(overlap > 0)) {
        return 0
      }
      min = Math.min(min, overlap)
    }
  }
  return min
}

function maxOverlap (bodies) {
  let max = 0
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      max = Math.max(max, overlapDepth(bodies[i], bodies[j]))
    }
  }
  return max
}

const pct = (x) => `${Math.round(x * 100)} %`
const fixed2 = (x) => Number.isFinite(x) ? x.toFixed(2) : String(x)

/* ------------------------------------------------------------------------
 * The four examples, as in main.js of each version (only FixedLine was
 * renamed to FixedFloor in between).
 * --------------------------------------------------------------------- */

export const examples = [
  {
    id: 'example1',
    title: 'Example 1',
    caption: 'An object forces other objects out of its way.',
    background: '#e0e5db',
    repeat: 4000,
    build (lib) {
      const moving = [
        [-1.3, 0], [-0.4, 0.09], [-0.4, -0.09], [-0.2, 0.09], [-0.2, -0.09],
        [0.2, 0.09], [0.2, -0.09], [0.4, 0.09], [0.4, -0.09]
      ].map(([x, y], i) => new lib.Body(i).setOrigin(x, y).finalize())
      const fixed = [
        new lib.FixedBody(9).setOrigin(0, 0.38).setDimension(0.1, 0.5).finalize(),
        new lib.FixedBody(10).setOrigin(0, -0.38).setDimension(0.1, 0.5).finalize()
      ]
      for (const body of moving) {
        body.lateralFriction = 1
        body.rotationalFriction = 7
      }
      moving[0].setTarget(8, 0)
      moving[0].thrust = 8
      return {
        moving,
        fixed,
        color: (body) => body.isFixedBody() ? '#de3d83' : body.id === 0 ? '#00b8b8' : '#e4bd0b'
      }
    }
  },
  {
    id: 'example2',
    title: 'Example 2',
    caption: 'Objects falling from the sky.',
    background: '#0098d8',
    repeat: 7000,
    build (lib) {
      const moving = [-0.7, -0.5, -0.3, 0.3, 0.5, 0.7]
        .map((x, i) => new lib.Body(i).setOrigin(x, 0.5).finalize())
      const fixed = [
        new lib.FixedBody(6).setOrigin(-0.7, -0.5).setAngle(-0.1 * Math.PI).setDimension(1, 0.5).finalize(),
        new lib.FixedBody(7).setOrigin(0.7, -0.5).setAngle(0.1 * Math.PI).setDimension(1, 0.5).finalize()
      ]
      for (const body of moving) {
        body.lateralFriction = 0.5
        body.rotationalFriction = 2
        body.setForce(0, -2)
      }
      return {
        moving,
        fixed,
        color: (body) => body.isFixedBody() ? '#0b3536' : body.id < 3 ? '#e5e7de' : '#f54123'
      }
    }
  },
  {
    id: 'example3',
    title: 'Example 3',
    caption: 'Bouncing off arcs and circles.',
    background: '#f45844',
    repeat: 4000,
    build (lib) {
      const moving = [[-0.9, 0.4], [-0.8, 0.28], [-0.7, 0.16]]
        .map(([x, y], i) => new lib.Body(i).setOrigin(x, y).finalize())
      const fixed = [
        new lib.FixedBody(3).setOrigin(0, 0.6).setDimension(2, 0.2).finalize(),
        new lib.FixedBody(4).setOrigin(0, -0.6).setDimension(2, 0.2).finalize(),
        new lib.FixedCircle(31, v(lib, 0.1, 0), 0.15),
        new lib.FixedCircle(30, v(lib, 0.5, 0), 0.15),
        new lib.FixedArc(32, v(lib, 0.5, 0), 0.5, 0.2, 0, Math.PI * 0.5),
        new lib.FixedArc(33, v(lib, 0.5, 0), 0.5, 0.2, Math.PI * 1.5, Math.PI * 2)
      ]
      for (const body of moving) {
        body.velocity.x = 3
      }
      return {
        moving,
        fixed,
        color: (body) => body.isFixedBody() ? '#2f292b' : '#dfe0e2',
        // wall with a round cut-out and two circles, as in main.js
        drawUnder (g) {
          g.polygon([[0.5, 0.5], [1, 0.5], [1, -0.5], [0.5, -0.5]], '#2f292b')
          g.circle(0.5, 0, 0.5, '#f45844')
          g.circle(0.1, 0, 0.15, '#2f292b')
          g.circle(0.5, 0, 0.15, '#2f292b')
        },
        skipFixedShapes: true
      }
    }
  },
  {
    id: 'example4',
    title: 'Example 4',
    caption: 'Bouncing off a wall and a floor made of fixed, one-way lines.',
    background: '#fff4c4',
    repeat: 3000,
    build (lib) {
      const Floor = floorClass(lib)
      const moving = [[-0.8, 0.35], [-0.8, 0.05], [-0.8, -0.35]]
        .map(([x, y], i) => new lib.Body(i).setOrigin(x, y).finalize())
      const fixed = [
        new Floor(3, v(lib, 0.5, -1), v(lib, 0.5, 1)),
        new Floor(4, v(lib, -0.1, -0.6), v(lib, 1, 0))
      ]
      moving[0].velocity.x = 2.2
      moving[1].velocity.x = 2.2
      moving[1].angularVelocity = 4
      moving[2].velocity.x = 2.2
      return {
        moving,
        fixed,
        color: () => '#7e5c9f',
        // shaded back sides of the lines, as in main.js
        drawUnder (g) {
          for (const width of [1, 0.01]) {
            for (const floor of fixed) {
              const nx = floor.normal.x * width
              const ny = floor.normal.y * width
              g.polygon([
                [floor.start.x, floor.start.y], [floor.start.x - nx, floor.start.y - ny],
                [floor.end.x - nx, floor.end.y - ny], [floor.end.x, floor.end.y]
              ], width === 1 ? '#d2c4e0' : '#66408b')
            }
          }
        },
        skipFixedShapes: true
      }
    }
  }
]

/* ------------------------------------------------------------------------
 * Bug demos
 * --------------------------------------------------------------------- */

// ground: a wide fixed body whose top edge is at y = -0.45
const ground = (lib, id = 100) =>
  new lib.FixedBody(id).setOrigin(0, -0.6).setDimension(2.4, 0.3).finalize()

export const bugs = [
  {
    id: 'sink',
    title: 'Stacked boxes sink into each other',
    issues: [2, 3],
    prs: [26, 28],
    repeat: 6000,
    wrong: 'A corner sitting exactly on the side edge of the box below (boxes of the same width, stacked straight) made that side edge the contact edge. The contact normal pointed sideways, so nothing held the upper box up. On top of that, the penetration depth was computed but never corrected, so overlap only grew under gravity.',
    fixed: 'The contact edge is now the edge of least penetration of the colliding box, corners on a side edge no longer count as crossing it, and a small bias velocity (Baumgarte) pushes overlapping bodies apart.',
    look: 'Three towers of 2, 3, and 4 boxes drop onto the ground under gravity. Turn on “Show contacts” to see the sideways normals in v0.1.0.',
    build (lib) {
      const moving = []
      let id = 0
      for (const [x, count] of [[-0.55, 2], [0, 3], [0.55, 4]]) {
        for (let i = 0; i < count; i++) {
          const body = new lib.Body(id++).setOrigin(x, -0.35 + i * 0.2).finalize()
          body.setForce(0, -2)
          moving.push(body)
        }
      }
      return {
        moving,
        fixed: [ground(lib)],
        restitution: 0.2,
        readout: (sim) => `deepest overlap: ${pct(maxOverlap(sim.moving) / 0.1)} of a box`
      }
    }
  },
  {
    id: 'contacts',
    title: 'Two contact points are resolved wrong',
    issues: [1],
    prs: [21, 36],
    repeat: 8000,
    wrong: 'The solver added up the impulses of all contact points and applied them together at the end of each iteration. Two contacts on the same face each pushed for the full amount, so the solver overshot, swung back and forth, and stopped at its 50-iteration cap with a more or less random result. The narrower the box, the worse.',
    fixed: 'Contacts are solved with sequential impulses (each impulse is applied right away and the accumulated impulse is clamped), and two contact points between the same two bodies are solved together (a 2×2 block solver, as in Box2D).',
    look: 'Boxes of widths 0.01 to 0.2 bounce between floor and ceiling, without gravity or friction and with restitution 1, so each should keep its speed forever.',
    build (lib) {
      const widths = [0.01, 0.02, 0.03, 0.05, 0.08, 0.12, 0.2]
      const moving = widths.map((w, i) => {
        const body = new lib.Body(i).setOrigin(-0.78 + i * 0.26, 0).setDimension(w, 0.3).finalize()
        body.setVelocity(0, -0.8)
        body.lateralFriction = 0
        body.rotationalFriction = 0
        return body
      })
      return {
        moving,
        fixed: [
          ground(lib),
          new lib.FixedBody(101).setOrigin(0, 0.6).setDimension(2.4, 0.3).finalize()
        ],
        readout: (sim) => 'speed, % of start: ' +
          sim.moving.slice(0, 4).map((b) => Math.round(Math.abs(b.velocity.y) / 0.8 * 100)).join(' · ') + ' · …'
      }
    }
  },
  {
    id: 'energy',
    title: 'Elastic bounces gain energy under gravity',
    issues: [30],
    prs: [35],
    repeat: 12000,
    wrong: 'Contacts were found first, then gravity was applied, then the impulses were solved. The bounce was computed from the velocity after this step’s gravity was added, so the extra downward velocity was reflected too, and every bounce went about 3 % higher.',
    fixed: 'The bounce is based on the normal velocity when the contact is detected, before forces are applied.',
    look: 'A box with restitution 1 is dropped from the dashed line. It should never bounce above it.',
    build (lib) {
      const body = new lib.Body(0).setOrigin(0, 0.15).finalize()
      body.setForce(0, -2)
      body.lateralFriction = 0
      body.rotationalFriction = 0
      let apex = -Infinity
      let previousVy = 0
      return {
        moving: [body],
        fixed: [ground(lib)],
        step (sim) {
          if (previousVy > 0 && body.velocity.y <= 0) {
            apex = body.origin.y
          }
          previousVy = body.velocity.y
        },
        drawUnder (g) {
          g.dashedLine([[-1, 0.2], [1, 0.2]], palette.fixed)
          g.text('drop height', -0.97, 0.23, palette.fixed)
        },
        readout: () => apex === -Infinity
          ? 'last bounce: …'
          : `last bounce: ${apex > 0.1505 ? '+' : ''}${pct((apex - 0.15) / 0.55)} vs. drop height`
      }
    }
  },
  {
    id: 'platform',
    title: 'One-way lines catch bodies far behind them',
    issues: [6],
    prs: [24],
    repeat: 5000,
    wrong: '`FixedLine` counted every corner behind the line as a contact, at any distance. A short platform behaved like a solid block reaching down forever and held up anything below it.',
    fixed: 'Bodies behind a line (now called `FixedFloor`) pass through it, unless their origin crossed the line during the last step, so fast bodies are still pushed back to the front.',
    look: 'The red box starts just below a one-way platform and should fall to the ground. The left box lands on the platform; the right box jumps up through it.',
    build (lib) {
      const Floor = floorClass(lib)
      const make = (id, x, y) => {
        const body = new lib.Body(id).setOrigin(x, y).finalize()
        body.setForce(0, -2)
        return body
      }
      const jumper = make(2, 0.25, -0.38)
      jumper.setVelocity(0, 1.7)
      return {
        moving: [make(0, -0.25, 0.4), make(1, 0, -0.02), jumper],
        fixed: [
          new Floor(10, v(lib, -1, -0.45), v(lib, 1, -0.45)),
          new Floor(11, v(lib, -0.4, 0.08), v(lib, 0.4, 0.08))
        ],
        restitution: 0.3,
        color: (body) => body.id === 1 ? palette.spark : palette.body
      }
    }
  },
  {
    id: 'arc',
    title: 'Arcs can’t cross angle 0',
    issues: [7],
    prs: [27],
    repeat: 3000,
    wrong: '`FixedArc` compared the corner’s angle in [0, 2π) with `start < angle < end`. An arc from −π/3 to π/3 matched only its upper half, and split arcs had a gap exactly at their seam.',
    fixed: 'The angle is measured counter-clockwise from the start angle, so an arc may cross 0, and both ends are inclusive.',
    look: 'An arc from −π/3 to π/3. All three boxes should bounce back.',
    build (lib) {
      const moving = [0.15, 0, -0.15].map((y, i) => {
        const body = new lib.Body(i).setOrigin(-0.5, y).finalize()
        body.setVelocity(1.4, 0)
        body.lateralFriction = 0
        return body
      })
      const origin = { x: -0.25, y: 0 }
      return {
        moving,
        fixed: [new lib.FixedArc(10, v(lib, origin.x, origin.y), 0.4, 0.08, -Math.PI / 3, Math.PI / 3)],
        drawUnder (g) {
          g.dashedCircle(origin.x, origin.y, 0.4, palette.faint)
        },
        readout: (sim) => `escaped through the arc: ${sim.moving.filter((b) => b.origin.x > 0.3).length} of 3`
      }
    }
  },
  {
    id: 'steer',
    title: 'Target-angle steering turns the long way round',
    issues: [4, 5],
    prs: [18, 19],
    repeat: 16000,
    wrong: 'A `Math.Pi` typo (instead of `Math.PI`) meant a body’s angle never wrapped, and steering used the raw difference `targetAngle - angle`. Once the target angle wrapped from 2π back to 0, the body unwound a full turn the other way.',
    fixed: 'Angles wrap to (−π, π] everywhere, and steering turns by the wrapped difference, the short way round.',
    look: 'The needle steers towards the red dot with `setTargetAngle(Vector.angle(…))` after every step.',
    build (lib) {
      const needle = new lib.Body(0).setOrigin(0, 0).setDimension(0.5, 0.05).finalize()
      needle.rotationalFriction = 4
      needle.angleThrust = 0.4
      const dot = { x: 0.4, y: 0 }
      let error = 0
      let worst = 0
      return {
        moving: [needle],
        fixed: [],
        step (sim) {
          const angle = 1.5 * sim.steps * 0.01
          dot.x = 0.4 * Math.cos(angle)
          dot.y = 0.4 * Math.sin(angle)
          needle.setTargetAngle(lib.Vector.angle(dot.x, dot.y))
          error = Math.abs(Math.atan2(Math.sin(angle - needle.angle), Math.cos(angle - needle.angle)))
          if (sim.steps > 100) {
            worst = Math.max(worst, error)
          }
        },
        drawUnder (g) {
          g.dashedCircle(0, 0, 0.4, palette.faint)
        },
        drawOver (g, sim) {
          g.circle(dot.x, dot.y, 0.025, palette.spark)
          // turn the needle into an arrow: light tail half, head at the
          // end it points with (corners 0 and 3)
          const { cornerX: x, cornerY: y } = g.corners(needle)
          const mid = (i, j) => [(x[i] + x[j]) / 2, (y[i] + y[j]) / 2]
          g.polygon([mid(0, 1), [x[1], y[1]], [x[2], y[2]], mid(2, 3)], palette.faint)
          const [tipX, tipY] = mid(0, 3)
          const dx = (x[0] - x[1]) / 0.5
          const dy = (y[0] - y[1]) / 0.5
          g.polygon([
            [tipX + dx * 0.06, tipY + dy * 0.06],
            [tipX - dy * 0.045, tipY + dx * 0.045],
            [tipX + dy * 0.045, tipY - dx * 0.045]
          ], palette.body)
        },
        readout: () => `off target: ${Math.round(error * 180 / Math.PI)}°, worst so far: ${Math.round(worst * 180 / Math.PI)}°`
      }
    }
  },
  {
    id: 'ids',
    title: 'Bodies without ids, or with the same id, never collide',
    issues: [12],
    prs: [29],
    repeat: 3000,
    wrong: 'Pairs of moving bodies were de-duplicated by `body.id`, and contact groups were keyed by id. Bodies created with `new Body()` (no id) or sharing an id were skipped.',
    fixed: 'Pairs are visited by index and groups are keyed by the body objects, so ids no longer matter for collisions.',
    look: 'Top row: `new Body()`. Middle row: two bodies with id 7. Bottom row: ids 1 and 2.',
    build (lib) {
      const rows = [
        [0.2, [undefined, undefined], 'new Body()'],
        [-0.07, [7, 7], 'same id'],
        [-0.34, [1, 2], 'unique ids']
      ]
      const moving = []
      for (const [y, [idA, idB]] of rows) {
        const a = new lib.Body(idA).setOrigin(-0.6, y).finalize()
        a.setVelocity(1, 0)
        const b = new lib.Body(idB).setOrigin(0, y).finalize()
        for (const body of [a, b]) {
          body.lateralFriction = 0
          body.rotationalFriction = 0
        }
        moving.push(a, b)
      }
      return {
        moving,
        fixed: [],
        color: (body) => moving.indexOf(body) % 2 === 0 ? palette.accent : palette.body,
        drawUnder (g) {
          for (const [y, , label] of rows) {
            g.text(label, -0.97, y + 0.07, palette.fixed)
          }
        }
      }
    }
  },
  {
    id: 'poststep',
    title: '`postStep()` received milliseconds',
    issues: [10],
    prs: [23],
    repeat: 5000,
    wrong: '`State.postStep(fixedTimestep)`, the documented place to update physics, was called with 10 (milliseconds), while bodies are integrated in seconds (0.01).',
    fixed: '`postStep()` receives the timestep in seconds, the same value used to integrate bodies.',
    look: 'The box accelerates in `postStep()` with `body.velocity.x += 0.12 * fixedTimestep`.',
    build (lib) {
      const body = new lib.Body(0).setOrigin(-0.85, 0).finalize()
      body.lateralFriction = 0
      return {
        moving: [body],
        fixed: [],
        step (sim, fixedTimestep) {
          body.velocity.x += 0.12 * fixedTimestep
        },
        drawUnder (g) {
          for (let x = -0.8; x <= 0.81; x += 0.2) {
            g.line([[x, -0.12], [x, -0.09]], palette.fixed)
          }
        },
        readout: () => `speed: ${fixed2(body.velocity.x)} units/s`
      }
    }
  },
  {
    id: 'finalize',
    title: 'A body without `finalize()` turns into NaN',
    issues: [8],
    prs: [22],
    repeat: 3000,
    wrong: 'The inertia was only computed in `finalize()`. Without it, the inverted inertia was `1 / undefined = NaN`, which spread to the angle and corners, and through contacts to other bodies.',
    fixed: 'The constructor computes the inertia and corners from the default values, so a body works without calling `finalize()`.',
    look: 'The blue box is created without calling `finalize()` and moves towards a resting box.',
    build (lib) {
      const body = new lib.Body(0).setOrigin(-0.6, 0).setVelocity(1, 0)
      body.lateralFriction = 0
      const target = new lib.Body(1).setOrigin(0.1, 0).finalize()
      target.lateralFriction = 0
      return {
        moving: [body, target],
        fixed: [],
        color: (b) => b === body ? palette.accent : palette.body,
        readout: () => `blue box x: ${fixed2(body.origin.x)}, angle: ${fixed2(body.angle)}`
      }
    }
  },
  {
    id: 'overlaps',
    title: '`overlaps()` always returned true',
    issues: [11],
    prs: [25],
    repeat: 5000,
    wrong: '`FixedLine.overlaps()` had started to return an object `{ leftOf, rightOf, overlaps }`. An object is always truthy, so `if (line.overlaps(body))` was always taken.',
    fixed: '`overlaps()` returns a boolean again; the details moved to the new `overlapInfo()`.',
    look: 'The box turns red while `if (line.overlaps(box))` is taken. The dashed line is only checked, not collided with.',
    build (lib) {
      const Floor = floorClass(lib)
      const line = new Floor(10, v(lib, 0, -0.25), v(lib, 0, 0.25))
      const box = new lib.Body(0).setOrigin(-0.7, 0).setVelocity(0.35, 0).finalize()
      box.lateralFriction = 0
      const taken = () => Boolean(line.overlaps(box))
      return {
        moving: [box],
        fixed: [],
        color: () => taken() ? palette.spark : palette.body,
        drawUnder (g) {
          g.dashedLine([[0, -0.25], [0, 0.25]], palette.fixed)
        },
        readout: () => {
          const result = line.overlaps(box)
          return `line.overlaps(box) → ${typeof result === 'object' ? '{…} (truthy)' : result}`
        }
      }
    }
  },
  {
    id: 'judder',
    title: 'Drawing didn’t interpolate between steps',
    issues: [13],
    prs: [40],
    repeat: 8000,
    wrong: 'Physics runs in fixed 10 ms steps, but bodies were drawn at their last step. At 60 Hz, frames alternate between 1 and 2 steps, so motion stutters; at 144 Hz, some frames show no movement at all.',
    fixed: 'Bodies remember their previous origin and angle, `postAdvance(now, alpha)` passes how far the current time is between two steps, and `interpolatedCorners(alpha)` draws them in between.',
    look: 'Two boxes glide back and forth. The stutter depends on your display’s refresh rate; at ¼ speed it is obvious on any display.',
    build (lib) {
      const moving = [[0.2, 0.6, 0], [-0.2, 1.1, 0.8]].map(([y, speed, spin], i) => {
        const body = new lib.Body(i).setOrigin(-0.5, y).finalize()
        body.setVelocity(speed, 0)
        body.setAngularVelocity(spin)
        body.lateralFriction = 0
        body.rotationalFriction = 0
        return body
      })
      return {
        moving,
        fixed: [
          new lib.FixedBody(10).setOrigin(-0.95, 0).setDimension(0.1, 1.2).finalize(),
          new lib.FixedBody(11).setOrigin(0.95, 0).setDimension(0.1, 1.2).finalize()
        ],
        drawUnder (g) {
          for (let x = -0.8; x <= 0.81; x += 0.1) {
            g.line([[x, -0.45], [x, -0.4]], palette.faint)
            g.line([[x, 0.4], [x, 0.45]], palette.faint)
          }
        }
      }
    }
  }
]

// Example 1 again, for the hidden-tab demo
export const freezeScene = {
  ...examples[0],
  id: 'freeze',
  repeat: 1e12
}
