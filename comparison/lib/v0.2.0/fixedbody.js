import { Body, bodyInfiniteMass } from './body.js'

/**
 * FixedBody inherits from Body. The only difference being that its mass is
 * infinite and so it will never move if impacted by a collision.
 *
 * @author Martin Hentschel
 */
export class FixedBody extends Body {
  constructor (id) {
    super(id)
    this.setMass(bodyInfiniteMass)
  }
}
