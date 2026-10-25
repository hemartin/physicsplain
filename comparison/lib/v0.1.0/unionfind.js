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
    this.nodes = []
  }

  findNode (id) {
    if (this.nodes[id] === undefined) {
      this.nodes[id] = new UnionFindNode(id)
      return this.nodes[id]
    } else {
      let root = this.nodes[id]
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
