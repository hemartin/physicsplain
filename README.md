# <img src="assets/logo.svg" alt="" width="40" height="40"> physicsplain &ndash; 2D physics in JavaScript

physicsplain is a simple 2D physics library written in JavaScript.  The library is intended for small browser games and animations.  physicsplain is lightweight in memory footprint and code size.

This library is heavily inspired by Erin Catto's [GDC slides](https://box2d.org/publications/) and [Box2D](https://box2d.org/).  However, it does not provide all functionality that Box2D offers (see limitations below).

## Examples
Below are a few examples as GIF animations.  Check out the [JavaScript examples](https://hemartin.github.io/physicsplain/).

### Example 1
![Animation: an object forces other objects out of its way](assets/example1.gif)

### Example 2
![Animation: objects falling from the sky](assets/example2.gif)

### Example 3
![Animation: objects bouncing off arcs and circles](assets/example3.gif)

### Example 4
![Animation: objects bouncing off a wall and a floor made of fixed, one-way lines](assets/example4.gif)

## Using the Library
physicsplain is a set of ES modules without dependencies.  Use it in either of these ways:
- Install it from GitHub with `npm install github:hemartin/physicsplain` and import it with `import { State, Body } from 'physicsplain'`.  This works with bundlers such as Vite.
- Import it from a CDN without installing anything: `import { State, Body } from 'https://cdn.jsdelivr.net/gh/hemartin/physicsplain@<tag>/src/physicsplain.js'`, where `<tag>` is a [release](https://github.com/hemartin/physicsplain/releases) tag.

A game extends `State` and yields its bodies. A `Clock` runs the physics steps as time passes, and the game draws bodies between the last two steps:

```js
import { Body, Clock, FixedFloor, State, Vector } from 'physicsplain'

class Game extends State {
  constructor () {
    super()
    this.box = new Body(1).setOrigin(0, 1).setForce(0, -1).finalize()
    this.floor = new FixedFloor(2, new Vector(-1, 0), new Vector(1, 0))
  }

  * getMovingBodies () {
    yield this.box
  }

  * getFixedBodies () {
    yield this.floor
  }

  // game logic and inputs, once per step
  postStep () {}
}

const game = new Game()
const clock = new Clock(game)
let previous = null
function frame (now) {
  clock.tick(previous === null ? 0 : now - previous)
  previous = now
  draw(game.box.interpolatedOrigin(clock.alpha)) // your drawing code
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)
```

With PixiJS, call `clock.tick(ticker.deltaMS)` in a function added to `app.ticker` instead.

## Deterministic Replays
Each `step()` advances physics by `state.timestep` seconds (10 ms by default) and gives bit-identical results in every browser and in Node.js. A server can therefore replay a game step by step and check its result. This holds if the game follows these rules:
- Change bodies and apply inputs only in `postStep()`, never in event handlers or drawing code, because those run per frame. Record inputs in a queue keyed by `state.steps` and apply each one in `postStep()` at its step.
- Replay by creating the same state, with the same `timestep` and `restitution`, and calling `state.step()` in a loop.
- Create bodies and yield them from `getMovingBodies()` and `getFixedBodies()` in the same order, because collisions are resolved in that order.
- Keep `collideBodies()` a pure function of the two bodies.
- Use a seeded random generator, and `state.time` or `state.steps` instead of the wall clock, e.g. for scores. `state.time` falls behind the wall clock when a long gap (e.g. a hidden browser tab) is capped.
- Use `sin`, `cos` and `atan2` from physicsplain instead of `Math.sin`, `Math.cos` and `Math.atan2`, which may differ in the last bit between browsers. Avoid `Math.pow` (and `**`), `Math.exp`, `Math.log`, `Math.tan`, `Math.hypot` and similar functions in code that changes bodies, for the same reason. `+`, `-`, `*`, `/`, `Math.sqrt`, `Math.abs`, `Math.min`, `Math.max`, `Math.floor`, `Math.ceil`, `Math.round`, `Math.sign`, `Math.fround` and `Math.imul` are exact in every browser.

## Development
Requires Node.js 22 or newer.
- `npm ci` installs the development dependencies.
- `npm test` runs the tests.
- `npm run test:browsers` checks that Chromium, Firefox and WebKit give the same results as Node, bit for bit. Run `npx playwright install` once before.
- `npm run lint` checks the code style ([neostandard](https://github.com/neostandard/neostandard)).
- `npm run test:coverage` runs the tests and prints a coverage report.
- To run the examples locally, serve the repository root with any static web server, e.g. `npx serve`, and open `index.html`.

All changes to `main` go through pull requests, and CI must pass before a pull request can be merged.  Each push to `main` deploys the examples to GitHub Pages.

## Known Limitations
Currently only rectangles are supported as moving bodies. Rectangles, arcs, circles, and floors are supported as fixed bodies. A floor (`FixedFloor`) is a one-sided line: bodies hit it only from its front, the left side when looking from its start to its end, and pass through it from behind.

The following limitations remain:
- Contacts have no friction, so bodies slide freely along each other and along fixed bodies. `lateralFriction` and `rotationalFriction` slow a body down like air drag, not like friction between surfaces. For example, a stack of slightly rotated boxes slides apart.
- Collisions are checked once per step (10 ms), so a fast body can pass through a thin body without touching it. Only a `FixedFloor` pushes back bodies that crossed it during the last step.

Consider using Box2D or other physics libraries if your project is impacted by these limitations.

## Acknowledgments
This project was inspired by the following projects and websites:
- Erin Catto's [GDC slides](https://box2d.org/publications/) and [Box2D](https://box2d.org/)
- Physics simulations at [myPhysicsLab](https://www.myphysicslab.com/)
- Separating physics and graphics from [Fix Your Timestep!](https://gafferongames.com/post/fix_your_timestep/)
- Union-Find algorithm from [Algorithms, 4th Edition](https://algs4.cs.princeton.edu/home/) and [Wikipedia](https://en.wikipedia.org/wiki/Disjoint-set_data_structure)
