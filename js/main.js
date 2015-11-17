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

function Checker(host, indices, ignore_closed, out_id, enable_creds) {

  var es_data;
  var log;

  function run() {
    log = this.log = new Logger(out_id);
    log.header('Checking cluster at: ' + host);

    return check_version() //
    .then(load_es_data) //
    .then(check_cluster)//
    .then(check_indices)//
    .then(finish) //
    .caught(log.error);
  }

  function finish(color) {
    if (color === 'green') {
      log.header('All checks completed successfully.', color);
    } else if (color === 'red') {
      log.header(
        'Checks completed. The cluster requires action before upgrading.',
        color);
    } else {
      log.header('Some checks failed. Upgrade with caution.', color);
    }
  }

  function check_cluster() {

    log.start_section('cluster', 'Cluster settings');
    var data = Checks.get_key(es_data, "cluster.settings");
    var color = run_checks('cluster.settings', data);

    log.set_section_color(color);
    log.end_section();
    return color;
  }

  function check_indices() {
    var global_color = 'green';

    var indices = Object.keys(es_data.index.aliases).sort();
    if (indices.length === 0) {
      log.log("No indices found");
      return global_color;
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

      if (ignore_closed
        && !Checks.get_key(es_data, "index.segments").hasOwnProperty(index)) {
        log.log("Skipping checks on closed index.");
        log.end_section();
        return;
      }

      forall(index_phases, function(phase) {
        var data = data_for_phase(phase, index);
        index_color = Checks.worse_color(index_color, run_checks(phase, data))
      });

      log.set_section_color(index_color);
      log.end_section();
      global_color = Checks.worse_color(global_color, index_color);
    });
    return global_color;
  }

  function run_checks(phase, data) {
    if (!data) {
      return;
    }

    var section_color = 'green';
    var checker = checker_for_phase(phase);
    var checks = Checks.checks_for_phase(phase);

    forall(checks, function(check) {
      var color = 'green';
      var msg = checker(check, data);
      if (msg) {
        color = check.color;
        section_color = Checks.worse_color(section_color, check.color);
      }
      log.result(color, check.name, msg, check.docs);
    });
    return section_color;
  }

  function data_for_phase(phase, name) {
    var data;
    name = name.replace(/\./g, '\\.');
    switch (phase) {

    case "index.segments":
      return {
        health : Checks.get_key(es_data, "index.health." + name) || {},
        segments : Checks.get_key(es_data, "index.segments." + name) || {},
        settings : Checks.get_key(es_data, "index.settings." + name
          + ".settings")
          || {}
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

  function checker_for_phase(phase) {

    function check_types(check, mappings) {
      var errors = [];
      forall(mappings, function(mapping, type) {
        if (check.check(mapping, type)) {
          errors.push("`" + type + "`");
        }
      });
      if (errors.length) {
        return check.msg + ", in type" + (errors.length > 1 ? 's: ' : ': ')
          + errors.join(", ") + '.';
      }
    }

    function check_fields(check, mappings) {
      var errors = [];
      forall(mappings, function(mapping, type) {
        if (mapping.properties) {
          forall(mapping.properties, function(field_mapping, field) {
            if (check.check(field_mapping, field)) {
              errors.push("`" + type + ':' + field + "`");
            }
          })
        }
      });
      if (errors.length) {
        return check.msg + ", in field" + (errors.length > 1 ? 's: ' : ': ')
          + errors.join(", ") + '.';
      }
    }

    switch (phase) {

    case "index.mappings":
      return check_types;

    case "index.mappings.fields":
      return check_fields;

    default:
      return function(check, data) {
        return check.check(data);
      };
    }

  }

  function build_url(action) {
    if (!indices || indices === '*' || indices === '_all') {
      return '/' + action;
    } else if (action === '_segments' || ignore_closed) {
      return '/' + indices + '/' + action + '?expand_wildcards=open'
    } else {
      return '/' + indices + '/' + action + '?expand_wildcards=open,closed'
    }
  }

  function cluster_health_url() {
    if (!indices || indices === '*' || indices === '_all') {
      return '/_cluster/health?level=indices';
    } else {
      return '/_cluster/health/' + indices
        + '?level=indices&expand_wildcards=open,closed'
    }
  }

  function load_es_data(version) {
    indices = indices || '*';
    return Promise.all([ //
    get_url(build_url('_segments')).caught(function(e) {
      return {}
    }), //
    get_url(build_url('_settings')).caught(function(e) {
      return {
        persistent : {}
      }
    }), //
    get_url(build_url('_mapping')), //
    get_url(build_url('_aliases')), //
    get_url(cluster_health_url()), //
    get_url('/_cluster/settings') //
    ]).//
    then(
      function(data) {
        es_data = {
          index : {
            segments : data[0].indices,
            settings : version.lt('1.*') ? unflatten_index_settings(data[1])
              : data[1],
            mappings : data[2],
            flat_mappings : flatten_mappings(data[2]),
            aliases : data[3],
            health : data[4].indices
          },
          cluster : {
            settings : version.lt('1.*') ? unflatten_cluster_settings(data[5])
              : data[5]
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
          var path = prefix + field_name.replace(/\./g, '\\.');

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

  function unflatten(current, parts, val) {
    var next_part = parts.shift();
    if (!parts.length) {
      current[next_part] = val;
    } else {
      current[next_part] = current[next_part] || {};
      unflatten(current[next_part], parts, val)
    }
  }

  function unflatten_index_settings(settings) {

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

  function unflatten_cluster_settings(settings) {

    var new_settings = {};
    forall(settings.persistent, function(val, setting) {
      unflatten(new_settings, setting.split(/\./), val);
    });
    return {
      persistent : new_settings
    };
  }

  function check_version() {
    function is_version_ok(version) {
      if (version.gt('1.*') || version.lt('0.90.*')) {
        throw ('This plugin only works on Elasticsearch versions 0.90.x - 1.x. '
          + 'This node is version ' + version)
      } else {
        log.result('green', 'Elasticsearch version: ' + version);
        return version;
      }
    }
    ;

    return get_version().then(is_version_ok);
  }

  function get_version() {
    return get_url('/').then(
      function(r) {
        var snapshot = Checks.get_key(r, "version.build_snapshot")
          || Checks.get_key(r, "version.snapshot_build");
        return new ES_Version(r.version.number, snapshot);
      });
  }

  function get_url(path, params) {
    var req = {
      dataType : "json",
      url : host + path,
      data : params
    };
    if (enable_creds) {
      req['xhrFields'] = {
        withCredentials : true
      };
      req['crossDomain'] = true;
    }
    return new Promise(
      function(resolve, reject) {
        jQuery
          .ajax(req)
          .done(resolve)
          .fail(
            function(e) {
              var msg = "Failed to fetch [" + host + path;
              if (params) {
                msg += '?' + jQuery.param(params);
              }
              msg += ']. ';
              var reason;
              if (e.responseJSON && e.responseJSON.error) {
                reason = e.responseJSON.error;
              } else if (e.responseText) {
                reason = e.responseText;
              } else {
                reason = e.statusText;
              }

              if (reason.match(/^\s*</)) {
                reason = 'Is the URL correct?';
              } else if (reason === 'error') {
                reason = 'Is the URL correct?';
                var origin = window.location.protocol + "//"
                  + window.location.hostname
                  + (window.location.port ? ':' + window.location.port : '');
                if (path.indexOf(origin) !== 0) {
                  reason += ' Does Elasticsearch have <a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/modules-http.html">CORS enabled</a> and properly configured?'
                }
              }
              msg += " " + reason;
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

