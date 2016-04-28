"use strict";

Checks
  .register(
    "index.flat_mappings",
    [

    {
      name : "Conflicting field mappings",
      docs : "https://www.elastic.co/guide/en/elasticsearch/reference/2.0/breaking_20_mapping_changes.html#_conflicting_field_mappings",
      color : "red",
      check : function(mappings) {
        var errors = [];
        var fields = {};
        var conflicts = [];
        var safe = {
          _name : true, // Contains the original name of the field, with type
                        // prefix
          "coerce" : true,
          "copy_to" : true,
          "dynamic" : true,
          "enabled" : true,
          "ignore_above" : true,
          "ignore_malformed" : true,
          "include_in_all" : true
        };

        function flatten_fields(d) {
          var vals = {
            type : "object" // default setting if not specified
          };

          function flatten(prefix, d) {
            for ( var key in d) {
              var name = prefix + key;
              if (safe[name]) {
                continue;
              }
              if (d[key].constructor === Array) {
                vals[name] = d[key].join(", ");
              } else if (d[key] instanceof Object) {
                flatten(name + ".", d[key])
              } else {
                vals[name] = d[key];
              }
            }
          }
          flatten('', d);
          return vals;
        }

        function cmp_fields(first, second) {
          var keys = {};
          for ( var key in first) {
            if (!(key in second) || first[key] !== second[key]) {
              keys["`" + key + "`"] = true;
            } else {
              delete second[key]
            }
          }
          forall(second, function(o, key) {
            keys["`" + key + "`"] = true
          });
          var sorted = Object.keys(keys).sort();
          if (sorted.length) {
            return sorted
          }
          ;
        }

        // Group all fields by name
        forall(mappings, function(type) {
          forall(type.properties, function(field, name) {
            if (fields[name]) {
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
            var keys = cmp_fields(f_vals, o_vals);
            if (keys) {
              conflicts.push("Mapping for field `" + first._name
                + "` conflicts with: `" + other._name + "`. Check parameter"
                + (keys.length === 1 ? ': ' : 's: ') + keys.join(", "));
            }
          });
        });

        if (conflicts.length) {
          return conflicts.join("\n");
        }
      }
    }

    ]);
