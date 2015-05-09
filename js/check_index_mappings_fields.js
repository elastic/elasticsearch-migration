"use strict";

Checks.register(
  "index.mappings.fields",
  [

  {
    name : "Use of `index_name` or `path`",
    color : "blue",
    check : function(field) {
      if (field.hasOwnProperty('path')) {
        return "Field " + field._name + " uses deprecated parameter `path`";
      } else if (field.hasOwnProperty('index_name')) {
        return "Field " + field._name
          + " uses deprecated parameter `index_name`";
      }
    }
  }

  ]);
