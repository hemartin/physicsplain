# physicsplain &ndash; 2D physics in JavaScript

physicsplain is a simple 2D physics library written in JavaScript.  The library is intended for small browser games and animations.  physicsplain is lightweight in code size and memory footprint.

This library is heavily inspired by Erin Catto's ![GDC slides](http://box2d.org/downloads/) and ![Box2D](http://box2d.org/).  However, it does not provide all functionality that Box2D offers (see limitations below).

## Examples
Below are a few examples as GIF animations.  Check out the [demo page](https://hemartin.github.com/physicsplain) for JavaScript examples.

### Example 1
![example1](https://cloud.githubusercontent.com/assets/344615/11329481/845124be-9151-11e5-9b1d-2c3a4261290f.gif)

### Example 2
![example2](https://cloud.githubusercontent.com/assets/344615/11329511/cea78cba-9151-11e5-8b9a-c22cf92bd4b0.gif)

### Example 3
![example3](https://cloud.githubusercontent.com/assets/344615/11329512/d0f392d4-9151-11e5-80f3-49550d0b1163.gif)

## Known Limitations
Currently only rectangles are supported by this library.

Sometimes the following issues occur:
- Object collisions are not resolved properly, resulting in objects moving into each other.
- Inelastic collisions and constant forces (e.g., gravity) do not go too well together, also resulting in object moving into each other.

Consider using Box2D or other physics libraries if your project is impacted by these limitations.

## Acknowledgments
This project was inspired by the following projects and websites:
- Erin Catto's [GDC slides](http://box2d.org/downloads/) and [Box2D](http://box2d.org/)
- Physics simulations at [myPhysicsLab](http://www.myphysicslab.com/)
- Separating phyisics and graphics using [Fix Your Timestep!](http://gafferongames.com/game-physics/fix-your-timestep/)
- Union-Find in [Algorithms, 4th Edition](http://algs4.cs.princeton.edu/home/) and [Wikipedia](https://en.wikipedia.org/wiki/Disjoint-set_data_structure)
- Colors from [swiss style color picker](http://swisscolors.net/)
