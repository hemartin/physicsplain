/*
 * Runs a scene with one library version: a State subclass that holds the
 * scene's bodies, counts steps, calls the scene's step hook from
 * postStep(), and keeps the last step's contacts for drawing.
 *
 * No DOM access here, so Node can use it too.
 */
export function createSim (lib, scene) {
  const setup = scene.build(lib)

  class SceneState extends lib.State {
    constructor () {
      super()
      this.lib = lib
      this.setup = setup
      this.moving = setup.moving
      this.fixed = setup.fixed
      this.steps = 0
      this.contacts = []
      this.alpha = undefined
      if (setup.restitution !== undefined) {
        this.restitution = setup.restitution
      }
    }

    * getMovingBodies () {
      yield * this.moving
    }

    * getFixedBodies () {
      yield * this.fixed
    }

    // fixedTimestep is whatever the library passes (10 in v0.1.0, 0.01 now)
    postStep (fixedTimestep) {
      this.steps++
      if (setup.step) {
        setup.step(this, fixedTimestep)
      }
    }

    // v0.1.0 calls postAdvance(now), v0.2.0 postAdvance(now, alpha)
    postAdvance (now, alpha) {
      this.alpha = alpha
    }

    collide (timestep) {
      const collisions = super.collide(timestep)
      this.contacts = collisions
      return collisions
    }
  }

  return new SceneState()
}
