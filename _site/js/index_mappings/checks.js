"use strict";

Checks
  .register(
    "index.mappings",
    [

      {
        name : "Type name: length",
        docs : "https://www.elastic.co/guide/en/elasticsearch/reference/2.0/breaking_20_mapping_changes.html#_type_names_may_not_be_longer_than_255_characters",
        color : "yellow",
        msg : "Mapping type names longer than 255 characters may no longer be added.",

        check : function(mapping, name) {
          return name.length > 255
        }
      },

      {
        name : "Type name: initial dot",
        docs : "https://www.elastic.co/guide/en/elasticsearch/reference/2.0/breaking_20_mapping_changes.html#_type_names_may_not_start_with_a_dot",
        color : "yellow",
        msg : "Mapping type names may not begin with a dot in new indices.",

        check : function(mapping, name) {
          return name.substr(0, 1) === '.' && name !== '.percolator';
        }
      },

      {
        name : "Percolator",
        docs : "",
        color : "red",
        msg : "Indices with the percolator type cannot be upgraded.",

        check : function(mapping, name) {
          return name === '.percolator';
        }
      },

      {
        name : "Field: `_id`",
        docs : "https://www.elastic.co/guide/en/elasticsearch/reference/2.0/breaking_20_mapping_changes.html#migration-meta-fields",
        color : "blue",
        msg : "The `_id` field can no longer be configured in new indices. "
          + "Importantly, it will not be possible to extract the `_id` value "
          + "from a `path`",

        check : function(mapping, name) {
          return mapping._id && Object.keys(mapping._id).length && name !== '.percolator';
        }
      },

      {
        name : "Field: `_type`",
        docs : "https://www.elastic.co/guide/en/elasticsearch/reference/2.0/breaking_20_mapping_changes.html#migration-meta-fields",
        color : "blue",
        msg : "The `_type` field can no longer be configured in new indices",
        check : function(mapping) {
          return mapping._type && Object.keys(mapping._type).length;
        }
      },

      {
        name : "Field: `_analyzer`",
        docs : "https://www.elastic.co/guide/en/elasticsearch/reference/2.0/breaking_20_mapping_changes.html#migration-meta-fields",
        color : "yellow",
        msg : "The `_analyzer` field has been removed and will be ignored",
        check : function(mapping) {
          return Checks.get_key(mapping, '_analyzer')
            || Checks.get_key(mapping, 'properties._analyzer')
        }
      },

      {
        name : "Field: `_boost`",
        docs : "https://www.elastic.co/guide/en/elasticsearch/reference/2.0/breaking_20_mapping_changes.html#migration-meta-fields",
        color : "yellow",
        msg : "The `_boost` field has been removed and will be ignored",
        check : function(mapping) {
          return mapping._boost !== undefined;
        }
      },

      {
        name : "Field: `_routing`",
        docs : "https://www.elastic.co/guide/en/elasticsearch/reference/2.0/breaking_20_mapping_changes.html#migration-meta-fields",
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
        docs : "https://www.elastic.co/guide/en/elasticsearch/reference/2.0/breaking_20_mapping_changes.html#migration-meta-fields",
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
        docs : "https://www.elastic.co/guide/en/elasticsearch/reference/2.0/breaking_20_removed_features.html#_literal__size_literal_is_now_a_plugin",
        msg : "The `_size` field has been moved to a plugin.",
        check : function(mapping) {
          return Checks.get_key(mapping, '_size');
        }
      },

      {
        name : "Field: `_timestamp`",
        docs : "https://www.elastic.co/guide/en/elasticsearch/reference/2.0/breaking_20_mapping_changes.html#migration-meta-fields",
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
        docs : "https://www.elastic.co/guide/en/elasticsearch/reference/2.0/breaking_20_mapping_changes.html#_analyzer_mappings",
        color : "red",
        msg : "`analyzer`, `search_analyzer` and `index_analyzer` settings have been "
          + "removed and will use the index defaults instead",
        check : function(mapping) {
          return mapping.analyzer || mapping.search_analyzer
            && mapping.search_analyzer !== 'default_search'
            || mapping.index_analyzer
            && mapping.index_analyzer !== 'default_index';
        }
      },

      {
        name : "Reserved field names",
        docs : "https://www.elastic.co/guide/en/elasticsearch/reference/2.0/breaking_20_mapping_changes.html#migration-meta-fields",
        color : "red",
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
