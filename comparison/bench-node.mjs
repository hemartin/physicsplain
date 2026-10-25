/*
 * Measures all benchmark cases in Node and writes bench-results.json, which
 * the page shows. Run from anywhere: node comparison/bench-node.mjs
 */
import { writeFileSync } from 'node:fs'
import { cases, measure } from './bench.js'
import * as v010 from './lib/v0.1.0/physicsplain.js'
import * as v020 from './lib/v0.2.0/physicsplain.js'

const results = []
for (const benchCase of cases) {
  const [old, now] = measure(benchCase, [v010, v020])
  results.push({ id: benchCase.id, v010: old, v020: now })
  console.log(
    `${benchCase.group} / ${benchCase.label}: ` +
    `v0.1.0 ${old.toFixed(2)} µs, v0.2.0 ${now.toFixed(2)} µs, ${(old / now).toFixed(2)}×`
  )
}

const output = {
  measured: new Date().toISOString().slice(0, 10),
  runtime: `Node.js ${process.version}`,
  results
}
writeFileSync(new URL('./bench-results.json', import.meta.url), JSON.stringify(output, null, 2) + '\n')
