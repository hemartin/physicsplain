import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeHashes, expectedHashes } from './determinism.js'

// test/browsers.js checks the same hashes in Chromium, Firefox and WebKit
const actualHashes = await computeHashes()

for (const name of Object.keys(expectedHashes)) {
  test(`${name} gives the committed hash`, () => {
    assert.equal(actualHashes[name], expectedHashes[name])
  })
}
