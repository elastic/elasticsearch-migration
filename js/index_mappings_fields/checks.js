"use strict";

Checks.register("index.mappings.fields", [

  {
    name : "Use of `index_name` or `path`",
    color : "blue",
    msg : "The `path` and `index_name` parameters are deprecated",
    check : function(field) {
      return field.path || field.index_name;
    }
  },

  {
    name : "Boolean fields",
    color : "blue",
    msg : "Boolean fields will return `1/0` instead of `T/F` in scripts, "
      + "aggregations, or sort values",
    check : function(field) {
      return field.type && field.type === "boolean";
    }
  },

  {
    name : "Per-field postings format",
    color : "red",
    msg : "The `postings_format` parameter is no longer supported",
    check : function(field) {
      return field.postings_format;
    }
  },

]);
