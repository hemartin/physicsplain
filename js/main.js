/*
 * Main entry point.
 * 
 * Creates examples, advances physics, and updates graphics.
 * 
 * We advance the physics in fixed timesteps of 10 milliseconds, and update the
 * graphics as often as the browser allows us to. The technique of separating
 * physics and graphics is adapted from:
 * http://gafferongames.com/game-physics/fix-your-timestep/
 * 
 * Colors used in the examples from: http://swisscolors.net/
 * 
 * @author Martin Hentschel, @hemasail
 */

var canvasWidth = 500;
var canvasHeight = 260;

function createExample1() {
    // DOM elements
    var canvas = document.getElementById("canvas1");
    var context = canvas.getContext("2d");
    
    // bodies
    var state = new State();
    state.movableBodies = [
        new Body(state).setOrigin(-1.3, 0).finalize(),
        new Body(state).setOrigin(-0.4, 0.09).finalize(),
        new Body(state).setOrigin(-0.4, -0.09).finalize(),
        new Body(state).setOrigin(-0.2, 0.09).finalize(),
        new Body(state).setOrigin(-0.2, -0.09).finalize(),
        new Body(state).setOrigin(0.2, 0.09).finalize(),
        new Body(state).setOrigin(0.2, -0.09).finalize(),
        new Body(state).setOrigin(0.4, 0.09).finalize(),
        new Body(state).setOrigin(0.4, -0.09).finalize()
    ];
    state.fixedBodies = [
        new FixedBody(state).setOrigin(0, 0.38).setDimension(0.1, 0.5).finalize(),
        new FixedBody(state).setOrigin(0, -0.38).setDimension(0.1, 0.5).finalize()
    ];
    state.LATERAL_FRICTION = 1;
    state.ROTATIONAL_FRICTION = 7;

    // force that moves body 1 forward
    state.movableBodies[0].setForce(8, 0);

    // colors
    var colors = [];
    state.movableBodies.forEach(function(body) {
        colors[body.id] = (body.id === 0) ? "#00b8b8" : "#e4bd0b";
    });
    state.fixedBodies.forEach(function(body) {
        colors[body.id] = "#de3d83";
    });
    
    // return object that contains all information
    return {
        canvas: canvas,
        context: context,
        state: state,
        backgroundColor: "#e0e5db",
        colors: colors
    };
}

function createExample2() {
    // DOM elements
    var canvas = document.getElementById("canvas2");
    var context = canvas.getContext("2d");

    // bodies
    var state = new State();
    state.movableBodies = [
        new Body(state).setOrigin(-0.7, 0.5).finalize(),
        new Body(state).setOrigin(-0.5, 0.5).finalize(),
        new Body(state).setOrigin(-0.3, 0.5).finalize(),
        new Body(state).setOrigin(0.3, 0.5).finalize(),
        new Body(state).setOrigin(0.5, 0.5).finalize(),
        new Body(state).setOrigin(0.7, 0.5).finalize()
    ];
    state.fixedBodies = [
        new FixedBody(state).setOrigin(-0.7, -0.5).setAngle(-0.1 * Math.PI)
                .setDimension(1, 0.5).finalize(),
        new FixedBody(state).setOrigin(0.7, -0.5).setAngle(0.1 * Math.PI)
                .setDimension(1, 0.5).finalize()
    ];
    state.LATERAL_FRICTION = 0.5;
    state.ROTATIONAL_FRICTION = 2;

    // set downwards force to all movable bodies
    state.movableBodies.forEach(function(body) {
        body.setForce(0, -2);
    });

    // colors
    var colors = [];
    state.movableBodies.forEach(function(body) {
        colors[body.id] = (body.id < 3) ? "#e5e7de" : "#f54123";
    });
    state.fixedBodies.forEach(function(body) {
        colors[body.id] = "#0b3536";
    });
    
    // return object that contains all information
    return {
        canvas: canvas,
        context: context,
        state: state,
        backgroundColor: "#0098d8",
        colors: colors
    };
}

function createExample3() {
    // DOM elements
    var canvas = document.getElementById("canvas3");
    var context = canvas.getContext("2d");

    // bodies
    var state = new State();
    state.movableBodies = [
        new Body(state).setOrigin(-0.6, 0).finalize(),
        new Body(state).setOrigin(-0.2, 0).setDimension(0.15, 0.15).finalize(),
        new Body(state).setOrigin(0.1, 0).setDimension(0.2, 0.2).finalize(),
        new Body(state).setOrigin(0.5, 0).setDimension(0.3, 0.3).finalize()
    ];
    state.fixedBodies = [
        new FixedBody(state).setOrigin(0, 0.55).setAngle(0.04)
                .setDimension(2, 0.2).finalize(),
        new FixedBody(state).setOrigin(0, -0.55).setAngle(0.04)
                .setDimension(2, 0.2).finalize(),
        new FixedBody(state).setOrigin(-1.05, 0).setAngle(0.04)
                .setDimension(0.2, 2).finalize(),
        new FixedBody(state).setOrigin(1.05, 0).setAngle(0.04)
                .setDimension(0.2, 2).finalize()
    ];

    // colors
    var colors = [];
    state.movableBodies.forEach(function(body) {
        colors[body.id] = (body.id === 0) ? "#dfe0e2" : "#a5a6a9";
    });
    state.fixedBodies.forEach(function(body) {
        colors[body.id] = "#2f292b";
    });
    
    // return object that contains all information
    return {
        canvas: canvas,
        context: context,
        state: state,
        backgroundColor: "#f45844",
        colors: colors
    };
}

