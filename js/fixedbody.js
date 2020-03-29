import { Body, Body_INFINITE_MASS } from './body.js'

/**
 * FixedBody inherits from Body. The only difference being that its mass is
 * infinite and so it will never move if impacted by a collision.
 * 
 * @author Martin Hentschel
 */
class FixedBody extends Body {
    constructor(id) {
        super(id)
        this.setMass(Body_INFINITE_MASS)
    }
}

export { FixedBody }
