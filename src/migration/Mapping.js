"use strict";

function Mapping(index) {

  function completion_fields(fields) {
    return check_hash(
      'yellow',
      'Completion Suggester',
      fields,
      function(mapping, name) {
        if (mapping.type === 'completion') {
          return "Completion field `"
            + name
            + "` will not be compatible with new `completion` fields in 5.x"
        }
      },
      'https://www.elastic.co/guide/en/elasticsearch/reference/master/breaking_50_suggester.html');
  }

  function fielddata_regex(fields) {
    return check_hash(
      'yellow',
      'Fielddata regex filters',
      fields,
      function(mapping, name) {
        if (_.has(mapping, [
          'fielddata', 'filter.regex'
        ])) {
          return "`" + name + "`"
        }
      },
      'https://www.elastic.co/guide/en/elasticsearch/reference/master/breaking_50_mapping_changes.html#_literal_fielddata_filter_regex_literal');
  }

  function field_names_disabled(fields) {
    return check_hash(
      'blue',
      'Disabled `_field_names` prevents `exists` query',
      fields,
      function(mapping, name) {
        if (name.match(':_field_names') && _.has(mapping, 'enabled')) {
          return "`" + name + "`"
        }
      },
      'https://www.elastic.co/guide/en/elasticsearch/reference/master/breaking_50_search_changes.html#_changes_to_queries');
  }

  function source_transform(fields) {
    return check_hash(
      'yellow',
      'Source transform has been removed',
      fields,
      function(mapping, name) {
        if (name.match(':transform')) {
          return "`" + name + "`"
        }
      },
      'https://www.elastic.co/guide/en/elasticsearch/reference/master/breaking_50_mapping_changes.html#_source_transform_removed');
  }

  function timestamp_ttl(fields) {
    return check_hash(
      'yellow',
      '`_timestamp` and `_ttl` fields will not be supported on new indices',
      fields,
      function(mapping, name) {
        if (name.match(/:(_timestamp|_ttl)/)) {
          return "`" + name + "`"
        }
      },
      'https://www.elastic.co/guide/en/elasticsearch/reference/master/breaking_50_mapping_changes.html#_literal__timestamp_literal_and_literal__ttl_literal');
  }

  function classic_similarity(fields) {
    return check_hash(
      'yellow',
      "`default` similarity renamed to `classic`",
      fields,
      function(mapping, name) {
        if (mapping.similarity === 'default') {
          return "`" + name + "`"
        }
      },
      "https://www.elastic.co/guide/en/elasticsearch/reference/master/breaking_50_settings_changes.html#_similarity_settings");
  }

  function percolator(fields) {
    return check_hash(
      'blue',
      'Percolator type replaced by percolator field',
      fields,
      function(mapping, name) {
        if (name === '.percolator:query') {
          return '`.percolator`'
        }
      },
      'https://www.elastic.co/guide/en/elasticsearch/reference/master/breaking_50_percolator.html');
  }

  function parent(fields) {
    return check_hash(
      'blue',
      'Parent field no longer accessible in queries',
      fields,
      function(mapping, name) {
        if (name.match(':_parent')) {
          return "`" + name + "`"
        }
      },
      'https://www.elastic.co/guide/en/elasticsearch/reference/master/breaking_50_mapping_changes.html#_literal__parent_literal_field_no_longer_indexed');
  }

  function ip(fields) {
    return check_hash(
      'blue',
      'IP field aggregations no longer return numeric `from`/`to` values',
      fields,
      function(mapping, name) {
        if (mapping.type === 'ip') {
          return "`" + name + "`"
        }
      },
      'https://www.elastic.co/guide/en/elasticsearch/reference/master/breaking_50_aggregations_changes.html#_literal_ip_range_literal_aggregations');
  }

  function precision_step(fields) {
    return check_hash(
      'blue',
      '`precision_step` no longer supported',
      fields,
      function(mapping, name) {
        if (_.has(mapping, 'precision_step')) {
          return "`" + name + "`"
        }
      },
      'https://www.elastic.co/guide/en/elasticsearch/reference/master/breaking_50_mapping_changes.html#_numeric_fields');
  }

  function flatten_mappings(mappings) {
    var flat = {};

    function flatten_fields(mappings, prefix) {
      _.forEach(mappings, function(mapping, name) {
        if (_.isObject(mapping)) {
          var props = mapping.properties;
          delete mapping.properties;
          var fields = mapping.fields;
          delete mapping.fields;
          flat[prefix + name] = mapping;
          if (props) {
            flatten_fields(props, prefix + name + '.')
          }
          if (fields) {
            flatten_fields(fields, prefix + name + '.')
          }
        }
      })
    }

    _.forEach(mappings, function(mapping, type_name) {
      flatten_fields(mapping.properties, type_name + ':');
      delete mapping.properties;
      flatten_fields(mapping, type_name + ':')
    });

    return flat;
  }

  var color = 'green';

  return es.get('/' + index + '/_mapping')

  .then(function(r) {
    var fields = flatten_mappings(r[index].mappings);
    color = worse(color, completion_fields(fields));
    color = worse(color, fielddata_regex(fields));
    color = worse(color, field_names_disabled(fields));
    color = worse(color, parent(fields));
    color = worse(color, timestamp_ttl(fields));
    color = worse(color, source_transform(fields));
    color = worse(color, classic_similarity(fields));
    color = worse(color, percolator(fields));
    color = worse(color, ip(fields));
    color = worse(color, precision_step(fields));

    return color;
  })

};
