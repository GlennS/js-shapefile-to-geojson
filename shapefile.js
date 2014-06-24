"use strict";

/*global makeStream*/

(function(window,undefined){

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
	var s = makeStream(data);

    	var read = {
	    "Bounds" : function(object){
		object.bounds = {
                    left: s.readDouble(),
                    bottom: s.readDouble(),
                    right: s.readDouble(),
                    top: s.readDouble()
		};

		return object;
            },
	    "Parts" : function(record){
		var nparts, parts = [];

		nparts = record.numParts = s.readSI32();

		// since number of points always proceeds number of parts, capture it now
		record.numPoints = s.readSI32();

		// parts array indicates at which index the next part starts at
		while(nparts--) parts.push(s.readSI32());

		record.parts = parts;

		return record;
            },
	    "Point" : function(record){
		record.x = s.readDouble();
		record.y = s.readDouble();

		return record;
            },
	    "Points" : function(record){
		var points = [],
                    npoints = record.numPoints || (record.numPoints = s.readSI32());

		while(npoints--)
                    points.push({
			x: s.readDouble(),
			y: s.readDouble()
                    });

		record.points = points;

		return record;
            },
	    "MultiPoint" : function(record){
		this["Bounds"](record);
		this["Points"](record);

		return record;
            },
	    "Polygon" : function(record){
		this["Bounds"](record);
		this["Parts"](record);
		this["Points"](record);

		return record;
            },
	    "PolyLine" : function(record){
		return this["Polygon"](record);
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

	    // File length (in 16-bit words, including the header)
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

                // Record length (in 16-bit words)
                record.length = s.readSI32(true) * 2;

                record.shapeType = SHAPE_TYPES[s.readSI32()];

                // Read specific shape
                read[record.shapeType](record);

                records.push(record);

	    } while(true);
	    return records;
	};




	
	return {
	    header : readFileHeader(),
	    records : readRecords()
	};
    };

    var Shapefile = function(data) {
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
                geometry.type = "Point";
                geometry.coordinates = [
                    record.x,
                    record.y ];
                break;
            case "MultiPoint":
            case "PolyLine":
                geometry.type = (record.shapeType == "PolyLine" ? "LineString" : "MultiPoint");
                gcoords = geometry.coordinates = [];

                for (var p = 0; p < points.length; p++){
                    var point = points[p];
                    gcoords.push([point.x,point.y]);
                }
                break
            case "Polygon":
                geometry.type = "Polygon";
                gcoords = geometry.coordinates = [];

                for (var pt = 0; pt < parts.length; pt++){
                    var partIndex = parts[pt],
                        part = [],
                        point;

                    // partIndex 0 == main poly, partIndex > 0 == holes in poly
                    for (var p = partIndex; p < (parts[pt+1] || points.length); p++){
                        point = points[p];
                        part.push([point.x,point.y]);
                    }
                    gcoords.push(part);
                }
                break;
            default:
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
    
    window["Shapefile"] = Shapefile;

})(self);

