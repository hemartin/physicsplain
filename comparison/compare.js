/*
 * Runs every scene twice, with physicsplain v0.1.0 on the left and v0.2.0
 * on the right, on one shared clock per row. Also renders
 * the benchmark results and runs the benchmark in a worker on request.
 */
import * as v010 from './lib/v0.1.0/physicsplain.js'
import * as v020 from './lib/v0.2.0/physicsplain.js'
import { bugs, examples, floorClass, freezeScene, palette } from './scenes.js'
import { createSim } from './sim.js'
import { cases } from './bench.js'

const repo = 'https://github.com/hemartin/physicsplain'

const versions = [
  { key: 'old', label: 'v0.1.0', lib: v010 },
  { key: 'new', label: 'v0.2.0', lib: v020 }
]

// virtual clock of a row starts here; both versions treat 0 as "not started"
const clockStart = 1000

const settings = {
  paused: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  speed: 1,
  contacts: false
}

const pairs = []

/* ---------- DOM helpers ---------- */

function el (tag, className, children = []) {
  const node = document.createElement(tag)
  if (className) {
    node.className = className
  }
  for (const child of [].concat(children)) {
    node.append(child)
  }
  return node
}

// text with `code` spans
function rich (text) {
  return text.split('`').map((part, i) => i % 2 === 1 ? el('code', null, part) : part)
}

function link (href, text) {
  const a = el('a', null, text)
  a.href = href
  return a
}

function refs (scene) {
  const parts = []
  const add = (label, numbers, path) => {
    if (!numbers?.length) {
      return
    }
    parts.push(numbers.length > 1 ? label + 's ' : label + ' ')
    numbers.forEach((n, i) => {
      if (i > 0) {
        parts.push(', ')
      }
      parts.push(link(`${repo}/${path}/${n}`, `#${n}`))
    })
  }
  add('Issue', scene.issues, 'issues')
  if (scene.prs?.length) {
    parts.push(' · fixed in ')
  }
  add('PR', scene.prs, 'pull')
  return el('p', 'refs', parts)
}

/* ---------- Rows ---------- */