/*
 * Main loop. Initializes examples, advances physics, and updates graphics.
 */
window.onload = function() {
    // initialize examples
    var examples = [
        createExample1(),
        createExample2(),
        createExample3()
    ];
    
    // bind key down and key up events to first body of example 3
    window.onkeydown = onKeyDown(examples[2].state.movableBodies[0]);
    window.onkeyup = onKeyUp(examples[2].state.movableBodies[0]);
    
    // initially resize canvas, and also listen for resize events
    resizeCanvas(examples);
    window.addEventListener("resize", function(e) {
        resizeCanvas(examples);
    });

    // fixed timestep to advance physics
    var fixedTimestep = 10; // in ms

    // step function is called every time the browser refreshes the UI
    var start = 0;
    var previous = 0;
    var remainder = 0;
    var lastRepeat1 = 0;
    var lastRepeat2 = 0;
    function step(now) {
        if (start === 0) start = now;
        if (previous === 0) previous = now;
        var timestep = now - previous + remainder;
        
        // move physics forward in fixed intervals
        while (timestep > fixedTimestep) {
            // advance state of all examples
            examples.forEach(function(example) {
                example.state.advance(fixedTimestep / 1000);
            });
            timestep -= fixedTimestep;
        }
        previous = now;
        remainder = timestep;
        
        // draw all examples
        examples.forEach(function(example) {
            // clear canvas
            example.context.fillStyle = example.backgroundColor;
            example.context.fillRect(0, 0, example.canvas.width, example.canvas.height);

            // draw bodies
            example.state.movableBodies.forEach(function(body) {
                drawBody(body, example.canvas, example.context, example.colors);
            });
            example.state.fixedBodies.forEach(function(body) {
                drawBody(body, example.canvas, example.context, example.colors);
            });
        });

        // repeat examples 1 after 4 seconds
        if (now - lastRepeat1 > 4000) {
            examples[0] = createExample1();
            lastRepeat1 = now;
        }
        // repeat examples 2 after 7 seconds
        if (now - lastRepeat2 > 7000) {
            examples[1] = createExample2();
            lastRepeat2 = now;
        }
        
        // request next animation frame from browser
        window.requestAnimationFrame(step);
    }
    
    window.requestAnimationFrame(step);
};

/*
 * Draws body on canvas.
 */
function drawBody(body, canvas, context, colors) {
    context.fillStyle = colors[body.id];
    context.beginPath();
    context.moveTo(tx(canvas, body.cx[0]), ty(canvas, body.cy[0]));
    for (var i = 1; i < 4; i++) {
        context.lineTo(tx(canvas, body.cx[i]), ty(canvas, body.cy[i]));
    }
    context.closePath();
    context.fill();
}

/*
 * Translates a body's x coordinate to the canvas's scale:
 * - if body is at x = -1, the body is at the canvas's left edge
 * - if body is at x = 1, the body is at the canvas's right edge
 */
function tx(canvas, x) {
    return canvas.width / 2 * (x + 1);
}

/*
 * Translates a body's y coordinate to the canvas's scale. This depends on the
 * size of the canvas.
 * 
 * If the size of the canvas is 400px wide and 200px high, and:
 * - if body is at y = 0.5, the body is at the canvas's top edge
 * - if body is at y = -0.5, the body is at the canvas's bottom edge
 */
function ty(canvas, y) {
    return -canvas.width / 2 * y + canvas.height / 2;
}

/*
 * Processes key down events for Example 3.
 */
var direction = new Vector(0, 0);
var thrust = 3;
function onKeyDown(body) {
    return function(e) {
        switch (e.keyCode) {
            case 39: case 68:
                // right or "D"
                direction.x = 1;
                break;
            case 37: case 65:
                // left or "A"
                direction.x = -1;
                break;
            case 38: case 87:
                // up or "W"
                direction.y = 1;
                break;
            case 40: case 83:
                // down or "S"
                direction.y = -1;
                break;
        }
        // set force to body, length of force vector equals thrust
        body.force.set(direction).normalize().scale(thrust);
    };
}

/*
 * Processes key up events for Example 3.
 */
function onKeyUp(body) {
    return function(e) {
        switch (e.keyCode) {
            case 39: case 68:
                // right or "D"
                direction.x = 0;
                break;
            case 37: case 65:
                // left or "A"
                direction.x = 0;
                break;
            case 38: case 87:
                // up or "W"
                direction.y = 0;
                break;
            case 40: case 83:
                // down or "S"
                direction.y = 0;
                break;
        }
        // set force to body, length of force vector equals thrust
        body.force.set(direction).normalize().scale(thrust);
    };
}

/*
 * Resizes all canvases to fit screen width in case browser window is thinner than canvasWidth.
 */
function resizeCanvas(examples) {
    var w = Math.min(window.innerWidth, canvasWidth);
    var h = canvasHeight * w / canvasWidth;
    examples.forEach(function(example) {
        if (example.canvas.width !== w) {
            example.canvas.width = w;
            example.canvas.height = h;
        }
    });
}