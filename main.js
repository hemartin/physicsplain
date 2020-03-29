import { State, Body, FixedArc, FixedBody, Vector } from './js/physicsplain.js'

/**
 * Main entry point.
 *
 * Creates examples, advances physics, and updates graphics.
 *
 * We advance the physics in fixed timesteps of 10 milliseconds, and update the
 * graphics as often as the browser allows us to. The technique of separating
 * physics and graphics is adapted from:
 * http://gafferongames.com/game-physics/fix-your-timestep/
 *
 * @author Martin Hentschel
 */

const canvasWidth = 500
const canvasHeight = 260

function createExample1 () {
  // DOM elements
  const canvas = document.getElementById('canvas1')
  const context = canvas.getContext('2d')

  // bodies
  const state = new State()
  state.movableBodies = [
    new Body(0).setOrigin(-1.3, 0).finalize(),
    new Body(1).setOrigin(-0.4, 0.09).finalize(),
    new Body(2).setOrigin(-0.4, -0.09).finalize(),
    new Body(3).setOrigin(-0.2, 0.09).finalize(),
    new Body(4).setOrigin(-0.2, -0.09).finalize(),
    new Body(5).setOrigin(0.2, 0.09).finalize(),
    new Body(6).setOrigin(0.2, -0.09).finalize(),
    new Body(7).setOrigin(0.4, 0.09).finalize(),
    new Body(8).setOrigin(0.4, -0.09).finalize()
  ]
  state.fixedBodies = [
    new FixedBody(9)
      .setOrigin(0, 0.38)
      .setDimension(0.1, 0.5)
      .finalize(),
    new FixedBody(10)
      .setOrigin(0, -0.38)
      .setDimension(0.1, 0.5)
      .finalize()
  ]

  // set friction
  for (const body of state.movableBodies) {
    body.lateralFriction = 1
    body.rotationalFriction = 7
  }

  // force that moves body 1 forward
  state.movableBodies[0].setForce(8, 0)

  // colors
  const colors = []
  for (const body of state.movableBodies) {
    colors[body.id] = body.id === 0 ? '#00b8b8' : '#e4bd0b'
  }
  for (const body of state.fixedBodies) {
    colors[body.id] = '#de3d83'
  }

  // return object that contains all information
  return {
    canvas: canvas,
    context: context,
    state: state,
    backgroundColor: '#e0e5db',
    colors: colors
  }
}

function createExample2 () {
  // DOM elements
  const canvas = document.getElementById('canvas2')
  const context = canvas.getContext('2d')

  // bodies
  const state = new State()
  state.movableBodies = [
    new Body(0).setOrigin(-0.7, 0.5).finalize(),
    new Body(1).setOrigin(-0.5, 0.5).finalize(),
    new Body(2).setOrigin(-0.3, 0.5).finalize(),
    new Body(3).setOrigin(0.3, 0.5).finalize(),
    new Body(4).setOrigin(0.5, 0.5).finalize(),
    new Body(5).setOrigin(0.7, 0.5).finalize()
  ]
  state.fixedBodies = [
    new FixedBody(6)
      .setOrigin(-0.7, -0.5)
      .setAngle(-0.1 * Math.PI)
      .setDimension(1, 0.5)
      .finalize(),
    new FixedBody(7)
      .setOrigin(0.7, -0.5)
      .setAngle(0.1 * Math.PI)
      .setDimension(1, 0.5)
      .finalize()
  ]

  // set friction
  for (const body of state.movableBodies) {
    body.lateralFriction = 0.5
    body.rotationalFriction = 2
  }

  // set downwards force to all movable bodies
  for (const body of state.movableBodies) {
    body.setForce(0, -2)
  }

  // colors
  const colors = []
  for (const body of state.movableBodies) {
    colors[body.id] = body.id < 3 ? '#e5e7de' : '#f54123'
  }
  for (const body of state.fixedBodies) {
    colors[body.id] = '#0b3536'
  }

  // return object that contains all information
  return {
    canvas: canvas,
    context: context,
    state: state,
    backgroundColor: '#0098d8',
    colors: colors
  }
}

function createExample3 () {
  // DOM elements
  const canvas = document.getElementById('canvas3')
  const context = canvas.getContext('2d')

  // bodies
  const state = new State()
  state.movableBodies = [new Body(0).setOrigin(-0.7, 0.4).finalize()]
  state.fixedBodies = [
    new FixedBody(1)
      .setOrigin(0, 0.6)
      .setDimension(2, 0.2)
      .finalize(),
    new FixedBody(2)
      .setOrigin(0, -0.6)
      .setDimension(2, 0.2)
      .finalize(),
    new FixedArc(33, new Vector(0.5, 0), 0.5, 0.2, 0, Math.PI * 0.5),
    new FixedArc(34, new Vector(0.5, 0), 0.5, 0.2, Math.PI * 1.5, Math.PI * 2)
  ]

  // initial velocity of impacting body
  state.movableBodies[0].velocity.x = 4

  // colors
  const colors = []
  for (const body of state.movableBodies) {
    colors[body.id] = body.id === 0 ? '#dfe0e2' : '#a5a6a9'
  }
  for (const body of state.fixedBodies) {
    colors[body.id] = '#2f292b'
  }

  // return object that contains all information
  return {
    canvas: canvas,
    context: context,
    state: state,
    backgroundColor: '#f45844',
    colors: colors
  }
}

