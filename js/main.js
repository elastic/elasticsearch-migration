"use strict";

function forall(obj, f) {
  if (obj.constructor === Array) {
    for (var i = 0; i < obj.length; i++) {
      var ret = f(obj[i]);
      if (ret !== undefined) {
        return ret;
      }
    }
  } else {
    var keys = Object.keys(obj).sort();
    for (var i = 0; i < keys.length; i++) {
      var ret = f(obj[keys[i]], keys[i]);
      if (ret !== undefined) {
        return ret;
      }
    }
  }
}

function Checker(host, indices, out_id) {

  var es_data;
  var log;

  function run() {
    this.log = new Logger(out_id);
    log = this.log;
    log.log('Checking cluster at: ' + host);

    return check_version() //
    .then(load_es_data) //
    .then(function() {
      return Promise.attempt(check_indices)
    })//
    .then(function() {
      return Promise.attempt(finish)
    }) //
    .caught(log.error);
  }

  function finish() {
    log.log('Done');
  }

  function check_indices() {

    var indices = Object.keys(es_data.index.aliases).sort();
    if (indices.length === 0) {
      log.log("No indices found");
      return;
    }

    forall(indices, function(index) {
      var index_color = 'green';
      var index_phases = [ //
      'index.segments', //
      'index.settings', //
      'index.mappings', //
      'index.flat_mappings', //
      'index.mappings.fields' //
      ];

      log.start_section('index', 'Index: `' + index + "`");

      forall(index_phases, function(phase) {
        var data = data_for_phase(phase, index);
        if (data) {
          var checks = Checks.checks_for_phase(phase);
          forall(checks, function(check) {
            var color = 'green';
            var msg = check.check(data, name);
            if (msg) {
              color = check.color;
              index_color = worse_color(index_color, check.color)
            }
            log.result(color, check.name, msg)
          });
        }
      });

      log.set_section_color(index_color);
      log.end_section();
    });
  }

  function data_for_phase(phase, name) {
    var data;
    switch (phase) {

    case "index.segments":
      return {
        segments : Checks.get_key(es_data, "index.segments." + name),
        settings : Checks.get_key(es_data, "index.settings." + name
          + ".settings")
      };

    case "index.settings":
      data = Checks.get_key(es_data, "index.settings." + name);
      return data && (data.settings || data);

    case "index.mappings":
      data = Checks.get_key(es_data, "index.mappings." + name);
      return data && (data.mappings || data);

    case "index.flat_mappings":
    case "index.mappings.fields":
      return Checks.get_key(es_data, "index.flat_mappings." + name);

    default:
      throw ("Unknown phase: " + phase)
    }
  }

  function build_url(action) {
    if (!indices || indices === '*' || indices === '_all') {
      return '/' + action;
    } else {
      return '/' + indices + '/' + action + '?expand_wildcards=open,closed'
    }
  }
  function load_es_data(version) {
    indices = indices || '*';
    return Promise.all([ //
    get_url(build_url('_segments')), //
    get_url(build_url('_settings')), //
    get_url(build_url('_mapping')), //
    get_url(build_url('_aliases')), //
    get_url('/_cluster/settings') //
    ]).//
    then(function(data) {
      es_data = {
        index : {
          segments : data[0].indices,
          settings : version.lt('1.*') ? unflatten_settings(data[1]) : data[1],
          mappings : data[2],
          flat_mappings : flatten_mappings(data[2]),
          aliases : data[3]
        },
        cluster : {
          settings : data[4]
        }
      };
    });
  }

  function flatten_mappings(mappings) {
    var flat = {};

    function flatten_type(type_name, type) {
      var fields = {};

      function flatten_fields(prefix, d) {
        for ( var field_name in d) {
          var field = d[field_name];
          var path = prefix + field_name;

          if (field.properties) {
            flatten_fields(path + ".", field.properties);
            delete field.properties;
          }
          if (field.fields) {
            flatten_fields(path + ".", field.fields);
            delete field.fields;
          }
          field._name = type_name + ":" + path;
          fields[path] = field;
        }
      }

      var properties = type.properties;
      delete type.properties;
      var flat_type = type;
      flatten_fields('', properties);
      flat_type.properties = fields;
      return flat_type;

    }

    for ( var index_name in mappings) {
      var index = mappings[index_name];
      flat[index_name] = {};
      var types = index.mappings || index;
      for ( var type in types) {
        flat[index_name][type] = flatten_type(type, types[type]);
      }
    }

    return flat;
  }

  function unflatten_settings(settings) {

    function unflatten(current, parts, val) {
      var next_part = parts.shift();
      if (!parts.length) {
        current[next_part] = val;
      } else {
        current[next_part] = current[next_part] || {};
        unflatten(current[next_part], parts, val)
      }
    }

    var new_settings = {};
    forall(settings, function(index, name) {

      var current = {};
      forall(index.settings, function(val, setting) {
        unflatten(current, setting.split(/\./), val);
      });
      new_settings[name] = {
        settings : current
      }
    });
    return new_settings;
  }

  function check_version() {
    return get_version()
      .then(
        function(version) {
          if (version.gt('1.*') || version.lt('0.90.*')) {
            throw ('This plugin only works on Elasticsearch versions 0.90.x - 1.x. '
              + 'This node is version ' + version)
          } else {
            log.result('green', 'Elasticsearch version: ' + version);
            return version;
          }
        });
  }

  function get_version() {
    return get_url('/').then(
      function(r) {
        var snapshot = Checks.get_key(r, "version.build_snapshot")
          || Checks.get_key(r, "version.snapshot_build");
        return new ES_Version(r.version.number, snapshot);
      });
  }

  function then_in_turn(list, func) {
    return (function next() {
      if (list.length) {
        return Promise.attempt(func, [ list.shift() ]).then(next);
      }
    }());
  }

  function worse_color(current_color, new_color) {
    if (current_color === 'red' || new_color === 'red') {
      return 'red'
    }
    if (current_color === 'yellow' || new_color === 'yellow') {
      return 'yellow'
    }
    if (current_color === 'blue' || new_color === 'blue') {
      return 'blue'
    }
    return 'green';
  }

  function get_url(path, params) {
    return new Promise(function(resolve, reject) {
      jQuery.getJSON(host + path, params).done(resolve).fail(function(e) {
        var msg = "Failed to fetch [" + host + path;
        if (params) {
          msg += '?' + jQuery.param(params);
        }
        msg += '].  REASON: ';
        if (e.responseJSON && e.responseJSON.error) {
          msg += e.responseJSON.error;
        } else if (e.responseText) {
          msg += e.responseText;
        } else {
          msg += e.statusText;
        }
        reject(msg);
      });
    });
  }

  return {
    run : run,
    log : log,
    version : get_version
  }
};

