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
          } else if ((prefix + key) in safe) {
            vals[prefix + key] = d[key];
          }
        }
      }
      flatten('', d);
      return vals;
    }

    function cmp_fields(first, second) {
      for ( var key in first) {
        if (!(key in second) || first[key] !== second[key]) {
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

    // Group all fields by name
    forall(mappings, function(type) {
      forall(type.properties, function(field, name) {
        if (name in fields) {
          fields[name].push(field);
        } else {
          fields[name] = [ field ];
        }
      })
    });

    forall(fields, function(others) {
      var first = others.shift();
      var f_vals = flatten_fields(first);

      forall(others, function(other) {
        var o_vals = flatten_fields(other);
        if (cmp_fields(f_vals, o_vals)) {
          conflicts.push("Mapping for field `" + first._name
            + "` conflicts with: `" + other._name + "`");
        }
      });
    });

    if (conflicts.length) {
      return conflicts.join("\n");
    }
  }
}

]);
