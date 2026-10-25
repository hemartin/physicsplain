/*
 * Runs the benchmark cases in the browser, off the main thread, with fewer
 * and shorter runs than bench-node.mjs. Posts one message per case.
 */
/* global self */
import { cases, measure } from './bench.js'
import * as v010 from './lib/v0.1.0/physicsplain.js'
import * as v020 from './lib/v0.2.0/physicsplain.js'

self.addEventListener('message', () => {
  cases.forEach((benchCase, index) => {
    const [old, now] = measure(benchCase, [v010, v020], { warmup: 1, minRuns: 3, minTime: 300 })
    self.postMessage({ type: 'result', index, id: benchCase.id, v010: old, v020: now })
  })
  self.postMessage({ type: 'done' })
})
