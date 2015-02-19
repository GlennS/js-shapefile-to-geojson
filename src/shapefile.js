"use strict";

/*global require, module*/
var makeStream = require("./stream.js");

var SHAPE_TYPES = {
    "0": "Null Shape",
    "1": "Point", // standard shapes
    "3": "PolyLine",
    "5": "Polygon",
    "8": "MultiPoint",
    "11": "PointZ", // 3d shapes
    "13": "PolyLineZ",
    "15": "PolygonZ",
    "18": "MultiPointZ",
    "21": "PointM", // user-defined measurement shapes
    "23": "PolyLineM",
    "25": "PolygonM",
    "28": "MultiPointM",
    "31": "MultiPatch"
};

var parse = function(data) {
    var s = makeStream(data),

    /*
     See ESRI Shapefile specification: http://www.esri.com/library/whitepapers/pdfs/shapefile.pdf

     Helper functions (not in the spec) are commented.

     Other functions represent named shape types from the specification.

     Does not currently support:
      + 'Null Shape' (because there is no clear need for it).
      + 'MultiPatch' (because it is complicated and we are working with 2D maps).
    */
	read = {
	/*
	 Not from spec: read a 2D bounding box.
	 */
	Bounds: function(record){
	    record.bounds = {
                left: s.readDouble(),
                bottom: s.readDouble(),
                right: s.readDouble(),
                top: s.readDouble()
	    };
        },
	/*
	 Not from spec: reads some number of lines segments.
	 */
	Parts: function(record){
	    var parts = [];

	    record.numParts = s.readSI32();

	    // Every shape which has parts also has points, and the number of points is always in this position.
	    record.numPoints = s.readSI32();

	    // parts array indicates at which index the next part starts at
	    for (var i = 0; i < record.numParts; i++) {
		parts.push(
		    s.readSI32()
		);
	    }
	    
	    record.parts = parts;
        },
	/*
	 Not from spec: read a collection of points within a record.
	 */
	Points: function(record){
	    var points = [];

	    record.numPoints = record.numPoints || s.readSI32();

	    for (var i = 0; i < record.numPoints; i++) {
                points.push({
		    x: s.readDouble(),
		    y: s.readDouble()
                });
	    }

	    record.points = points;
        },

	/*
	 Not from spec: reads the min and max measure values.
	 */
	MeasureRange: function(record) {
	    if (!record.bounds) {
		throw new Error("Attempted to set measure range before bounding box.");
	    }
	    record.bounds.measureMin = s.readDouble();
	    record.bounds.measureMax = s.readDouble();
	},

	/*
	 Not from spec: reads the measure value for each point.
	 */
	MeasureArray: function(record) {
	    if (record.numPoints === undefined) {
		throw new Error("Attempted to set measure array before points.");
	    }

	    for (var i = 0; i < record.numPoints; i++) {
		record.points[i].measure = s.readDouble();
	    }
	},

	/*
	 Not from spec: reads the deepest and shallowest Z values onto the bounding box.
	 */
	ZBounds: function(record) {
	    if (!record.bounds) {
		throw new Error("Attempted to set Z bounds before X & Y bounds.");
	    }

	    record.bounds.zMin = s.readDouble();
	    record.bounds.zMax = s.readDouble();
	},

	/*
	 Not from spec: reads the Z value for each point and puts it on the point object.
	 */
	ZArray: function(record) {
	    if (record.numPoints === undefined) {
		throw new Error("Attempted to set Z array before points.");
	    }

	    for (var i = 0; i < record.numPoints; i++) {
		record.points[i].z = s.readDouble();
	    }
	},

	MultiM: function(record) {
	    if (record.startOffset + record.length > s.getOffset()) {
		read.MeasureRange(record);
		read.MeasureArray(record);
	    } else {
		// Noop, these optional fields have been ommitted for this record.
	    }
	},

	MultiZAndM: function(record) {
	    read.ZBounds(record);
	    read.ZArray(record);
	    read.MultiM(record);
	},

	NullShape: function(record) {
	    throw new Error("Null shape not implemented.");
	},
	
	Point: function(record) {
	    record.x = s.readDouble();
	    record.y = s.readDouble();
        },
	
	PolyLine: function(record) {
	    read.Polygon(record);
        },
	
	Polygon: function(record) {
	    read.Bounds(record);
	    read.Parts(record);
	    read.Points(record);
        },

	MultiPoint: function(record) {
	    read.Bounds(record);
	    read.Points(record);
        },

	PointZ: function(record) {
	    read.Point(record);

	    record.z = s.readDouble();
	    record.measure = s.readDouble();
	},

	PolyLineZ: function(record) {
	    read.PolyonZ(record);
	},

	PolygonZ: function(record) {
	    read.Polygon(record);
	    read.MultiZAndM(record);
	},

	MultiPointZ: function(record) {
	    read.MultiPoint(record);
	    read.MultiZAndM(record);
	},	
	
	PointM: function(record) {
	    read.Point(record);
	    record.measure = s.readDouble();
	},

	PolyLineM: function(record) {
	    read.PolygonM(record);
	},

	PolygonM: function(record) {
	    read.Polygon(record);
	    read.MultiM(record);
	},

	MultiPointM: function(record) {
	    read.MultiPoint(record);
	    read.MultiM(record);
	},

	MultiPatch: function(record) {
	    throw new Error("MultiPatch not implemented.");
	}
    };
    
    var readFileHeader = function(){
	var header = {};

	// The main file header is fixed at 100 bytes in length
	if(s < 100) throw "Invalid Header Length";

	// File code (always hex value 0x0000270a)
	header.fileCode = s.readSI32(true);

	if(header.fileCode != parseInt(0x0000270a))
            throw "Invalid File Code";

	// Unused; five uint32
	s.offset(4 * 5);

	// File length (converted here from 16-bit words to bytes; includes the header).
	header.fileLength = s.readSI32(true) * 2;

	header.version = s.readSI32();

	header.shapeType = SHAPE_TYPES[s.readSI32()];

	// Minimum bounding rectangle (MBR) of all shapes contained within the shapefile; four doubles in the following order: min X, min Y, max X, max Y
	read["Bounds"](header);

	// Z axis range
	header.rangeZ = {
            min: s.readDouble(),
            max: s.readDouble()
	};

	// User defined measurement range
	header.rangeM = {
            min: s.readDouble(),
            max: s.readDouble()
	};

	return header;
    };

    var readRecords = function(){
	var records = [];

	do {
            var record = {};

            // Record number (1-based)
	    try {
                record.id = s.readSI32(true);
	    } catch (err) {
		if (err instanceof RangeError) {
		    break;
		} else {
		    throw err;
		}
	    }

            // Record length (converted here from 16-bit words to bytes).
            record.length = s.readSI32(true) * 2;

	    // Needed in combination with the record length so that we can work out whether or not to include optional fields.
	    record.startOffset = s.getOffset();
            record.shapeType = SHAPE_TYPES[s.readSI32()];
	    
            // Read specific shape
	    var readF = read[record.shapeType];
	    if (!readF) {
		throw new Error("Unimplemented shape type " + record.shapeType);
	    }
	    readF(record);

            records.push(record);

	} while(true);
	return records;
    };

    return {
	header : readFileHeader(),
	records : readRecords()
    };
};

