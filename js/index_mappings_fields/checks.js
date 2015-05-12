"use strict";

Checks
  .register(
    "index.mappings.fields",
    [

      {
        name : "Use of `index_name` or `path`",
        color : "blue",
        check : function(field) {
          if (field.path) {
            return "Field `" + field._name
              + "` uses deprecated parameter `path`.";
          } else if (field.index_name) {
            return "Field " + field._name
              + " uses deprecated parameter `index_name`";
          }
        }
      },

      {
        name : "Boolean fields",
        color : "blue",
        check : function(field) {
          if (field.type && field.type === "boolean") {
            return "Boolean field `"
              + field._name
              + "` will return `1/0` instead of `T/F` in scripts, aggregations, or sort values."
          }
        }
      },

      {
        name : "Per-field postings format",
        color : "red",
        check : function(field) {
          if (field.postings_format) {
            return "Field `" + field._name
              + "` contains a `postings_format` which is no longer supported."
          }
        }
      },

    ]);
