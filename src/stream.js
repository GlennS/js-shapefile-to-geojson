"use strict";

/*global module*/

var nullChar = "*";

module.exports = function(data) {
    var view = new DataView(data),
	position = 0;

    return {
	offset: function(n) {
	    position += n;
	},

	getOffset: function() {
	    return position;
	},
	readDouble: function (bigEndian) {
	    position += 8;
	    return view.getFloat64(position - 8, !bigEndian);
	},
	readSI32: function(bigEndian) {
	    position += 4;
	    return view.getInt32(position - 4, !bigEndian);
	},
	readSI16: function(bigEndian) {
	    position += 2;
	    return view.getInt16(position - 2, !bigEndian);
	},
	readSI8: function() {
	    position += 1;
	    return view.getInt8(position - 1);
	},
	readUI8: function() {
	    position += 1;
	    return view.getUint8(position - 1);
	},
	readString: function(n) {
	    var buff = [],
		allNull = true;
	    
	    for (var i = 0; i < n; i++) {
		var char = String.fromCharCode(
		    view.getUint8(position));

		if (allNull && char !== nullChar) {
		    allNull = false;
		}
		
		buff.push(char);
		position++;
	    }
	    
	    return allNull ? "" : buff.join('');
	}  
    };
};