module.exports =  function(data) {
    var parsed = parse(data);
    var header = parsed.header;
    var records = parsed.records;

    var bounds = header.bounds,
	features = [],
	feature, geometry, points, fbounds, gcoords, parts, point,
	geojson = {};

    geojson.type = "FeatureCollection";
    geojson.bbox = [
	bounds.left,
	bounds.bottom,
	bounds.right,
	bounds.top
    ];
    geojson.features = features;

    for (var r = 0, record; record = records[r]; r++){
	feature = {}, fbounds = record.bounds, points = record.points, parts = record.parts;
	feature.type = "Feature";
	if (record.shapeType !== 'Point') {
	    feature.bbox = [
		fbounds.left,
		fbounds.bottom,
		fbounds.right,
		fbounds.top
	    ];                  
	}
	geometry = feature.geometry = {};

	switch (record.shapeType) {
	case "Point":
	case "PointZ":
	case "PointM":
            geometry.type = "Point";
            geometry.coordinates = [
		record.x,
		record.y
	    ];
            break;
	    
	case "MultiPoint":
	case "MultiPointZ":
	case "MultiPointM":
	case "PolyLine":
	case "PolyLineZ":
	case "PolyLineM":
            geometry.type = (record.shapeType == "PolyLine" ? "LineString" : "MultiPoint");
            gcoords = geometry.coordinates = [];

            for (var p = 0; p < points.length; p++){
		var polyLinePoint = points[p];
		gcoords.push([
		    polyLinePoint.x,
		    polyLinePoint.y
		]);
            }
            break;
	    
	case "Polygon":
	case "PolygonZ":
	case "PolygonM":
            geometry.type = "Polygon";
            gcoords = geometry.coordinates = [];

            for (var pt = 0; pt < parts.length; pt++){
		var partIndex = parts[pt],
                    part = [],
                    polygonPoint;

		// partIndex 0 == main poly, partIndex > 0 == holes in poly
		for (var i = partIndex; i < (parts[pt+1] || points.length); i++){
                    polygonPoint = points[i];
                    part.push([
			polygonPoint.x,
			polygonPoint.y
		    ]);
		}
		gcoords.push(part);
            }
            break;
	default:
	    throw new Error("Unsupported feature type " + record.shapeType);
	}
	
	features.push(feature);
    }

    return {
	geojson : geojson,
	addDBFDataToGeoJSON : function(dbf) {
	    var features = geojson.features,
		len = features.length,
		records = dbf.records;

	    while(len--) features[len].properties = records[len];
	}
    };
};


