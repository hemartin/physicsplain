# physicsplain &ndash; 2D physics in JavaScript

physicsplain is a simple 2D physics library written in JavaScript.  The library is intended for small browser games and animations.  physicsplain is lightweight in memory footprint and code size.

This library is heavily inspired by Erin Catto's [GDC slides](http://box2d.org/downloads/) and [Box2D](http://box2d.org/).  However, it does not provide all functionality that Box2D offers (see limitations below).

## Examples
Below are a few examples as GIF animations.  Check out the [JavaScript examples](http://hemartin.github.io/physicsplain/).

### Example 1
![example1](https://user-images.githubusercontent.com/344615/77963543-cebc3080-72dd-11ea-9d1b-63dd3f74c781.gif)

### Example 2
![example2](https://user-images.githubusercontent.com/344615/77963553-d380e480-72dd-11ea-8133-74d44f3c4c7d.gif)

### Example 3
![example3](https://user-images.githubusercontent.com/344615/77963560-d8459880-72dd-11ea-8ff7-4c5510e3f2e3.gif)

## Building the Minified Library
Install rollup:
- `npm install --save-dev rollup rollup-plugin-terser`

Run rollup to create file `target/physicsplain-min.js`:
- `npx rollup -c rollup.config.js`

## Known Limitations
Currently only rectangles are supported as moving bodies. Rectangles, arcs, and circles are supported as fixed bodies.

Sometimes the following issues occur:
- Object collisions are not resolved properly, which results in objects moving into each other.
- Inelastic collisions and constant forces (e.g., gravity) do not go well together, which also results in object moving into each other.

Consider using Box2D or other physics libraries if your project is impacted by these limitations.

## Acknowledgments
This project was inspired by the following projects and websites:
- Erin Catto's [GDC slides](http://box2d.org/downloads/) and [Box2D](http://box2d.org/)
- Physics simulations at [myPhysicsLab](http://www.myphysicslab.com/)
- Separating physics and graphics from [Fix Your Timestep!](http://gafferongames.com/game-physics/fix-your-timestep/)
- Union-Find algorithm from [Algorithms, 4th Edition](http://algs4.cs.princeton.edu/home/) and [Wikipedia](https://en.wikipedia.org/wiki/Disjoint-set_data_structure)
- GIFs captured using [CCapture.js](https://github.com/spite/ccapture.js)
