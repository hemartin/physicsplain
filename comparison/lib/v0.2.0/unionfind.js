/**
 * Balanced union-find algorithm.
 *
 * Based on the textbook "Algorithms, 4th Edition" by Robert Sedgewick and
 * Kevin Wayne, and articles on Wikipedia.
 *
 * @author Martin Hentschel
 */
class UnionFindNode {
  constructor (id) {
    this.id = id
    this.rank = 0
    this.parent = this
  }
}

export class UnionFind {
  constructor () {
    // keyed by any value, e.g. an entity object
    this.nodes = new Map()
  }

  findNode (id) {
    if (!this.nodes.has(id)) {
      this.nodes.set(id, new UnionFindNode(id))
      return this.nodes.get(id)
    } else {
      let root = this.nodes.get(id)
      while (root.id !== root.parent.id) {
        root = root.parent
      }
      return root
    }
  }

  find (id) {
    return this.findNode(id).id
  }

  union (x, y) {
    const rootX = this.findNode(x)
    const rootY = this.findNode(y)
    if (rootX.id !== rootY.id) {
      if (rootX.rank < rootY.rank) {
        rootX.parent = rootY
      } else if (rootX.rank > rootY.rank) {
        rootY.parent = rootX
      } else {
        rootY.parent = rootX
        rootX.rank++
      }
    }
  }
}
