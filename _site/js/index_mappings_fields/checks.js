"use strict";

Checks
  .register(
    "index.mappings.fields",
    [

      {
        name : "Use of `index_name` or `path`",
        docs : "https://www.elastic.co/guide/en/elasticsearch/reference/2.0/breaking_20_mapping_changes.html#_literal_index_name_literal_and_literal_path_literal_removed",
        color : "blue",
        msg : "The `path` and `index_name` parameters are deprecated",
        check : function(field) {
          return field.path || field.index_name;
        }
      },

      {
        name : "Boolean fields",
        docs : "https://www.elastic.co/guide/en/elasticsearch/reference/2.0/breaking_20_mapping_changes.html#migration-bool-fields",
        color : "blue",
        msg : "Boolean fields will return `1/0` instead of `T/F` in scripts, "
          + "aggregations, or sort values",
        check : function(field) {
          return field.type && field.type === "boolean";
        }
      },

      {
        name : "Per-field postings format",
        docs : "https://www.elastic.co/guide/en/elasticsearch/reference/2.0/breaking_20_mapping_changes.html#_posting_and_doc_values_codecs",
        color : "red",
        msg : "The `postings_format` parameter is no longer supported",
        check : function(field) {
          return field.postings_format;
        }
      },

      {
        name : "Binary field compression",
        docs : "https://www.elastic.co/guide/en/elasticsearch/reference/2.0/breaking_20_mapping_changes.html#_compress_and_compress_threshold",
        color : "blue",
        msg : "The `compress` and `compress_threshold` parameters are no longer supported",
        check : function(field) {
          return field.hasOwnProperty('compress') || field.compress_threshold;
        }
      },

      {
        name : "Fielddata formats",
        docs : "https://www.elastic.co/guide/en/elasticsearch/reference/2.0/breaking_20_mapping_changes.html#_fielddata_formats",
        color : "blue",
        msg : "The `fst` and `compressed` fielddata formats are no longer supported and will be ignored",
        check : function(field) {
          var format = Checks.get_key(field, 'fielddata.format');
          return format === 'fst' || format === 'compressed';
        }
      },

      {
        name : "Fields with dots",
        docs : "https://www.elastic.co/guide/en/elasticsearch/reference/2.4/dots-in-names.html",
        color : "yellow",
        msg : "Dots in field names can lead to ambiguous field resolution. Elasticsearch 2.4.0 and above have an option to accept dots in field names, as long as the field does not conflict with existing mappings.",
        check : function(field, name) {
          return name.match(/\\\./)

        }
      },

      {
        name : "Search analyzer without index analyzer",
        docs : "https://www.elastic.co/guide/en/elasticsearch/reference/2.0/breaking_20_mapping_changes.html#_analyzer_mappings",
        color : "red",
        msg : "Analyzer must be set when search_analyzer is set",
        check : function(field) {
          return field.search_analyzer && ! (field.index_analyzer || field.analyzer);
        }
      },

      {
        name : "Position offset gap",
        docs : "https://www.elastic.co/guide/en/elasticsearch/reference/2.0/breaking_20_mapping_changes.html#_position_offset_gap",
        color : "yellow",
        msg : "The `position_offset_gap` parameter has been renamed to `position_increment_gap`",
        check : function(field) {
          return field.hasOwnProperty('position_offset_gap')
        }
      },

      {
        name : "Murmur3",
        docs : "https://www.elastic.co/guide/en/elasticsearch/reference/2.0/breaking_20_removed_features.html#_literal_murmur3_literal_is_now_a_plugin",
        color : "red",
        msg : "The `murmur3` field datatype has been moved to a plugin.",
        check : function(field) {
          return field.type && field.type === "murmur3"
        }
      },

      {
        name : "Attachement Type",
        docs : "",
        color : "yellow",
        msg : "Fields of type `attachment` will not be accessible until it is reindexed.",
        check : function(field) {
          return field.type && field.type === "attachment"
        }
      },

    ]);