function createRow (scene, container, kind) {
  const row = el('article', `row row-${kind}`)
  row.id = scene.id

  const head = el('div', 'row-head')
  const title = el('h3', null, rich(scene.title))
  head.append(title)
  if (kind === 'bug') {
    head.append(refs(scene))
  }
  const text = kind === 'example' ? scene.caption : scene.look
  if (text) {
    head.append(el('p', 'look', rich(text)))
  }
  row.append(head)

  const pairEl = el('div', 'pair')
  const pair = { scene, row, cells: [], clock: clockStart, visible: false }
  for (const version of versions) {
    const canvas = el('canvas')
    canvas.setAttribute('role', 'img')
    canvas.setAttribute('aria-label', `${scene.title.replaceAll('`', '')}, simulated with physicsplain ${version.label}`)
    const readout = el('output', 'readout')
    const cell = el('div', `cell cell-${version.key}`, [
      el('div', 'canvas-wrap', [el('span', 'tag', version.label), canvas]),
      readout
    ])
    if (kind === 'bug') {
      cell.append(el('p', 'note', version.key === 'old'
        ? [el('strong', null, 'Bug: '), ...rich(scene.wrong)]
        : [el('strong', null, 'Fix: '), ...rich(scene.fixed)]))
    }
    pairEl.append(cell)
    pair.cells.push({ version, canvas, ctx: canvas.getContext('2d'), readout, sim: null })
  }
  row.append(pairEl)

  const tools = el('div', 'row-tools')
  const restartButton = el('button', 'button-quiet', '↺ Restart')
  restartButton.type = 'button'
  restartButton.addEventListener('click', () => restart(pair))
  tools.append(restartButton)
  row.append(tools)

  container.append(row)
  restart(pair)
  pairs.push(pair)
  return pair
}

function restart (pair) {
  pair.clock = clockStart
  for (const cell of pair.cells) {
    cell.sim = createSim(cell.version.lib, pair.scene)
    cell.sim.advance(pair.clock)
    cell.note = null
  }
  updateReadouts(pair)
}

/* ---------- Drawing ---------- */

function resize (cell) {
  const dpr = window.devicePixelRatio || 1
  const width = Math.round(cell.canvas.clientWidth * dpr)
  const height = Math.round(width * 260 / 500)
  if (width > 0 && (cell.canvas.width !== width || cell.canvas.height !== height)) {
    cell.canvas.width = width
    cell.canvas.height = height
  }
}

// drawing helpers in world coordinates, as in main.js: x from -1 (left
// edge) to 1 (right edge), y = 0 in the middle, y up
function graphics (cell) {
  const { canvas, ctx, sim } = cell
  const scale = canvas.width / 2
  const X = (x) => scale * (x + 1)
  const Y = (y) => -scale * y + canvas.height / 2
  const px = canvas.width / 500
  const path = (points) => {
    ctx.beginPath()
    points.forEach(([x, y], i) => i === 0 ? ctx.moveTo(X(x), Y(y)) : ctx.lineTo(X(x), Y(y)))
  }
  return {
    px,
    polygon (points, color) {
      path(points)
      ctx.closePath()
      ctx.fillStyle = color
      ctx.fill()
    },
    circle (x, y, r, color) {
      ctx.beginPath()
      ctx.arc(X(x), Y(y), r * scale, 0, 2 * Math.PI)
      ctx.fillStyle = color
      ctx.fill()
    },
    dashedCircle (x, y, r, color) {
      ctx.beginPath()
      ctx.arc(X(x), Y(y), r * scale, 0, 2 * Math.PI)
      ctx.setLineDash([4 * px, 4 * px])
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5 * px
      ctx.stroke()
      ctx.setLineDash([])
    },
    line (points, color, width = 1.5) {
      path(points)
      ctx.strokeStyle = color
      ctx.lineWidth = width * px
      ctx.stroke()
    },
    dashedLine (points, color) {
      ctx.setLineDash([5 * px, 4 * px])
      this.line(points, color)
      ctx.setLineDash([])
    },
    text (string, x, y, color) {
      ctx.fillStyle = color
      ctx.font = `${12 * px}px system-ui, sans-serif`
      ctx.fillText(string, X(x), Y(y))
    },
    // annular sector of a FixedArc: from radius to radius + width,
    // counter-clockwise from start to end angle
    arcBand (arc, color) {
      ctx.beginPath()
      ctx.arc(X(arc.origin.x), Y(arc.origin.y), (arc.radius + arc.width) * scale, -arc.startAngle, -arc.endAngle, true)
      ctx.arc(X(arc.origin.x), Y(arc.origin.y), arc.radius * scale, -arc.endAngle, -arc.startAngle, false)
      ctx.closePath()
      ctx.fillStyle = color
      ctx.fill()
    },
    // corners as each version's examples draw them: v0.1.0 at the last
    // step, v0.2.0 between the last two steps
    corners (body) {
      if (sim.alpha !== undefined && body.interpolatedCorners) {
        return body.interpolatedCorners(sim.alpha)
      }
      return { cornerX: body.cornerX, cornerY: body.cornerY }
    },
    body (body, color) {
      const { cornerX, cornerY } = this.corners(body)
      this.polygon([0, 1, 2, 3].map((i) => [cornerX[i], cornerY[i]]), color)
    }
  }
}

function draw (pair, cell) {
  resize(cell)
  const { canvas, ctx, sim } = cell
  const lib = cell.version.lib
  const setup = sim.setup
  ctx.fillStyle = pair.scene.background ?? palette.background
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const g = graphics(cell)
  const color = (body) => setup.color?.(body) ?? (body.isFixedBody?.() ? palette.fixed : palette.body)

  setup.drawUnder?.(g, sim)
  for (const entity of sim.fixed) {
    if (entity instanceof lib.Body) {
      g.body(entity, color(entity))
    } else if (!setup.skipFixedShapes) {
      drawFixedShape(g, entity, lib)
    }
  }
  for (const body of sim.moving) {
    g.body(body, color(body))
  }
  setup.drawOver?.(g, sim)

  if (settings.contacts) {
    drawContacts(cell, g)
  }
}

function drawFixedShape (g, entity, lib) {
  if (entity instanceof lib.FixedArc) {
    g.arcBand(entity, palette.fixed)
  } else if (entity instanceof lib.FixedCircle) {
    g.circle(entity.origin.x, entity.origin.y, entity.radius, palette.fixed)
  } else if (entity instanceof floorClass(lib)) {
    // the line, with a narrow band on its back side
    const nx = entity.normal.x * 0.025
    const ny = entity.normal.y * 0.025
    g.polygon([
      [entity.start.x, entity.start.y], [entity.end.x, entity.end.y],
      [entity.end.x - nx, entity.end.y - ny], [entity.start.x - nx, entity.start.y - ny]
    ], palette.faint)
    g.line([[entity.start.x, entity.start.y], [entity.end.x, entity.end.y]], palette.fixed, 3)
  }
}

// contact points of the last step, with their normals
function drawContacts (cell, g) {
  const { ctx, canvas } = cell
  const scale = canvas.width / 2
  const X = (x) => scale * (x + 1)
  const Y = (y) => -scale * y + canvas.height / 2
  for (const collision of cell.sim.contacts) {
    for (const cp of collision.collisionPoints) {
      const x = cp.contactPointX
      const y = cp.contactPointY
      ctx.strokeStyle = '#d6007a'
      ctx.lineWidth = 2 * g.px
      ctx.beginPath()
      ctx.moveTo(X(x), Y(y))
      ctx.lineTo(X(x + cp.normalX * 0.08), Y(y + cp.normalY * 0.08))
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(X(x), Y(y), 3.5 * g.px, 0, 2 * Math.PI)
      ctx.fillStyle = '#d6007a'
      ctx.fill()
      ctx.lineWidth = 1.5 * g.px
      ctx.strokeStyle = '#ffffff'
      ctx.stroke()
    }
  }
}

function updateReadouts (pair) {
  for (const cell of pair.cells) {
    const text = cell.note ?? (cell.sim.setup.readout ? cell.sim.setup.readout(cell.sim) : '')
    if (cell.readout.textContent !== text) {
      cell.readout.textContent = text
    }
    cell.readout.hidden = text === ''
  }
}

/* ---------- Main loop ---------- */

let lastFrame = null
let lastReadout = 0

function frame (now) {
  const elapsed = lastFrame === null ? 0 : Math.min(now - lastFrame, 100)
  lastFrame = now
  const dt = settings.paused ? 0 : elapsed * settings.speed
  const refreshReadouts = now - lastReadout > 150
  if (refreshReadouts) {
    lastReadout = now
  }

  for (const pair of pairs) {
    if (!pair.visible) {
      continue
    }
    pair.clock += dt
    if (pair.clock - clockStart > pair.scene.repeat) {
      restart(pair)
    }
    for (const cell of pair.cells) {
      cell.sim.advance(pair.clock)
      draw(pair, cell)
    }
    if (refreshReadouts) {
      updateReadouts(pair)
    }
  }
  window.requestAnimationFrame(frame)
}

// only rows on screen run; a row restarts when it scrolls into view
const observer = new window.IntersectionObserver((entries) => {
  for (const entry of entries) {
    const pair = pairs.find((p) => p.row === entry.target)
    if (entry.isIntersecting && !pair.visible) {
      restart(pair)
    }
    pair.visible = entry.isIntersecting
  }
}, { rootMargin: '80px' })

/* ---------- Controls ---------- */

function setupControls () {
  const playButton = document.getElementById('play')
  const showPlayState = () => {
    playButton.textContent = settings.paused ? '▶ Play' : '❚❚ Pause'
    playButton.setAttribute('aria-pressed', String(settings.paused))
  }
  playButton.addEventListener('click', () => {
    settings.paused = !settings.paused
    showPlayState()
  })
  showPlayState()

  for (const input of document.querySelectorAll('input[name="speed"]')) {
    input.addEventListener('change', () => {
      settings.speed = Number(input.value)
    })
  }

  const contacts = document.getElementById('show-contacts')
  contacts.addEventListener('change', () => {
    settings.contacts = contacts.checked
  })
  settings.contacts = contacts.checked

  document.getElementById('restart-all').addEventListener('click', () => {
    for (const pair of pairs) {
      restart(pair)
    }
  })
}

// hidden-tab demo: jump the clock and time each version's advance()
function setupFreeze (pair) {
  const buttons = pair.row.querySelectorAll('[data-minutes]')
  for (const button of buttons) {
    button.addEventListener('click', () => {
      const minutes = Number(button.dataset.minutes)
      for (const b of buttons) {
        b.disabled = true
      }
      for (const cell of pair.cells) {
        cell.note = 'catching up …'
      }
      updateReadouts(pair)
      // let the page paint the note before v0.1.0 blocks it
      window.requestAnimationFrame(() => setTimeout(() => {
        pair.clock += minutes * 60000
        for (const cell of pair.cells) {
          const steps = cell.sim.steps
          const t0 = window.performance.now()
          cell.sim.advance(pair.clock)
          const ms = window.performance.now() - t0
          cell.note = `advance() ran ${(cell.sim.steps - steps).toLocaleString('en-US')} steps, ` +
            `blocking the page for ${ms < 10 ? ms.toFixed(1) : Math.round(ms).toLocaleString('en-US')} ms`
        }
        updateReadouts(pair)
        for (const b of buttons) {
          b.disabled = false
        }
      }, 0))
    })
  }
}

/* ---------- Performance ---------- */

const formatMicros = (us) => us >= 100
  ? `${Math.round(us).toLocaleString('en-US')} µs`
  : `${us.toPrecision(2)} µs`

const formatRatio = (r) => r >= 10 ? `${Math.round(r)}×` : `${r.toFixed(1)}×`

let nodeResults = null
const browserResults = new Map()
let chartSource = 'node'

async function setupPerformance () {
  const response = await fetch(new URL('./bench-results.json', import.meta.url))
  nodeResults = await response.json()
  const byId = new Map(nodeResults.results.map((r) => [r.id, r]))

  document.getElementById('bench-env').textContent =
    `${nodeResults.runtime}, measured ${nodeResults.measured}.`

  // stat tiles
  const ratio = (id) => byId.get(id).v010 / byId.get(id).v020
  const exampleRatios = examples.map((e) => ratio(e.id))
  document.getElementById('tile-detect').textContent = formatRatio(ratio('detect-100'))
  document.getElementById('tile-examples').textContent =
    `${formatRatio(Math.min(...exampleRatios))}–${formatRatio(Math.max(...exampleRatios))}`
  document.getElementById('tile-arena').textContent = formatRatio(ratio('arena-200'))
  document.getElementById('tile-pile').textContent = formatRatio(ratio('pile-40'))

  renderTable()
  renderChart()
  new window.ResizeObserver(() => renderChart()).observe(document.getElementById('bench-chart'))

  for (const input of document.querySelectorAll('input[name="chart-source"]')) {
    input.addEventListener('change', () => {
      chartSource = input.value
      renderChart()
    })
  }
  document.getElementById('bench-run').addEventListener('click', runBrowserBench)
}

function renderTable () {
  const byId = new Map(nodeResults.results.map((r) => [r.id, r]))
  const body = document.getElementById('bench-body')
  body.replaceChildren()
  let group = null
  for (const benchCase of cases) {
    if (benchCase.group !== group) {
      group = benchCase.group
      const th = el('th', null, group)
      th.colSpan = 5
      th.scope = 'colgroup'
      body.append(el('tr', 'group', th))
    }
    const result = byId.get(benchCase.id)
    const browser = browserResults.get(benchCase.id)
    const label = el('th', null, [
      benchCase.label,
      el('span', 'unit', ` ${benchCase.unit}`)
    ])
    label.scope = 'row'
    label.title = benchCase.detail
    body.append(el('tr', null, [
      label,
      el('td', null, formatMicros(result.v010)),
      el('td', null, formatMicros(result.v020)),
      el('td', 'ratio', formatRatio(result.v010 / result.v020)),
      el('td', 'ratio browser', browser ? formatRatio(browser.v010 / browser.v020) : '–')
    ]))
  }
}

// horizontal bars of the speed-up on a log scale, from a baseline at 1×
function renderChart () {
  const results = chartSource === 'browser' ? browserResults : new Map(nodeResults.results.map((r) => [r.id, r]))
  const svg = document.getElementById('bench-chart')
  // drawn at the size it is shown, so text keeps its CSS size on phones
  const width = Math.max(svg.clientWidth, 280)
  const labelWidth = Math.min(210, width * 0.42)
  const rowHeight = 30
  const top = 8
  const axisHeight = 28
  const rows = cases.filter((c) => results.has(c.id))
  const height = top + rows.length * rowHeight + axisHeight
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
  svg.replaceChildren()
  if (rows.length === 0) {
    return
  }

  const ns = 'http://www.w3.org/2000/svg'
  const node = (tag, attrs, text) => {
    const n = document.createElementNS(ns, tag)
    for (const [k, v] of Object.entries(attrs)) {
      n.setAttribute(k, v)
    }
    if (text !== undefined) {
      n.textContent = text
    }
    svg.append(n)
    return n
  }

  const ratios = rows.map((c) => results.get(c.id).v010 / results.get(c.id).v020)
  const min = Math.min(0.8, ...ratios.map((r) => r * 0.8))
  const max = Math.max(30, ...ratios)
  const plotLeft = labelWidth + 12
  const plotRight = width - 44
  const x = (r) => plotLeft + (Math.log(r) - Math.log(min)) / (Math.log(max) - Math.log(min)) * (plotRight - plotLeft)

  // gridlines and ticks
  for (const tick of [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100].filter((t) => t >= min && t <= max)) {
    node('line', { x1: x(tick), x2: x(tick), y1: top, y2: top + rows.length * rowHeight, class: tick === 1 ? 'baseline' : 'grid' })
    node('text', { x: x(tick), y: height - 8, class: 'tick', 'text-anchor': 'middle' }, `${tick}×`)
  }

  const tooltip = document.getElementById('bench-tooltip')
  rows.forEach((benchCase, i) => {
    const result = results.get(benchCase.id)
    const r = ratios[i]
    const y = top + i * rowHeight
    const barHeight = 14
    const barY = y + (rowHeight - barHeight) / 2
    node('text', { x: labelWidth, y: y + rowHeight / 2 + 4, class: 'label', 'text-anchor': 'end' }, benchCase.short)
    const x0 = x(1)
    const x1 = x(r)
    const left = Math.min(x0, x1)
    const barWidth = Math.max(Math.abs(x1 - x0), 2)
    // rounded data end, square at the baseline
    const radius = Math.min(4, barWidth / 2)
    const d = x1 >= x0
      ? `M${left},${barY} h${barWidth - radius} a${radius},${radius} 0 0 1 ${radius},${radius} v${barHeight - 2 * radius} a${radius},${radius} 0 0 1 -${radius},${radius} h-${barWidth - radius} z`
      : `M${left + barWidth},${barY} h-${barWidth - radius} a${radius},${radius} 0 0 0 -${radius},${radius} v${barHeight - 2 * radius} a${radius},${radius} 0 0 0 ${radius},${radius} h${barWidth - radius} z`
    node('path', { d, class: 'bar' })
    node('text', { x: Math.max(x0, x1) + 6, y: y + rowHeight / 2 + 4, class: 'value' }, formatRatio(r))

    // hit target: the whole row
    const hit = node('rect', { x: 0, y, width, height: rowHeight, class: 'hit', tabindex: 0 })
    hit.setAttribute('aria-label', `${benchCase.label}: ${formatRatio(r)} faster`)
    const show = () => {
      tooltip.replaceChildren(
        el('strong', null, `${formatRatio(r)} ${r >= 1 ? 'faster' : 'slower'}`),
        el('span', null, benchCase.label),
        el('span', null, `v0.1.0 ${formatMicros(result.v010)} → v0.2.0 ${formatMicros(result.v020)} ${benchCase.unit}`)
      )
      tooltip.hidden = false
      const box = svg.getBoundingClientRect()
      const parent = svg.parentElement.getBoundingClientRect()
      const scaleY = box.height / height
      tooltip.style.left = `${box.left - parent.left + (Math.max(x0, x1) / width) * box.width}px`
      tooltip.style.top = `${box.top - parent.top + (y + rowHeight) * scaleY}px`
    }
    hit.addEventListener('pointerenter', show)
    hit.addEventListener('focus', show)
    hit.addEventListener('pointerleave', () => { tooltip.hidden = true })
    hit.addEventListener('blur', () => { tooltip.hidden = true })
  })
}

function runBrowserBench () {
  const button = document.getElementById('bench-run')
  const status = document.getElementById('bench-status')
  button.disabled = true
  browserResults.clear()
  status.textContent = `Running case 1 of ${cases.length} …`
  const worker = new window.Worker(new URL('./bench-worker.js', import.meta.url), { type: 'module' })
  worker.addEventListener('message', (event) => {
    const message = event.data
    if (message.type === 'result') {
      browserResults.set(message.id, message)
      status.textContent = message.index + 1 < cases.length
        ? `Running case ${message.index + 2} of ${cases.length} …`
        : 'Done.'
      renderTable()
      if (chartSource === 'browser') {
        renderChart()
      }
    } else if (message.type === 'done') {
      worker.terminate()
      button.disabled = false
      button.textContent = 'Run again'
      status.textContent = 'Done. Measured in this browser, in a worker.'
      document.getElementById('chart-source-browser').disabled = false
    }
  })
  worker.addEventListener('error', (event) => {
    status.textContent = `The benchmark failed: ${event.message}`
    button.disabled = false
  })
  worker.postMessage('run')
}

/* ---------- Start ---------- */

const examplesContainer = document.getElementById('examples-rows')
for (const scene of examples) {
  createRow(scene, examplesContainer, 'example')
}
const fixesContainer = document.getElementById('fix-rows')
for (const scene of bugs) {
  createRow(scene, fixesContainer, 'bug')
}

// hidden-tab demo, with its buttons in the row head
const freezePair = createRow({
  ...freezeScene,
  title: 'Catching up after a hidden tab froze the page',
  issues: [9],
  prs: [20],
  look: 'Browsers pause animation frames in hidden tabs. When the tab comes back, `advance(now)` sees a long gap. Simulate that gap with the buttons below: v0.1.0 runs every missed 10 ms step at once, so the page freezes (this page included, for a moment).',
  wrong: '`advance()` had no cap on elapsed time, so after 10 minutes in the background it ran 60,000 steps in a single frame, for each example on the page.',
  fixed: 'Elapsed time is capped at 250 ms per call, so physics pauses instead of catching up.'
}, document.getElementById('freeze-row'), 'bug')
const freezeTools = freezePair.row.querySelector('.row-tools')
for (const minutes of [1, 10]) {
  const button = el('button', 'button', `Hide the tab for ${minutes} minute${minutes > 1 ? 's' : ''}`)
  button.type = 'button'
  button.dataset.minutes = String(minutes)
  freezeTools.insertBefore(button, freezeTools.lastChild)
}
setupFreeze(freezePair)

for (const pair of pairs) {
  observer.observe(pair.row)
}
setupControls()
setupPerformance()
window.requestAnimationFrame(frame)
