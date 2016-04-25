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
      'https://www.elastic.co/guide/en/elasticsearch/reference/master/breaking_50_plugins.html#_site_plugins_removed');
  }

  function removed_plugins(plugins) {
    return check_array(
      'yellow',
      'Removed plugins',
      plugins,
      function(p) {
        if (p.name === 'discovery-multicast') {
          return p.name
        }
      },
      'https://www.elastic.co/guide/en/elasticsearch/reference/master/breaking_50_plugins.html#_multicast_plugin_removed');
  }

  function renamed_plugins(plugins) {
    var names = {
      "cloud-aws" : "The `cloud-aws` plugin has been split into the `discovery-ec2` and `repository-s3` plugins",
      "cloud-azure" : "The `cloud-azure` plugin has been split into the `discovery-azure` and `repository-azure` plugins",
      "cloud-gce" : "The `cloud-gce` plugin has been renamed to `discovery-gce`",
    };

    return check_array(
      'blue',
      'Renamed plugins',
      plugins,
      function(p) {
        if (names[p.name]) {
          return names[p.name]
        }
      },
      'https://www.elastic.co/guide/en/elasticsearch/reference/master/breaking_50_plugins.html#_cloud_aws_plugin_changes');
  }

  function x_plugins(plugins) {
    var names = {
      "license" : "The `license` plugin is now part of the `x-pack`",
      "graph" : "The `graph` plugin is now part of the `x-pack`",
      "marvel-agent" : "The `marvel-agent` plugin is now part of the `x-pack`",
      "shield" : "The `shield` plugin is now part of the `x-pack`",
      "watcher" : "The `watcher` plugin is now part of the `x-pack`",
    };

    return check_array('blue', 'X-pack plugins', plugins, function(p) {
      if (names[p.name]) {
        return names[p.name]
      }
    }, 'https://www.elastic.co/guide/en/x-pack/current/index.html');
  }

  function deprecated_plugins(plugins) {
    var names = {
      "mapper-attachments" : "The `mapper-attachments` plugin has been deprecated in favour of the `ingest-attachment` plugin",
    };

    return check_array(
      'blue',
      'Deprecated plugins',
      plugins,
      function(p) {
        if (names[p.name]) {
          return names[p.name]
        }
      },
      'https://www.elastic.co/guide/en/elasticsearch/reference/master/breaking_50_plugins.html#_mapper_attachments_plugin_deprecated');
  }

  return es.get('/_cluster/stats', {
    filter_path : 'nodes.plugins'
  })

  .then(function(r) {
    var color = 'green';
    var plugins = r.nodes.plugins || [];
    delete plugins['elasticsearch-migration'];

    color = worse(color, site_plugins(plugins));
    color = worse(color, removed_plugins(plugins));
    color = worse(color, renamed_plugins(plugins));
    color = worse(color, x_plugins(plugins));
    color = worse(color, deprecated_plugins(plugins));

    return color;
  })

};
