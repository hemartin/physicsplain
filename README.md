# <img src="assets/logo.svg" alt="" width="40" height="40"> physicsplain &ndash; 2D physics in JavaScript

**Same inputs, same physics, in every browser, bit for bit.**

physicsplain is a small, deterministic 2D physics library for browser games and animations, inspired by [Box2D](https://box2d.org/). A game replays to exactly the same result in Chromium, Firefox, WebKit and Node.js, so a server can check a score by replaying the player's inputs.

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

  * getMovingBodies () { yield this.box }
  * getFixedBodies () { yield this.floor }

  // inputs and game logic, once per step
  postStep () {}
}

const game = new Game()
const clock = new Clock(game)
let last = 0
requestAnimationFrame(function frame (now) {
  clock.tick(last ? now - last : 0) // with PixiJS: clock.tick(ticker.deltaMS)
  last = now
  draw(game.box.interpolatedOrigin(clock.alpha)) // your drawing code
  requestAnimationFrame(frame)
})
```

## Deterministic Replays
To replay a game, record each input with its step number (`state.steps`) and apply it in `postStep()`. Running the same steps with `state.step()`, e.g. on a server, then gives the same result, bit for bit, as long as the game:
- changes bodies only in `postStep()`, not in event handlers or drawing code, and keeps `collideBodies()` free of side effects,
- creates its bodies in the same order, with the same `timestep` and `restitution`,
- uses a seeded random generator and `state.time` instead of the wall clock,
- uses `sin`, `cos` and `atan2` from physicsplain instead of `Math.sin`, `Math.cos` and `Math.atan2`, and no other `Math` functions than `sqrt`, `abs`, `min`, `max`, `floor`, `ceil`, `round` and `sign`, as browsers may round the others differently.

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
Moving bodies are rectangles. Fixed bodies are rectangles, arcs, circles and floors. A floor (`FixedFloor`) is one-sided: bodies hit it from its front, the left side when looking from its start to its end, and pass through it from behind.
- Contacts have no friction, so bodies slide freely along each other. `lateralFriction` and `rotationalFriction` act like air drag, so a stack of slightly turned boxes slides apart.
- Collisions are checked once per step (10 ms), so a fast body can pass through a thin one. Only a `FixedFloor` pushes back bodies that crossed it during the last step.

Consider Box2D or another physics library if these limitations matter for your project.

## Acknowledgments
This project was inspired by the following projects and websites:
- Erin Catto's [GDC slides](https://box2d.org/publications/) and [Box2D](https://box2d.org/)
- Physics simulations at [myPhysicsLab](https://www.myphysicslab.com/)
- Separating physics and graphics from [Fix Your Timestep!](https://gafferongames.com/post/fix_your_timestep/)
- Union-Find algorithm from [Algorithms, 4th Edition](https://algs4.cs.princeton.edu/home/) and [Wikipedia](https://en.wikipedia.org/wiki/Disjoint-set_data_structure)
