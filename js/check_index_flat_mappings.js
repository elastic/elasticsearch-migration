"use strict";

Checks.register("index.flat_mappings", [

  {
    name : "Conflicting field mappings",
    color : "red",
    check : function(mappings) {
      var errors = [];
      var fields = {};
      var conflicts = [];
      var safe = {
        _name : true,
        "null_value" : true,
        "include_in_all" : true,
        "ignore_above" : true,
        "format" : true,
        "copy_to" : true
      };

      function flatten_fields(d) {
        var vals = {};

        function flatten(prefix, d) {
          for ( var key in d) {
            if (d[key] instanceof Object) {
              flatten(prefix + key + ".", d[key])
            } else if (!safe.hasOwnProperty(prefix + key)) {
              vals[prefix + key] = d[key];
            }
          }
        }
        flatten('', d);
        return vals;
      }

      function cmp_fields(first, second) {
        for ( var key in first) {
          if (!second.hasOwnProperty(key) || first[key] !== second[key]) {
            return true;
          } else {
            delete second[key]
          }
        }
        if (Object.keys(second).length) {
          return true;
        }
        return false;
      }

      function find_conflicts(first, others) {
        var f_vals = flatten_fields(first);

        for (var i = 0; i < others.length; i++) {
          var o_vals = flatten_fields(others[i]);

          if (cmp_fields(f_vals, o_vals)) {
            conflicts.push("Mapping for field `" + first._name
              + "` conflicts with: `" + others[i]._name + "`");
          }
        }
      }

      for ( var type in mappings) {
        for ( var field_name in mappings[type].properties) {
          var field = mappings[type].properties[field_name];
          if (fields.hasOwnProperty(field_name)) {
            fields[field_name].push(field);
          } else {
            fields[field_name] = [ field ];
          }
        }
      }

      var field_names = Object.keys(fields).sort();
      var errors = [];
      for (var i = 0; i < field_names.length; i++) {
        var name = field_names[i];
        find_conflicts(fields[name].shift(), fields[name]);
      }
      if (conflicts.length) {
        return conflicts.join("\n");
      }
    }
  },

  {
    name : "Use of `index_name` or `path`",
    color : "blue",
    check : function(mappings) {
      var errors = [];

      for ( var type in mappings) {
        if (!mappings[type].properties) { continue }

        var field_names = Object.keys(mappings[type].properties).sort();
        for ( var i=0; i < field_names.length; i++) {
          var field = mappings[type].properties[field_names[i]];
          if (field.hasOwnProperty('path')) {
            errors.push("Field " + field._name
              + " uses deprecated parameter `path`");
          } else if (field.hasOwnProperty('index_name')) {
            errors.push("Field " + field._name
              + " uses deprecated parameter `index_name`");
          }
        }
      }
      if (errors.length) {
        return errors.join("\n");
      }
    }
  }

]);
