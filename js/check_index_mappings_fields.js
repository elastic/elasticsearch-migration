"use strict";

Checks.register(
  "index.mappings.fields",
  [

  {
    name : "Use of `index_name` or `path`",
    color : "blue",
    check : function(field) {
      if ("path" in field) {
        return "Field " + field._name + " uses deprecated parameter `path`";
      } else if ("index_name" in field) {
        return "Field " + field._name
          + " uses deprecated parameter `index_name`";
      }
    }
  }

  ]);
