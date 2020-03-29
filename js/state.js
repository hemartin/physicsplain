/**
 * The state contains all entities and advances them, including resolving
 * collisions.
 * 
 * The state also contains constants specific to bodies and collisions. This is
 * why we pass the state on to bodies and collisions, so that they can access
 * these constants.
 * 
 * @author Martin Hentschel
 */
class State {
    constructor() {
        this.movableBodies = []
        this.fixedBodies = []

        this.start = 0
        this.previous = 0
        this.remainder = 0

        // constants
        this.restitution = 1; // 1 = elastic collision, <1 inelastic collision
    }

    advance(now) {
        const fixedTimestep = 10; // in ms

        if (this.start === 0) {
            this.start = now
        }
        if (this.previous === 0) {
            this.previous = now
        }
        let timestep = now - this.previous + this.remainder

        // move physics forward in fixed intervals
        while (timestep > fixedTimestep) {
            this.advanceByTimestep(fixedTimestep / 1000)
            timestep -= fixedTimestep
        }
        this.previous = now
        this.remainder = timestep
    }

    advanceByTimestep(timestep) {
        // check for collisions
        const collisions = this.collide(timestep)

        // apply forces
        for (const body of this.movableBodies) {
            body.applyForces(timestep)
        }

        // apply impulses
        for (const collision of collisions) {
            collision.apply()
        }

        // advance body
        for (const body of this.movableBodies) {
            body.advance(timestep)
        }
    }

    collide(timestep) {
        const collisions = []

        // collide movable bodies with each other
        const movableBodiesCount = this.movableBodies.length
        for (let i = 0; i < movableBodiesCount - 1; i++) {
            for (let j = i + 1; j < movableBodiesCount; j++) {
                const newCollision = Body.collide(this, this.movableBodies[i],
                    this.movableBodies[j], timestep)
                if (newCollision !== null) {
                    collisions.push(newCollision)
                }
            }
        }

        // collide each movable body with all fixed bodies
        const fixedBodiesCount = this.fixedBodies.length
        for (let i = 0; i < movableBodiesCount; i++) {
            for (let j = 0; j < fixedBodiesCount; j++) {
                const newCollision = Body.collide(this, this.movableBodies[i],
                    this.fixedBodies[j], timestep)
                if (newCollision !== null) {
                    collisions.push(newCollision)
                }
            }
        }

        return Collision.mergeCollisions(collisions)
    }
}
