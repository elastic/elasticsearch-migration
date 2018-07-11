"use strict";

function NodeSettings() {

  var nodes_color = 'green';
  var nodes;

  function jvm_version(node) {
    var jvm_version = node.jvm.version;
    if (jvm_version >= "1.8.0") {
      return;
    }
    return log.result('red', 'Java Version', [
      "Java version 8 (1.8.0) or above is required. Current version: `"
        + jvm_version
        + "`"
    ], '');

  }

  function node_roles(node) {
    var roles = {
      "data" : null,
      "master" : null,
      "client" : "`node.client: true` should be replaced with `node.data: false` and `node.master: false`"
    };
    return check_hash(
      'red',
      'Node roles',
      node.attributes,
      function(v, k) {
        return roles[k]
      },
      "https://www.elastic.co/guide/en/elasticsearch/reference/5.0/breaking_50_settings_changes.html#_node_types_settings");
  }

  function node_attrs(node) {
    var known = {
      "local" : true,
      "mode" : true,
      "client" : true,
      "data" : true,
      "master" : true,
      "max_local_storage_nodes" : true,
      "portsfile" : true,
      "enable_lucene_segment_infos_trace" : true,
      "name" : true,
      "add_id_to_custom_path" : true
    };
    return check_hash(
      'red',
      'Node attributes move to `attr` namespace',
      node.attributes,
      function(v, k) {
        var base_k = strip_dot_num(k);
        if (known[base_k] || base_k.match(/^attr\./)) {
          return;
        }
        delete node.settings['node.' + k];
        return "`node."
          + base_k
          + "` should be rewritten as `node.attr."
          + base_k
          + "`"
      },
      "https://www.elastic.co/guide/en/elasticsearch/reference/5.0/breaking_50_settings_changes.html#_node_attribute_settings");
  }

  function heap_size(node) {
    var fail = [];
    if (node.jvm.mem.heap_init_in_bytes > 1.1 * node.jvm.mem.heap_max_in_bytes) {
      fail = [
        'The min heap size (`-Xms`) and max heap size (`-Xmx`) must be set to the same value'
      ];
    }
    return log
      .result(
        'red',
        'Heap Size',
        fail,
        'https://www.elastic.co/guide/en/elasticsearch/reference/5.0/heap-size.html');
  }

  function file_descriptors(node) {
    var min = node.os.name === 'Mac OS X' ? 10240 : node.os.name
      .match(/Windows/) ? -1 : 65536;
    var fail = [];
    if (node.process.max_file_descriptors < min) {
      fail = [
        'At least `'
          + min
          + '` file descriptors must be available to Elasticsearch'
      ];
    }
    return log
      .result(
        'red',
        'File Descriptors',
        fail,
        'https://www.elastic.co/guide/en/elasticsearch/reference/5.0/file-descriptors.html');
  }

  function mlockall(node) {
    var fail = [];
    if (node.settings['bootstrap.mlockall'] === 'true'
      && !node.process.mlockall) {
      fail = [
        '`bootstrap.mlockall` is set to `true` but mlockall has failed'
      ];
    }
    return log
      .result(
        'red',
        'Mlockall',
        fail,
        'https://www.elastic.co/guide/en/elasticsearch/reference/5.0/setup-configuration-memory.html');
  }

  function script_settings(node) {
    return check_hash(
      'red',
      'Script Settings',
      node.settings,
      function(v, k) {
        if (k.match(/^script\./)) {
          var val = node.settings[k];
          var msg = [];
          if (k === 'script.default_lang') {
            delete node.settings[k];
            return '`script.default_lang` has been renamed to `script.legacy.default_lang`.  The new default scripting language is `painless` and cannot be changed.';
          }
          var new_k = k.replace(/\.indexed/, '.stored').replace(
            '/\.py\b',
            '.python').replace('\.js\b', '.javascript');
          if (new_k !== k) {
            msg.push('`' + k + '` has been renamed to `' + new_k + '`');
            delete node.settings[k];
            k = new_k;
          }
          if (!val.match(/true|false/)) {
            msg.push("`" + k + "` only accepts `true` | `false`");
          }
          return msg.join("\n");
        }
      },
      "https://www.elastic.co/guide/en/elasticsearch/reference/5.0/breaking_50_settings_changes.html#_script_mode_settings");
  }

  function host_settings(node) {
    return check_hash(
      'red',
      'Host Settings',
      node.settings,
      function(v, k) {
        var base_k = strip_dot_num(k);
        if (base_k.match(/\.host$/)) {
          var val = node.settings[k];
          if (val === '_non_loopback_') {
            return "`" + base_k + "` no longer accepts `_non_loopback_`"
          }
        }
      },
      "https://www.elastic.co/guide/en/elasticsearch/reference/5.0/breaking_50_settings_changes.html#_network_settings");
  }

  function default_index_analyzer(node) {
    return check_hash(
      'red',
      'Default Index Analyzer',
      node.settings,
      function(v, k) {
        if (k.match(/^index.analysis.analyzer.default_index/)) {
          var new_k = k.replace(
            /^(index.analysis.analyzer.default)_index/,
            "$1");
          delete node.settings[k];
          return "`"
            + k
            + "` can no longer be set in the config file, "
            + "and has been renamed to `"
            + new_k
            + "`"
        }
      },
      'https://www.elastic.co/guide/en/elasticsearch/reference/5.0/breaking_50_settings_changes.html#_index_level_settings');
  }

  function index_settings(node) {
    return check_hash(
      'red',
      'Index settings',
      node.settings,
      function(v, k) {
        var base_k = strip_dot_num(k);
        if (base_k.match(/^index\./)
          && base_k !== 'index.codec'
          && base_k !== 'index.store.fs.fs_lock'
          && base_k !== 'index.store.type') {
          delete node.settings[k];
          return "`" + base_k + "` can no longer be set in the config file"
        }
      },
      'https://www.elastic.co/guide/en/elasticsearch/reference/5.0/breaking_50_settings_changes.html#_index_level_settings');
  }

  function per_node_checks(node_name) {

    var node_color = 'green';
    log.start_section('node', '`' + node_name + '`');
    var node = nodes[node_name];

    // Shield sets index.queries.cache.type automatically
    if (_.filter(node.plugins, function(p) {
      return p.name === 'shield'
    }).length) {
      delete node.settings['index.queries.cache.type'];
    }

    // Set by by default
    delete node.settings['config.ignore_system_properties'];

    node_color = worse(node_color, jvm_version(node));
    node_color = worse(node_color, node_roles(node));
    node_color = worse(node_color, node_attrs(node));
    node_color = worse(node_color, heap_size(node));
    node_color = worse(node_color, file_descriptors(node));
    node_color = worse(node_color, mlockall(node));
    node_color = worse(node_color, script_settings(node));
    node_color = worse(node_color, host_settings(node));
    node_color = worse(node_color, default_index_analyzer(node));
    node_color = worse(node_color, index_settings(node));
    node_color = worse(node_color, ClusterSettings
      .watcher_thread_pool(node.settings));
    node_color = worse(node_color, ClusterSettings.thread_pool(node.settings));
    node_color = worse(node_color, ClusterSettings
      .removed_settings(node.settings));
    node_color = worse(node_color, ClusterSettings
      .removed_xpack_settings(node.settings));
    node_color = worse(node_color, ClusterSettings
      .renamed_settings(node.settings));
    node_color = worse(node_color, ClusterSettings
      .renamed_xpack_settings(node.settings));
    node_color = worse(node_color, ClusterSettings
      .unknown_settings(node.settings));

    return node_color;
  }

  return Promise
    .all([
      es.get('/_nodes/settings,os,process,jvm,plugins', {
        flat_settings : true
      }), es.get('/_nodes/stats/process')
    ])

    .then(
      function(r) {
        nodes = {};
        _
          .forEach(
            r[0].nodes,
            function(v, k) {
              delete v.settings.name;
              v.process.max_file_descriptors = r[1].nodes[k].process.max_file_descriptors;
              nodes[v.name + '/' + v.host + ' [' + k + ']'] = v;
            });

        _.forEach(_.keys(nodes).sort(), function(node) {
          nodes_color = process_color(nodes_color, per_node_checks(node));
        });

        return nodes_color;
      })

};
