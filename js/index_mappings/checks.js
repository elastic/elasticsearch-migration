"use strict";

Checks
  .register(
    "index.mappings",
    [

      {
        name : "Field: `_id`",
        color : "blue",
        check : function(mappings) {
          return Checks
            .check_types(
              "The `_id` field can no longer be configured in new indices. Importantly, it will not be possible to extract the `_id` value from a `path`",
              mappings,
              function(type) {
                var conf = Checks.get_key(mappings[type], '_id');
                return conf && Object.keys(conf).length;
              });
        }
      },

      {
        name : "Field: `_type`",
        color : "blue",
        check : function(mappings) {
          return Checks.check_types(
            "The `_type` field can no longer be configured in new indices",
            mappings,
            function(type) {
              var conf = Checks.get_key(mappings[type], '_type');
              return conf && Object.keys(conf).length;
            });
        }
      },

      {
        name : "Field: `_source`",
        color : "blue",
        check : function(mappings) {
          return Checks
            .check_types(
              "The `_source` field can no longer be disabled, or have `includes` or `excludes` in new indices",
              mappings,
              function(type) {
                var conf = Checks.get_key(mappings[type], '_source');
                return conf && Object.keys(conf).length;
              });
        }
      },

      {
        name : "Field: `_analyzer`",
        color : "yellow",
        check : function(mappings) {
          return Checks.check_types(
            "The `_analyzer` field has been removed and will be ignored",
            mappings,
            function(type) {
              return Checks.get_key(mappings[type], '_analyzer')
                || Checks.get_key(mappings[type], 'properties._analyzer')
            });
        }
      },

      {
        name : "Field: `_boost`",
        color : "yellow",
        check : function(mappings) {
          return Checks.check_types(
            "The `_boost` field has been removed and will be ignored",
            mappings,
            function(type) {
              return Checks.get_key(mappings[type], '_boost')
            });
        }
      },

      {
        name : "Field: `_routing`",
        color : "blue",
        check : function(mappings) {
          return Checks
            .check_types(
              "The `_routing` field will only accept the `required` parameter in future indices. Importantly, it will not be possible to extract the `_routing` value from a `path`",
              mappings,
              function(type) {
                var conf = Checks.get_key(mappings[type], '_routing');
                if (conf) {
                  conf = JSON.parse(JSON.stringify(conf));
                  delete conf.required;
                  return Object.keys(conf).length;
                }
              });
        }
      },

      {
        name : "Field: `_index`",
        color : "blue",
        check : function(mappings) {
          return Checks
            .check_types(
              "The `_index` field will only accept the `enabled` parameter in future indices",
              mappings,
              function(type) {
                var conf = Checks.get_key(mappings[type], '_index');
                if (conf) {
                  conf = JSON.parse(JSON.stringify(conf));
                  delete conf.enabled;
                  return Object.keys(conf).length;
                }
              });
        }
      },

      {
        name : "Field: `_size`",
        color : "blue",
        check : function(mappings) {
          return Checks
            .check_types(
              "The `_size` field will only accept the `enabled` parameter in future indices",
              mappings,
              function(type) {
                var conf = Checks.get_key(mappings[type], '_size');
                if (conf) {
                  conf = JSON.parse(JSON.stringify(conf));
                  delete conf.enabled;
                  return Object.keys(conf).length;
                }
              });
        }
      },

      {
        name : "Type-level analyzer settings",
        phase : "index.mappings",
        color : "red",
        check : function(mappings) {
          return Checks
            .check_types(
              "`analyzer`, `search_analyzer` and `index_analyzer` settings have been removed and will use the index defaults instead",
              mappings,
              function(type) {
                return Checks.get_key(mappings[type], 'search_analyzer')
                  || Checks.get_key(mappings[type], 'index_analyzer')
                  || Checks.get_key(mappings[type], 'analyzer');
              });
        }
      }

    ]);
