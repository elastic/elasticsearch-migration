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

function Checker(host, out_id) {

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
    if (indices.length == 0) {
      log.log("No indices found");
      return;
    }

    forall(indices, function(index) {
      var index_color = 'green';
      log.start_section('index', 'Index: ' + index);

      /* index.* */
      forall([ 'index.segments', 'index.settings', 'index.mappings',
        'index.flat_mappings' ], function(phase) {

        var data = data_for_phase(phase, index);
        if (data) {
          var checks = Checks.checks_for_phase(phase);
          var color = run_checks(checks, data, index);
          index_color = worse_color(index_color, color);
        }
      });

      /* index.mappings.fields */
      var mappings = Checks.get_key(es_data, 'index.flat_mappings.' + index);
      if (mappings) {
        var checks = Checks.checks_for_phase('index.mappings.fields');
        forall(checks, function(check) {
          var color = check_fields(check, mappings);
          index_color = worse_color(index_color, color);
        });
      }
      log.set_section_color(index_color);
      log.end_section();
    });
  }

  function check_fields(check, mappings) {
    var errors = [];
    forall(mappings, function(type) {
      if ("properties" in type) {
        forall(type.properties, function(field) {
          var msg = check.check(field);
          if (msg) {
            errors.push(msg)
          }
        })
      }
    });

    var color = errors.length ? check.color : 'green';
    log.result(color, check.name, errors.join("\n"));
    return color;
  }

  function run_checks(checks, data, name) {
    var phase_color = 'green';
    forall(checks, function(check) {
      var msg = check.check(data, name);
      var color = 'green';
      if (msg) {
        color = check.color;
        phase_color = worse_color(phase_color, color);
      }
      log.result(color, check.name, msg);
    });
    return phase_color;
  }

  function data_for_phase(phase, name) {
    var data = Checks.get_key(es_data, phase + '.' + name);
    if (data == "") {
      return false
    }

    var sub = phase.substr(6);
    if (sub in data) {
      return data[sub];
    }
    return data;
  }

  function load_es_data(version) {
    return Promise.all([ //
    get_url('/_segments'), //
    get_url('/_settings'), //
    get_url('/_mapping'), //
    [],// TODO: get_url('/_warmers'), // not supported on 1.0.0
    get_url('/_aliases'), //
    get_url('/_cluster/settings') //
    ]).//
    then(function(data) {
      es_data = {
        index : {
          segments : data[0].indices,
          settings : data[1],
          mappings : data[2],
          flat_mappings : flatten_mappings(data[2]),
          warmers : data[3],
          aliases : data[4]
        },
        cluster : {
          settings : data[5]
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

          if ("properties" in field) {
            flatten_fields(path + ".", field.properties);
            delete field.properties;
          }
          if ("fields" in field) {
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
      var index = mappings[index_name].mappings;
      flat[index_name] = {};
      for ( var type in index) {
        flat[index_name][type] = flatten_type(type, index[type]);
      }
    }

    return flat;
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
    if (current_color == 'red' || new_color == 'red') {
      return 'red'
    }
    if (current_color == 'yellow' || new_color == 'yellow') {
      return 'yellow'
    }
    if (current_color == 'blue' || new_color == 'blue') {
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
        if (e.responseJSON && ("error" in e.responseJSON)) {
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

