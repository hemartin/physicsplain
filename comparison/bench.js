/*
 * Benchmark cases, run with both library versions by bench-node.mjs (Node)
 * and bench-worker.js (browser). Each case's setup(lib) returns a function
 * that does the whole workload once, from a fresh state, and the number of
 * steps (or calls) it makes.
 */
import { examples } from './scenes.js'
import { createSim } from './sim.js'

// small seeded random number generator (mulberry32), so both versions get
// the same bodies
function random (seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// count boxes of size on a grid in the arena x in [-0.9, 0.9], y in [-0.4, 0.4]
function grid (lib, count, size, rand) {
  const columns = Math.ceil(Math.sqrt(count * 2.25))
  const rows = Math.ceil(count / columns)
  const bodies = []
  for (let i = 0; i < count; i++) {
    const x = -0.85 + (1.7 * ((i % columns) + 0.5)) / columns
    const y = -0.35 + (0.7 * (Math.floor(i / columns) + 0.5)) / rows
    const body = new lib.Body(i)
      .setOrigin(x, y)
      .setDimension(size, size)
      .setAngle(rand() * Math.PI)
      .finalize()
    bodies.push(body)
  }
  return bodies
}

function walls (lib, firstId) {
  return [
    new lib.FixedBody(firstId).setOrigin(0, -0.6).setDimension(2.4, 0.2).finalize(),
    new lib.FixedBody(firstId + 1).setOrigin(0, 0.6).setDimension(2.4, 0.2).finalize(),
    new lib.FixedBody(firstId + 2).setOrigin(-1.1, 0).setDimension(0.2, 1.4).finalize(),
    new lib.FixedBody(firstId + 3).setOrigin(1.1, 0).setDimension(0.2, 1.4).finalize()
  ]
}

function arena (count, size) {
  return {
    build (lib) {
      const rand = random(count)
      const moving = grid(lib, count, size, rand)
      for (const body of moving) {
        body.setVelocity(rand() * 2 - 1, rand() * 2 - 1)
        body.setAngularVelocity(rand() * 4 - 2)
        body.lateralFriction = 0
        body.rotationalFriction = 0
      }
      return { moving, fixed: walls(lib, count) }
    }
  }
}

function stepsCase (scene, steps) {
  return (lib) => ({
    calls: steps,
    run () {
      const sim = createSim(lib, scene)
      for (let i = 0; i < steps; i++) {
        sim.advanceByTimestep(0.01)
      }
    }
  })
}

export const cases = [
  {
    id: 'detect-100',
    group: 'Collision detection',
    label: '100 boxes, none touching',
    short: 'Collision detection, 100 boxes',
    unit: 'per collide() call',
    detail: 'State.collide() only, bodies don’t move, so both versions do exactly the same work.',
    setup (lib) {
      const sim = createSim(lib, {
        build: (lib) => ({ moving: grid(lib, 100, 0.03, random(1)), fixed: walls(lib, 100) })
      })
      return {
        calls: 200,
        run () {
          for (let i = 0; i < 200; i++) {
            sim.collide(0.01)
          }
        }
      }
    }
  },
  ...examples.map((scene) => ({
    id: scene.id,
    group: 'Examples page',
    label: `${scene.title}, one cycle (${scene.repeat / 1000} s)`,
    short: scene.title,
    unit: 'per step',
    detail: 'A full step (collide, forces, impulses, advance) from the start of the example.',
    setup: stepsCase(scene, scene.repeat / 10)
  })),
  ...[25, 50, 100, 200].map((count) => ({
    id: `arena-${count}`,
    group: 'Many bodies',
    label: `${count} boxes bouncing in a closed box`,
    short: `${count} bouncing boxes`,
    unit: 'per step',
    detail: 'No gravity or friction, restitution 1, 1 s.',
    setup: stepsCase(arena(count, 0.04), 100)
  })),
  {
    id: 'pile-40',
    group: 'Many bodies',
    label: '40 boxes piling up under gravity',
    short: '40 boxes piling up',
    unit: 'per step',
    detail: 'Mostly resting contacts, where the solver does most of the work, 3 s.',
    setup: stepsCase({
      build (lib) {
        const moving = grid(lib, 40, 0.07, random(40))
        for (const body of moving) {
          body.setForce(0, -2)
        }
        return { moving, fixed: walls(lib, 40), restitution: 0.2 }
      }
    }, 300)
  }
]

const now = () => performance.now()

/*
 * Times one case: runs the workload warmup times, then measures at least
 * minRuns runs and for at least minTime ms, alternating between the two
 * versions so that both see the same machine state. Returns the median
 * time per call in microseconds for each version.
 */
export function measure (benchCase, libs, { warmup = 3, minRuns = 7, minTime = 1500 } = {}) {
  const workloads = libs.map((lib) => benchCase.setup(lib))
  for (let i = 0; i < warmup; i++) {
    for (const workload of workloads) {
      workload.run()
    }
  }
  const samples = libs.map(() => [])
  const start = now()
  while (samples[0].length < minRuns || now() - start < minTime) {
    workloads.forEach((workload, i) => {
      const t0 = now()
      workload.run()
      samples[i].push(((now() - t0) * 1000) / workload.calls)
    })
    if (samples[0].length >= 60) {
      break
    }
  }
  return samples.map((list) => {
    list.sort((a, b) => a - b)
    return list[Math.floor(list.length / 2)]
  })
}
