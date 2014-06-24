"use strict";

/*global makeStream*/

(function(window,undefined){

    var
    DBASE_LEVEL = {
        "3": "dBASE Level 5",
        "4": "dBase Level 7"
    },
    DBASE_FIELD_TYPE = {
        "N": "Number",
        "C": "Character", // binary
        "L": "Logical",
        "D": "Date",
        "M": "Memo", // binary
        "F": "Floating point",
        "B": "Binary",
        "G": "General",
        "P": "Picture",
        "Y": "Currency",
        "T": "DateTime",
        "I": "Integer",
        "V": "VariField",
        "X": "Variant",
        "+": "Autoincrement", // (dBase Level 7)
        "O": "Double", // (dBase Level 7)
        "@": "Timestamp" // (dBase Level 7)
    };

    var parse = function(s) {
        var readFileHeader = function(){
            var header = {}, date = new Date;

            header.version = DBASE_LEVEL[s.readSI8()];

            // Date of last update; in YYMMDD format.  Each byte contains the number as a binary.  YY is added to a base of 1900 decimal to determine the actual year. Therefore, YY has possible values from 0x00-0xFF, which allows for a range from 1900-2155.
            date.setUTCFullYear(1900 + s.readSI8());
            date.setUTCMonth(s.readSI8());
            date.setUTCDate(s.readSI8());

            header.lastUpdated = date;

            // Number of records in file
            header.numRecords = s.readSI32();

            // Position of first data record
            header.firstRecordPosition = s.readSI16();

            // Length of one data record, including delete flag
            header.recordLength = s.readSI16();

            // Reserved; filled with zeros
            s.offset(16);

            /*
             Table flags:
             0x01   file has a structural .cdx
             0x02   file has a Memo field
             0x04   file is a database (.dbc)
             This byte can contain the sum of any of the above values. For example, the value 0x03 indicates the table has a structural .cdx and a Memo field.
             */
            header.flags = s.readSI8();

            // Code page mark
            header.codePageMark = s.readSI8();

            // Reserved; filled with zeros.
            s.offset(2);

	    return header;
        };

        var readFieldDescriptions = function(){
            var fields = [];

            while (s.readSI8() != 0x0D) {
                s.offset(-1);
                var field = {};

                // Field name with a maximum of 10 characters. If less than 10, it is padded with null characters (0x00).
                field.name = s.readString(11).replace(/\u0000/g,"");

                field.type = DBASE_FIELD_TYPE[s.readString(1)];

                // Displacement of field in record
                field.fieldDisplacement = s.readSI32();

                // Length of field (in bytes)
                field.fieldLength = s.readUI8();

                // Number of decimal places
                field.decimals = s.readSI8();

                /*
                 Field flags:
                 0x01   System Column (not visible to user)
                 0x02   Column can store null values
                 0x04   Binary column (for CHAR and MEMO only)
                 0x06   (0x02+0x04) When a field is NULL and binary (Integer, Currency, and Character/Memo fields)
                 0x0C   Column is autoincrementing
                 */
                field.flags = s.readSI8();

                // Value of autoincrement Next value
                field.autoincrementNextValue = s.readSI32();

                // Value of autoincrement Step value
                field.autoincrementStepValue = s.readSI8();

                // Reserved
                s.offset(8);

                fields.push(field);
            }

            return fields;
        };

	return {
	    header : readFileHeader(),
	    fieldDescriptions : readFieldDescriptions()
	};
    };

    var DBF = function(data) {
	var s = makeStream(data);
	var parsed = parse(s);
	var header = parsed.header;
	var fields = parsed.fieldDescriptions;

	var readRecords = function(){
            var numRecords = header.numRecords,
		recordsOffset = header.firstRecordPosition,
		recordSize = header.recordLength,
		numFields = fields.length,
		records = [];

            for (var index = 0; index < numRecords; index++) {
		var record = {};

		// Data records begin with a delete flag byte. If this byte is an ASCII space (0x20), the record is not deleted. If the first byte is an asterisk (0x2A), the record is deleted
		record._isDeleted = s.readSI8() == 42;

		for(var i = 0; i < numFields; i++){
                    var field = fields[i];
                    record[field.name] = s.readString(field.fieldLength).trim();
		}

		records.push(record);
            }

	    return records;
	};

	return {
	    records : readRecords()
	};
    };

    window["DBF"] = DBF;

})(self);

