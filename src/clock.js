/**
 * Clock that runs the steps of a state as wall-clock time passes. Tick it
 * once per frame with the time elapsed since the last frame, e.g. from
 * requestAnimationFrame or PixiJS's ticker.deltaMS, then draw.
 *
 * Physics runs in fixed steps, so the current time usually lies between two
 * steps. Draw bodies at Body.interpolatedOrigin(alpha),
 * Body.interpolatedAngle(alpha) or Body.interpolatedCorners(alpha) to avoid
 * judder, e.g. at 60 Hz frames alternate between 1 and 2 steps of 10 ms.
 * This draws bodies up to one step behind physics.
 *
 * The clock only decides how many steps run per frame, never what a step
 * computes, so physics stays the same at any frame rate. A server that
 * replays a game calls State.step() in a loop instead.
 *
 * @author Martin Hentschel
 */
export class Clock {
  /**
   * @param {State} state state whose steps this clock runs, at the
   * state's timestep
   * @param {Number} maxElapsedMs largest time in ms that one tick catches up
   * on, so physics pauses rather than catching up after long gaps (e.g. a
   * hidden browser tab)
   */
  constructor (state, maxElapsedMs = 250) {
    this.state = state
    this.maxElapsedMs = maxElapsedMs

    // time since the last step in ms
    this.remainder = 0

    // time since the last step as a fraction of a step, from 0 (draw the
    // state before the last step) to 1 (draw the current state)
    this.alpha = 0
  }

  /**
   * Runs all steps due after elapsedMs more milliseconds.
   *
   * @param {Number} elapsedMs time since the last tick in ms, >= 0, and 0
   * on the first tick
   * @returns {Number} number of steps run
   */
  tick (elapsedMs) {
    const stepMs = this.state.timestep * 1000
    this.remainder += Math.min(elapsedMs, this.maxElapsedMs)

    let steps = 0
    while (this.remainder >= stepMs) {
      this.state.step()
      this.remainder -= stepMs
      steps++
    }
    this.alpha = this.remainder / stepMs
    return steps
  }
}
