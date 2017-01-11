"use strict";

function MigrationController(es, log, error) {

  require('Logger.js');
  require('ClusterSettings.js');
  require('Plugins.js');
  require('Indices.js');
  require('NodeSettings.js');

  var log = new Logger(log, error);
  var version;
  var global_color = 'green';
  var cloud = window.location.search==='?cloud';

  function worse(old_color, new_color) {
    if (new_color === 'red' || old_color === 'red') {
      return 'red'
    }
    if (new_color === 'yellow' || old_color === 'yellow') {
      return 'yellow'
    }
    if (new_color === 'blue' || old_color === 'blue') {
      return 'blue'
    }
    return 'green'
  }

  function process_color(old_color, new_color) {
    log.set_section_color(new_color);
    log.end_section();
    return worse(old_color, new_color);
  }

  function check_array(color, name, items, check, doc) {
    var fail = [];
    _.forEach(items, function(v) {
      var ret_val = check(v);
      if (ret_val) {
        fail.push(ret_val)
      }
    });
    return log.result(color, name, fail, doc);
  }

  function check_hash(color, name, items, check, doc) {
    var fail = [];
    _.forEach(items, function(v, k) {
      var ret_val = check(v, k);
      if (ret_val) {
        fail.push(ret_val)
      }
    });
    return log.result(color, name, fail, doc);
  }

  function strip_dot_num(k) {
    return k.replace(/\.\d+$/, '');
  }

  log.header('Checking host: ' + es.host);

  es.get_version()

  .then(function(v) {
    version = v;
    if (version.lt('2.0.*') || version.gt('2.*')) {
      throw ('The Cluster Checkup only works with Elasticsearch versions 2.0.0 - 2.x')
    }
  })

  .then(function() {
    log.start_section('top', 'Plugins');
    return new Plugins();
  })

  .then(function(color) {
    global_color = process_color(global_color, color);
    log.start_section('top', 'Cluster Settings');
    return new ClusterSettings();
  })

  .then(function(color) {
    if (cloud) {
      return color
    }
    global_color = process_color(global_color, color);
    log.start_section('top', 'Node Settings');
    return new NodeSettings();
  })

  .then(function(color) {
    global_color = process_color(global_color, color);
    log.start_section('top', 'Indices');
    return new Indices();
  })

  .then(function(color) {
    global_color = process_color(global_color, color);
    var msg;
    switch (global_color) {
    case "green":
      msg = "All checks passed";
      break;
    case "red":
      msg = "Checks completed. The cluster requires action before upgrading.";
      break;
    case "blue":
      msg = "Some checks failed. Upgrade with caution";
    }
    log.header(msg, global_color);
  })

  .caught(log.error);
}
