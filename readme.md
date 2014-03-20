This project allows a user to load Shapefiles and DBFs into the browser with JavaScript.
Outputs as [GeoJSON](http://geojson.org/) for use with other Mapping APIs such as [OpenLayers](http://openlayers.org).

A fork produced by Glenn Searby for the Centre for Sustainable Energy.
https://github.com/GlennS/js-shapefile-to-geojson

Original by Marc Harter https://github.com/wavded/js-shapefile-to-geojson

Inspired by the excellent work by Tom Carden ([http://github.com/RandomEtc/shapefile-js/](http://github.com/RandomEtc/shapefile-js/)).

### Overview
First, use the Files API to load your .shp and .dbf files as binary.

Then:
var shape = Shapefile(shpData); // Parse the .shp file.
var dbf = DBF(dbfData); // Parse the .dbf file.
shape.addDBFDataToGeoJSON(dbf); 
var geojson = shape.geojson;

### Resources

I used the technical descriptions found here to parse the binary:

> [ESRI Shapefile Technical Description - PDF](http://www.esri.com/library/whitepapers/pdfs/shapefile.pdf)

> [dBase (Xbase) File Format Description](http://www.dbf2002.com/dbf-file-format.html)

### License

(The MIT License)

Copyright (c) 2010 Marc Harter &lt;wavded@gmail.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
