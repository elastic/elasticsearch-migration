"use strict";

Checks
  .register(
    "index.mappings",
    [

      {
        name : "Field: `_id`",
        color : "blue",
        msg : "The `_id` field can no longer be configured in new indices. "
          + "Importantly, it will not be possible to extract the `_id` value "
          + "from a `path`",

        check : function(mapping) {
          return mapping._id && Object.keys(mapping._id).length;
        }
      },

      {
        name : "Field: `_type`",
        color : "blue",
        msg : "The `_type` field can no longer be configured in new indices",
        check : function(mapping) {
          return mapping._type && Object.keys(mapping._type).length;
        }
      },

      {
        name : "Field: `_analyzer`",
        color : "yellow",
        msg : "The `_analyzer` field has been removed and will be ignored",
        check : function(mapping) {
          return Checks.get_key(mapping, '_analyzer')
            || Checks.get_key(mapping, 'properties._analyzer')
        }
      },

      {
        name : "Field: `_boost`",
        color : "yellow",
        msg : "The `_boost` field has been removed and will be ignored",
        check : function(mapping) {
          return mapping._boost !== undefined;
        }
      },

      {
        name : "Field: `_routing`",
        color : "blue",
        msg : "The `_routing` field will only accept the `required` parameter in "
          + "future indices. Importantly, it will not be possible to extract "
          + "the `_routing` value from a `path`",
        check : function(mapping) {
          var conf = Checks.get_key(mapping, '_routing');
          if (conf) {
            conf = JSON.parse(JSON.stringify(conf));
            delete conf.required;
            return Object.keys(conf).length;
          }
        }
      },

      {
        name : "Field: `_index`",
        color : "blue",
        msg : "The `_index` field will only accept the `enabled` parameter in "
          + "future indices",
        check : function(mapping) {
          var conf = Checks.get_key(mapping, '_index');
          if (conf) {
            conf = JSON.parse(JSON.stringify(conf));
            delete conf.enabled;
            return Object.keys(conf).length;
          }
        }
      },

      {
        name : "Field: `_size`",
        color : "blue",
        msg : "The `_size` field will only accept the `enabled` parameter in "
          + "future indices",
        check : function(mapping) {
          var conf = Checks.get_key(mapping, '_size');
          if (conf) {
            conf = JSON.parse(JSON.stringify(conf));
            delete conf.enabled;
            return Object.keys(conf).length;
          }
        }
      },

      {
        name : "Field: `_timestamp`",
        color : "blue",
        msg : "The `_timestamp` field will only accept the `enabled`, "
          + "`format`, and `default` parameters in future indices. "
          + "Importantly, it will not be possible to extract the `_timestamp` value "
          + "from a `path`.",
        check : function(mapping) {
          var conf = Checks.get_key(mapping, '_timestamp');
          if (conf) {
            conf = JSON.parse(JSON.stringify(conf));
            delete conf.enabled;
            delete conf.format;
            delete conf["default"];
            return Object.keys(conf).length;
          }
        }
      },

      {
        name : "Type-level analyzer settings",
        phase : "index.mappings",
        color : "red",
        msg : "`analyzer`, `search_analyzer` and `index_analyzer` settings have been "
          + "removed and will use the index defaults instead",
        check : function(mapping) {
          return mapping.analyzer || mapping.search_analyzer
            || mapping.index_analyzer;
        }
      },

      {
        name : "Reserved field names",
        color : "blue",
        msg : "The `_uid`, `_id`, `_type`, `_source`, `_all`, `_parent`, `_field_names`, "
          + "`_routing`, `_index`, `_size`, `_timestamp`, and `_ttl` "
          + "field names are reserved and can no longer be used in the document `_source`.",
        check : function(mapping) {
          var found;
          var fields = mapping.properties || {};
          forall(fields, function(v, k) {
            if (k === '_uid' || k === '_type' || k === '_source'
              || k === '_parent' || k === '_field_names' || k === '_index'
              || k === '_size') {
              found = true;
            }
          });
          return found;
        }
      }

    ]);
