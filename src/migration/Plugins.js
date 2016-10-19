"use strict";

function Plugins() {

  function site_plugins(plugins) {
    return check_array(
      'yellow',
      'Site plugins are no longer supported',
      plugins,
      function(p) {
        if (p.site && p.name !== 'elasticsearch-migration') {
          return p.name
        }
      },
      'https://www.elastic.co/guide/en/elasticsearch/reference/5.0/breaking_50_plugins.html#_site_plugins_removed');
  }

  function removed_plugins(plugins) {
    var names = {
      "discovery-multicast" : "The `discovery-multicast` plugin has been removed",
      "delete-by-query" : "The `delete-by-query` plugin functionality has been moved to core"
    };

    return check_array(
      'yellow',
      'Removed plugins',
      plugins,
      function(p) {
        if (names[p.name]) {
          return names[p.name]
        }
      },
      'https://www.elastic.co/guide/en/elasticsearch/reference/5.0/breaking_50_plugins.html');
  }

  function renamed_plugins(plugins) {
    var names = {
      "cloud-aws" : "The `cloud-aws` plugin has been split into the `discovery-ec2` and `repository-s3` plugins",
      "cloud-azure" : "The `cloud-azure` plugin has been split into the `discovery-azure-classic` and `repository-azure` plugins",
      "cloud-gce" : "The `cloud-gce` plugin has been renamed to `discovery-gce`"
    };

    return check_array(
      'yellow',
      'Renamed plugins',
      plugins,
      function(p) {
        if (names[p.name]) {
          return names[p.name]
        }
      },
      'https://www.elastic.co/guide/en/elasticsearch/reference/5.0/breaking_50_plugins.html#_cloud_aws_plugin_changes');
  }

  function x_plugins(plugins) {
    var names = {
      "license" : "The `license` plugin is now part of the `x-pack`",
      "graph" : "The `graph` plugin is now part of the `x-pack`",
      "marvel-agent" : "The `marvel-agent` plugin is now part of the `x-pack`",
      "shield" : "The `shield` plugin is now part of the `x-pack`",
      "watcher" : "The `watcher` plugin is now part of the `x-pack`.  Check existing watches for use of filters, which were deprecated in 2.0 and removed in 5.0.",
    };

    return check_array('yellow', 'X-pack plugins', plugins, function(p) {
      if (names[p.name]) {
        return names[p.name]
      }
    }, 'https://www.elastic.co/guide/en/x-pack/current/index.html');
  }

  function javascript(plugins) {
    return check_array(
      'yellow',
      'Javascript plugin',
      plugins,
      function(p) {
        if (p.name === 'lang-javascript') {
          return "Stored/inline scripts in Javascript should specify `lang:javascript` and file scripts should use `.js` file suffix"
        }
      },
      'https://www.elastic.co/guide/en/elasticsearch/reference/5.0/breaking_50_scripting.html#_scripting_engines_now_register_only_a_single_language');
  }

  function deprecated_plugins(plugins) {
    var names = {
      "mapper-attachments" : "The `mapper-attachments` plugin has been deprecated in favour of the `ingest-attachment` plugin",
    };

    return check_array(
      'yellow',
      'Deprecated plugins',
      plugins,
      function(p) {
        if (names[p.name]) {
          return names[p.name]
        }
      },
      'https://www.elastic.co/guide/en/elasticsearch/reference/5.0/breaking_50_plugins.html#_mapper_attachments_plugin_deprecated');
  }

  return es.get('/_cluster/stats', {
    filter_path : 'nodes.plugins'
  })

  .then(function(r) {
    var color = 'green';
    var plugins = r.nodes.plugins || [];
    delete plugins['elasticsearch-migration'];

    color = worse(color, site_plugins(plugins));
    if (!cloud) {
      color = worse(color, removed_plugins(plugins));
      color = worse(color, renamed_plugins(plugins));
      color = worse(color, x_plugins(plugins));
    }
    color = worse(color, deprecated_plugins(plugins));
    color = worse(color, javascript(plugins));

    return color;
  })

};
