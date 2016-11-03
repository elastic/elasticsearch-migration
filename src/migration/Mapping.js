"use strict";

function Mapping(index) {

  function format_name(name) {
    return '`' + name.replace(/^([^\0]+)\0+/, "[$1]:") + '`';
  }

  function mapping_limits(field_stats) {
    var fail = [];
    if (field_stats.num_fields > 1000) {
      fail
        .push('New indices may not have more than 1000 fields. This index has `'
          + field_stats.num_fields
          + '`.');
    }
    if (field_stats.max_depth > 20) {
      fail
        .push('New indices may not have fields more than 20 levels deep. This index has a maximum depth of `'
          + field_stats.max_depth
          + '`.');
    }
    if (field_stats.num_nested > 50) {
      fail
        .push('New indices may not have more than 50 `nested` fields. This index has `'
          + field_stats.num_nested
          + '`.');
    }
    return log
      .result(
        'yellow',
        "Field mapping limits in new 5.x indices",
        fail,
        'https://www.elastic.co/guide/en/elasticsearch/reference/5.0/breaking_50_mapping_changes.html#_warmers#_field_mapping_limits');
  }

  function blank_names(fields) {
    return check_hash(
      'yellow',
      'Blank field names',
      fields,
      function(mapping, name) {
        if (name.match(/\0$/) || name.match(/\0.*\.$/)) {
          return "Blank field "
            + format_name(name + '&lt;blank&gt;')
            + " will not be accepted in new indices in 5.x"
        }
      },
      'https://www.elastic.co/guide/en/elasticsearch/reference/5.0/breaking_50_mapping_changes.html#_blank_field_names_is_not_supported');
  }

  function completion_fields(fields) {
    return check_hash(
      'yellow',
      'Completion Suggester',
      fields,
      function(mapping, name) {
        if (mapping.type === 'completion') {
          return "Completion field "
            + format_name(name)
            + " will not be compatible with new `completion` fields in 5.x"
        }
      },
      'https://www.elastic.co/guide/en/elasticsearch/reference/5.0/breaking_50_suggester.html');
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
          return format_name(name)
        }
      },
      'https://www.elastic.co/guide/en/elasticsearch/reference/5.0/breaking_50_mapping_changes.html#_literal_fielddata_filter_regex_literal');
  }

  function field_names_disabled(fields) {
    return check_hash(
      'blue',
      'Disabled `_field_names` prevents `exists` query',
      fields,
      function(mapping, name) {
        if (name.match(':_field_names') && _.has(mapping, 'enabled')) {
          return format_name(name)
        }
      },
      'https://www.elastic.co/guide/en/elasticsearch/reference/5.0/breaking_50_search_changes.html#_changes_to_queries');
  }

  function source_transform(fields) {
    return check_hash(
      'red',
      'Source transform has been removed',
      fields,
      function(mapping, name) {
        if (name.match('\0\0transform$')) {
          return format_name(name)
        }
      },
      'https://www.elastic.co/guide/en/elasticsearch/reference/5.0/breaking_50_mapping_changes.html#_source_transform_removed');
  }

  function timestamp_ttl(fields) {
    return check_hash(
      'yellow',
      '`_timestamp` and `_ttl` fields will not be supported on new indices',
      fields,
      function(mapping, name) {
        if (name.match(/\0\0(_timestamp|_ttl)/)) {
          return format_name(name)
        }
      },
      'https://www.elastic.co/guide/en/elasticsearch/reference/5.0/breaking_50_mapping_changes.html#_literal__timestamp_literal_and_literal__ttl_literal');
  }

  function classic_similarity(fields) {
    return check_hash(
      'yellow',
      "`default` similarity renamed to `classic`",
      fields,
      function(mapping, name) {
        if (mapping.similarity === 'default') {
          return format_name(name)
        }
      },
      "https://www.elastic.co/guide/en/elasticsearch/reference/5.0/breaking_50_settings_changes.html#_similarity_settings");
  }

  function size(fields) {
    return check_hash(
      'blue',
      '`_size` field must be reindexed in 5.x to support aggregations, sorting, or scripting',
      fields,
      function(mapping, name) {
        if (name.match(/\0\0_size$/)) {
          return format_name(name)
        }
      },
      'https://www.elastic.co/guide/en/elasticsearch/reference/5.0/breaking_50_plugins.html#_mapper_size_plugin');
  }

  function percolator(fields) {
    return check_hash(
      'blue',
      'Percolator type replaced by percolator field.  Check all percolator queries for use of filters, which were deprecated in 2.0 and removed in 5.0.',
      fields,
      function(mapping, name) {
        if (name === ".percolator\0query") {
          return '`.percolator`'
        }
      },
      'https://www.elastic.co/guide/en/elasticsearch/reference/5.0/breaking_50_percolator.html');
  }

  function parent(fields) {
    return check_hash(
      'blue',
      'Parent field no longer accessible in queries',
      fields,
      function(mapping, name) {
        if (name.match('\0\0_parent')) {
          return format_name(name)
        }
      },
      'https://www.elastic.co/guide/en/elasticsearch/reference/5.0/breaking_50_mapping_changes.html#_literal__parent_literal_field_no_longer_indexed');
  }

  function ip(fields) {
    return check_hash(
      'blue',
      'IP field aggregations no longer return numeric `from`/`to` values',
      fields,
      function(mapping, name) {
        if (mapping.type === 'ip') {
          return format_name(name)
        }
      },
      'https://www.elastic.co/guide/en/elasticsearch/reference/5.0/breaking_50_aggregations_changes.html#_literal_ip_range_literal_aggregations');
  }

  function precision_step(fields) {
    return check_hash(
      'blue',
      '`precision_step` no longer supported',
      fields,
      function(mapping, name) {
        if (_.has(mapping, 'precision_step')) {
          return format_name(name)
        }
      },
      'https://www.elastic.co/guide/en/elasticsearch/reference/5.0/breaking_50_mapping_changes.html#_numeric_fields');
  }

  function geopoint(fields) {
    return check_hash(
      'blue',
      'Geo-point parameters `geohash`, `geohash_prefix`, `geohash_precision`, and `lat_lon` no longer supported',
      fields,
      function(mapping, name) {
        if (_.has(mapping, 'geohash')
          || _.has(mapping, 'geohash_prefix')
          || _.has(mapping, 'geohash_precision')
          || _.has(mapping, 'lat_lon')) {
          return format_name(name)
        }
      },
      'https://www.elastic.co/guide/en/elasticsearch/reference/current/breaking_50_mapping_changes.html#_literal_geo_point_literal_fields');
  }

  function flatten_mappings(mappings) {
    var flat = {};
    var num_nested = 0;
    var depth = 0;
    var max_depth = 0;
    var num_fields = 0;

    function flatten_fields(mappings, prefix) {
      if (max_depth < ++depth) {
        max_depth = depth;
      }
      _.forEach(mappings, function(mapping, name) {
        if (_.isObject(mapping)) {
          num_fields++;
          var props = mapping.properties;
          var fields = mapping.fields;
          flat[prefix + name] = mapping;
          if (props) {
            if (mapping.type && mapping.type === 'nested') {
              num_nested++;
            }
            delete mapping.properties;
            flatten_fields(props, prefix + name + '.')
          } else {
            if (fields) {
              delete mapping.fields;
              flatten_fields(fields, prefix + name + '.');
            }
          }
        }
      });
      depth--;
    }

    _.forEach(mappings, function(mapping, type_name) {
      var props = mapping.properties;
      delete mapping.properties;
      flatten_fields(mapping, type_name + "\0\0");
      flatten_fields(props, type_name + "\0");
    });
    return {
      fields : flat,
      num_nested : num_nested,
      num_fields : num_fields,
      max_depth : max_depth
    }
  }

  var color = 'green';

  return es.get('/' + encodeURIComponent(index) + '/_mapping')

  .then(function(r) {
    var field_stats = flatten_mappings(r[index].mappings);

    color = worse(color, mapping_limits(field_stats));

    var fields = field_stats.fields;

    color = worse(color, blank_names(fields));
    color = worse(color, completion_fields(fields));
    color = worse(color, fielddata_regex(fields));
    color = worse(color, field_names_disabled(fields));
    color = worse(color, parent(fields));
    color = worse(color, timestamp_ttl(fields));
    color = worse(color, source_transform(fields));
    color = worse(color, classic_similarity(fields));
    color = worse(color, percolator(fields));
    color = worse(color, size(fields));
    color = worse(color, ip(fields));
    color = worse(color, precision_step(fields));
    color = worse(color, geopoint(fields));

    return color;
  })

};