/**
 * Main loop. Initializes examples, advances physics, and updates graphics.
 */
window.onload = function () {
  // initialize examples
  const examples = [createExample1(), createExample2(), createExample3()]

  // initially resize canvas, and also listen for resize events
  resizeCanvas(examples)
  window.addEventListener('resize', function (e) {
    resizeCanvas(examples)
  })

  // repeating examples every 4s, 7s, 3s respectively
  const lastRepeat = [0, 0, 0]
  const repeat = [4000, 7000, 3000]
  const initFuncs = [createExample1, createExample2, createExample3]

  // step function is called every time the browser refreshes the UI
  function step (now) {
    // advance state of all examples
    for (const example of examples) {
      example.state.advance(now)
    }

    // clear all examples
    for (const example of examples) {
      // clear canvas
      example.context.fillStyle = example.backgroundColor
      example.context.fillRect(
        0,
        0,
        example.canvas.width,
        example.canvas.height
      )
    }

    // draw circle for example 3
    drawCircle(
      examples[2].canvas,
      examples[2].context,
      examples[2].colors[examples[2].state.fixedBodies[0].id],
      examples[2].backgroundColor
    )

    // draw bodies for all examples
    for (const example of examples) {
      // draw bodies
      for (const body of example.state.movableBodies) {
        drawBody(body, example.canvas, example.context, example.colors)
      }
      for (const body of example.state.fixedBodies) {
        drawBody(body, example.canvas, example.context, example.colors)
      }
    }

    // repeat examples
    for (let i = 0; i < examples.length; i++) {
      if (now - lastRepeat[i] > repeat[i]) {
        examples[i] = initFuncs[i]()
        lastRepeat[i] = now
      }
    }

    // request next animation frame from browser
    window.requestAnimationFrame(step)
  }

  window.requestAnimationFrame(step)
}

/*
 * Draws body on canvas.
 */
function drawBody (body, canvas, context, colors) {
  if (body.id > 30) {
    // hack to ignore arcs
    return
  }
  context.fillStyle = colors[body.id]
  context.beginPath()
  context.moveTo(tx(canvas, body.cornerX[0]), ty(canvas, body.cornerY[0]))
  for (let i = 1; i < 4; i++) {
    context.lineTo(tx(canvas, body.cornerX[i]), ty(canvas, body.cornerY[i]))
  }
  context.closePath()
  context.fill()
}

/*
 * Draws circle for example 3
 */
function drawCircle (canvas, context, wallColor, backgroundColor) {
  // draw big wall
  context.fillStyle = wallColor
  context.beginPath()
  context.moveTo(tx(canvas, 0.5), ty(canvas, 0.5))
  context.lineTo(tx(canvas, 1), ty(canvas, 0.5))
  context.lineTo(tx(canvas, 1), ty(canvas, -0.5))
  context.lineTo(tx(canvas, 0.5), ty(canvas, -0.5))
  context.closePath()
  context.fill()

  // draw circle on top of wall
  context.fillStyle = backgroundColor
  context.beginPath()
  context.arc(
    tx(canvas, 0.5),
    ty(canvas, 0),
    tx(canvas, 0.5) - tx(canvas, 0),
    0,
    2 * Math.PI,
    false
  )
  context.fill()
}

/*
 * Translates a body's x coordinate to the canvas's scale:
 * - if body is at x = -1, the body is at the canvas's left edge
 * - if body is at x = 1, the body is at the canvas's right edge
 */
function tx (canvas, x) {
  return (canvas.width / 2) * (x + 1)
}

/*
 * Translates a body's y coordinate to the canvas's scale. This depends on the
 * size of the canvas.
 *
 * If the size of the canvas is 400px wide and 200px high, and:
 * - if body is at y = 0.5, the body is at the canvas's top edge
 * - if body is at y = -0.5, the body is at the canvas's bottom edge
 */
function ty (canvas, y) {
  return (-canvas.width / 2) * y + canvas.height / 2
}

/*
 * Resizes all canvases to fit screen width in case browser window is thinner than canvasWidth.
 */
function resizeCanvas (examples) {
  const w = Math.min(window.innerWidth, canvasWidth)
  const h = (canvasHeight * w) / canvasWidth
  for (const example of examples) {
    if (example.canvas.width !== w) {
      example.canvas.width = w
      example.canvas.height = h
    }
  }
}
