/* 
 * Balanced union-find algorithm.
 * 
 * Based on the textbook "Algorithms, 4th Edition" by Robert Sedgewick and
 * Kevin Wayne, and articles on Wikipedia.
 * 
 * @author Martin Hentschel, @hemasail
 */
function UnionFindNode(id) {
    this.id = id;
    this.rank = 0;
    this.parent = this;
}

function UnionFind() {
    this.nodes = [];
}

UnionFind.prototype.findNode = function (id) {
    if (this.nodes[id] === undefined) {
        this.nodes[id] = new UnionFindNode(id);
        return this.nodes[id];
    } else {
        var root = this.nodes[id];
        while (root.id !== root.parent.id) {
            root = root.parent;
        }
        return root;
    }
};

UnionFind.prototype.find = function(id) {
    return this.findNode(id).id;
};

UnionFind.prototype.union = function (x, y) {
    var rootX = this.findNode(x);
    var rootY = this.findNode(y);
    if (rootX.id !== rootY.id) {
        if (rootX.rank < rootY.rank) {
            rootX.parent = rootY;
        }
        else if (rootX.rank > rootY.rank) {
            rootY.parent = rootX;
        }
        else {
            rootY.parent = rootX;
            rootX.rank++;
        }
    }
};
