/**
 * Runs the hashes of determinism.js in Chromium, Firefox and WebKit and
 * compares them with the committed ones, like determinism.test.js does in
 * Node. Install the browsers once with `npx playwright install`.
 *
 * @author Martin Hentschel
 */
import { readFile } from 'node:fs/promises'
import { chromium, firefox, webkit } from 'playwright'

// https so that pages may use crypto.subtle; requests are answered from the
// repository, nothing goes over the network
const origin = 'https://physicsplain.test'
const root = new URL('..', import.meta.url)

let failed = false
for (const browserType of [chromium, firefox, webkit]) {
  const browser = await browserType.launch()
  try {
    const page = await browser.newPage()
    await page.route(`${origin}/**`, async (route) => {
      const { pathname } = new URL(route.request().url())
      if (pathname === '/') {
        await route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>determinism</title>' })
      } else {
        await route.fulfill({ contentType: 'text/javascript', body: await readFile(new URL(`.${pathname}`, root)) })
      }
    })
    await page.goto(`${origin}/`)
    const { actual, expected } = await page.evaluate(async () => {
      const { computeHashes, expectedHashes } = await import('/test/determinism.js')
      return { actual: await computeHashes(), expected: expectedHashes }
    })
    for (const name of Object.keys(expected)) {
      const ok = actual[name] === expected[name]
      failed ||= !ok
      console.log(`${ok ? 'ok    ' : 'FAILED'} ${browserType.name()} ${browser.version()} ${name}${ok ? '' : ` ${actual[name]}`}`)
    }
  } finally {
    await browser.close()
  }
}
process.exitCode = failed ? 1 : 0
