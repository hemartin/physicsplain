/*
 * Utility functions.
 * 
 * @author Martin Hentschel, @hemasail
 */

/*
 * Adds all elements of given array to this array.
 * 
 * From http://stackoverflow.com/questions/6576758/add-all-elements-in-array
 */
Array.prototype.addAll = function (arr) {
    var len = arr.length;
    for (var i = 0; i < len; i++) {
        this.push(arr[i]);
    }
};
