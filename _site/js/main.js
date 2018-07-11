var global_switch_view;

jQuery(function() {

function Client(host, enable_creds) {

  var version;

  function get_version() {
    if (version) {
      return Promise.resolve(version);
    }
    return this.get('/').then(function(r) {
      version = new ES_Version(r.version.number, r.version.build_snapshot);
      return version;
    });
  }

  function handle_error(e, method, url) {
    var msg = "Failed to " + method + " " + url;

    if (e.responseJSON) {
      if (e.status === 404 && e.responseJSON.found === false) {
        e.responseJSON.type = 'not_found';
        e.responseJSON.reason = 'resource not found';
        throw new ES_Error(method + ' ' + url, {
          status : 404,
          error : {
            root_cause : [
              e.responseJSON
            ]
          }
        })
      }
      if (e.responseJSON.error) {
        if (typeof e.responseJSON.error === 'object') {
          throw new ES_Error(method + ' ' + url, e.responseJSON);
        }
        e.responseText = e.responseJSON.error;
      }
    }

    var reason = e.responseText || e.statusText;

    if (reason.match(/^\s*</)) {
      reason = 'Is the URL correct?';
    } else if (reason === 'error') {
      reason = 'Is the URL correct?';
      if (window.location.protocol === 'https:' && url.indexOf('https:') !== 0) {
        reason += ' Cannot access a cluster via HTTP when this plugin is served via HTTPS.'
      } else {
        var origin = window.location.protocol
          + "//"
          + window.location.hostname
          + (window.location.port ? ':' + window.location.port : '');
        if (url.indexOf(origin) !== 0) {
          reason += ' Does Elasticsearch have <a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/modules-http.html">CORS enabled</a> and properly configured?'
        }
      }
    }
    msg += " " + reason;
    throw (msg);
  }

  function _request(method, path, qs, body) {
    var url = host + path;
    if (qs) {
      url += '?' + jQuery.param(qs);
    }

    var req = {
      dataType : "json",
      method : method,
      url : url
    };
    if (body) {
      req.data = JSON.stringify(body)
    }
    if (enable_creds) {
      req['xhrFields'] = {
        withCredentials : true
      };
      req['crossDomain'] = true;
    }

    return new Promise(function(resolve, reject) {
      jQuery.ajax(req) //
      .done(resolve) //
      .fail(function(e) {
        try {
          handle_error(e, method, url)
        } catch (e) {
          reject(e);
        }
      })
    });

  }

  return {
    get : function(path, qs) {
      return _request('GET', path, qs)
    },
    del : function(path, qs) {
      return _request('DELETE', path, qs)
    },
    post : function(path, qs, body) {
      return _request('POST', path, qs, body)
    },
    put : function(path, qs, body) {
      return _request('PUT', path, qs, body)
    },
    get_version : get_version,
    host : host
  }
}

function ES_Version(v_string, snapshot) {
  var parts = v_string.split('.');
  this.major = parts[0];
  this.minor = parts[1] || 0;
  this.patch = parts[2] || 0;
  this.snapshot = snapshot ? 1 : 0;

  this.cmp = function(other) {
    if (typeof other === "string") {
      other = new ES_Version(other);
    }
    var keys = [
      'major', 'minor', 'patch', 'snapshot'
    ];
    for (var i = 0; i < 4; i++) {
      var key = keys[i];
      if (this[key] === "*" || other[key] === "*") {
        return 0;
      }
      if (this[key] === other[key]) {
        continue;
      }
      return this[key] > other[key] ? 1 : -1
    }
    return 0;
  }

  this.lt = function(v) {
    return this.cmp(v) === -1
  }
  this.lte = function(v) {
    return this.cmp(v) !== 1
  }

  this.gt = function(v) {
    return this.cmp(v) === 1
  }
  this.gte = function(v) {
    return this.cmp(v) !== -1
  }

  this.matches = function(v) {
    return this.cmp(v) === 0;
  }
  this.toString = function() {
    return this.major
      + "."
      + this.minor
      + "."
      + this.patch
      + (this.snapshot ? '-SNAPSHOT' : '')
  }

  return this;
}

function ES_Error(request, e) {
  this.request = request;
  this.params = e.error.root_cause[0];
  this.status = e.status;
  this.type = this.params.type;
  this.reason = this.params.reason;

  delete this.params.type;
  delete this.params.reason;

  this.toString = function() {
    return this.request
      + " failed with ["
      + this.status
      + "] "
      + this.reason
      + ": "
      + JSON.stringify(this.params)
  }
}

ES_Error.prototype = Object.create(Error.prototype);
ES_Error.prototype.constructor = ES_Error;
"use strict";

function MigrationController(es, log, error) {

"use strict";

function Logger(log_el,error_el) {
  var out;
  var header_el;
  var sections;

  function start_section(class_name, msg) {
    msg = msg.replace(/`([^`]+)`/g, "<code>$1</code>");
    var new_out = jQuery('<li class="section '
      + class_name
      + '"><span>'
      + msg
      + '</span><ul></ul></li>');
    out.append(new_out);
    sections.push(out);
    out = new_out.find('ul');
  }

  function set_section_color(color) {
    out.parent().addClass(color)
  }

  function end_section() {
    out = sections.pop();
  }

  function log(msg) {
    out.append('<li>' + msg + '</li>');
  }

  function header(msg, color) {
    color = color || '';
    header_el.text(msg);
    header_el.attr('class','header '+color);
  }

  function error(e) {
    var msg;
    if (typeof e === "string") {
      console.log(e);
      msg = e;
    } else if (e instanceof ES_Error) {
      msg = e.toString();
      console.log(msg);
    } else {
      console.log(e.message, e.stack);
      msg = e.message;
    }
    error_el.empty().html(msg);
    header("An error occurred", 'error');
    throw (e);
  }

  function clear() {
    error_el.empty();
    log_el.html('<ul><li class="header"></li></ul>');
    out = log_el.find('ul');
    header_el = out.find('.header');
    sections = [];
  }

  function result(color, check, fail, docs) {
    check = check.replace(/`([^`]+)`/g, "<code>$1</code>");
    if (fail.length === 0) {
      color = 'green';
    }
    if (docs) {
      docs = '<a class="info" title="Read more" href="'
        + docs
        + '" target="_blank">&#x2139;</a>';
    } else {
      docs = '';
    }
    if (fail.length > 0) {
      start_section('check', check + docs);
      _.forEach(_.sortedUniq(fail), function(msg) {
        msg = msg.replace(/`([^`]+)`/g, "<code>$1</code>");
        out.append('<li>' + msg + '</li>');
      });
      set_section_color(color);
      end_section();
    } else {
      out.append('<li class="status '
        + color
        + '">'
        + check
        + docs
        + '</li>');
    }
    return color;
  }

  clear();

  return {
    clear : clear,
    log : log,
    error : error,
    header : header,
    result : result,
    start_section : start_section,
    end_section : end_section,
    set_section_color : set_section_color
  };

}
"use strict";

function ClusterSettings() {

  var cluster_color = 'green';

  return es.get('/_cluster/settings', {
    flat_settings : true
  })

  .then(
    function(r) {

      var settings = r.persistent;
      cluster_color = worse(cluster_color, ClusterSettings
        .watcher_thread_pool(settings));
      cluster_color = worse(cluster_color, ClusterSettings
        .thread_pool(settings));
      cluster_color = worse(cluster_color, ClusterSettings
        .removed_settings(settings));
      cluster_color = worse(cluster_color, ClusterSettings
        .removed_xpack_settings(settings));
      cluster_color = worse(cluster_color, ClusterSettings
        .renamed_settings(settings));
      cluster_color = worse(cluster_color, ClusterSettings
        .renamed_xpack_settings(settings));
      cluster_color = worse(cluster_color, ClusterSettings
        .unknown_settings(settings));

      return cluster_color;
    });

};

ClusterSettings.watcher_thread_pool = function(settings) {
  return check_hash(
    'blue',
    'Watcher thread pool settings',
    settings,
    function(v, k) {
      var new_k = k.replace(/threadpool.watcher/, 'xpack.watcher.thread_pool');
      if (new_k === k) {
        return;
      }
      delete settings[k];
      return "`"
        + k
        + "` has been renamed to `"
        + new_k
        + "`. (This setting may have been autoset by Watcher, in which case this can be ignored)."
    },
    'https://www.elastic.co/guide/en/x-pack/current/_migrating_from_watcher.html');
}

ClusterSettings.thread_pool = function(settings) {
  return check_hash(
    'red',
    'Thread pool settings',
    settings,
    function(v, k) {
      if (!k.match(/^threadpool/)) {
        return;
      }
      if (k.match(/suggest/)) {
        return "`" + k + "` has been removed"
      }
      var new_k = k.replace(/threadpool/, 'thread_pool');
      // fixed
      if (new_k.match(/\.(index|search|bulk|percolate|watcher)\./)) {
        new_k = new_k.replace(/\.(capacity|queue)$/, '.queue_size');
      } else
      // scaling
      if (new_k.match(/\.(snapshot|warmer|refresh|listener)\./)) {
        new_k = new_k.replace(/\.min/, '.core').replace(/.size/, '.max')
      }
      delete settings[k];
      return "`" + k + "` has been renamed to `" + new_k + "`"
    },
    'https://www.elastic.co/guide/en/elasticsearch/reference/5.0/breaking_50_settings_changes.html#_threadpool_settings');
}

ClusterSettings.unknown_settings = function(settings) {

  var group_settings = _.filter(
    _.keys(ClusterSettings.known_settings),
    function(v) {
      return v.match(/\.$/)
    });

  return check_hash(
    'blue',
    'Unknown settings',
    settings,
    function(v, k) {
      var base_k = strip_dot_num(k);
      if (_.has(ClusterSettings.known_settings, base_k)) {
        return;
      }
      var found = false;
      _.forEach(group_settings, function(group_setting) {
        if (base_k.indexOf(group_setting) === 0) {
          found = true;
        }
      })
      if (found) {
        return;
      }
      return "`"
        + base_k
        + "` will be moved to the `archived` namespace on upgrade"
    },
    'https://www.elastic.co/guide/en/elasticsearch/reference/5.0/breaking_50_settings_changes.html');
};

ClusterSettings.renamed_settings = function(settings) {

  var renamed = {
    "bootstrap.mlockall" : "bootstrap.memory_lock",
    "http.netty.http.blocking_server" : "http.tcp.blocking_server",
    "http.netty.tcp_no_delay" : "http.tcp.no_delay",
    "http.netty.tcp_keep_alive" : "http.tcp.keep_alive",
    "http.netty.reuse_address" : "http.txp.reuse_address",
    "http.netty.tcp_send_buffer_size" : "http.tcp.send_buffer_size",
    "http.netty.tcp_receive_buffer_size" : "http.tcp.receive_buffer_size",
    "discovery.zen.initial_ping_timeout" : "discovery.zen.ping_timeout",
    "discovery.zen.ping.timeout" : "discovery.zen.ping_timeout",
    "discovery.zen.master_election.filter_client" : "discovery.zen.master_election.ignore_non_master_pings",
    "discovery.zen.master_election.filter_data" : "discovery.zen.master_election.ignore_non_master_pings",
    "indices.recovery.max_size_per_sec" : "indices.recovery.max_bytes_per_sec",
    "indices.cache.query.size" : "indices.requests.cache.size",
    "indices.requests.cache.clean_interval" : "indices.cache.clean_interval",
    "indices.fielddata.cache.clean_interval" : "indices.cache.clean_interval",
    "node.add_id_to_custom_path" : "node.add_lock_id_to_custom_path",
    "node_id.seed" : "node.id.seed",
    "cluster.routing.allocation.concurrent_recoveries" : "cluster.routing.allocation.node_concurrent_recoveries",
    "cloud.aws.proxy_host" : "cloud.aws.proxy.host",
    "cloud.aws.ec2.proxy_host" : "cloud.aws.ec2.proxy.host",
    "cloud.aws.s3.proxy_host" : "cloud.aws.s3.proxy.host",
    "cloud.aws.proxy_port" : "cloud.aws.proxy.port",
    "cloud.aws.ec2.proxy_port" : "cloud.aws.ec2.proxy.port",
    "cloud.aws.s3.proxy_port" : "cloud.aws.s3.proxy.port",
    "cloud.azure.storage.account" : "cloud.azure.storage.{my_account_name}.account",
    "cloud.azure.storage.key" : "cloud.azure.storage.{my_account_name}.key"
  };

  function re_replace(k, re, replace) {
    if (k.match(re)) {
      return k.replace(re, replace)
    }
  }

  return check_hash(
    'red',
    'Renamed settings',
    settings,
    function(v, k) {
      var base_k = strip_dot_num(k);

      if (_.has(renamed, base_k)) {
        delete settings[k];
        return "`" + base_k + "` has been renamed to `" + renamed[base_k] + "`"
      }
    },
    "https://www.elastic.co/guide/en/elasticsearch/reference/5.0/breaking_50_settings_changes.html");
};

ClusterSettings.renamed_xpack_settings = function(settings) {

  var renamed = {
    "shield.ssl" : "xpack.security.transport.ssl.enabled",
    "shield.ssl.ciphers" : "xpack.ssl.cipher_suites",
    "shield.ssl.hostname_verification" : "xpack.ssl.verification_mode",
    "shield.transport.ssl.client.auth" : "xpack.ssl.client_authentication",
    "shield.http.ssl" : "xpack.security.http.ssl.enabled",
    "shield.http.ssl.client.auth" : "xpack.security.http.ssl.client_authentication",
    "security.dls_fls.enabled" : "xpack.security.dls_fls.enabled",
    "security.enabled" : "xpack.security.enabled",
    "watcher.http.default_connection_timeout" : "xpack.http.default_connection_timeout",
    "watcher.http.default_read_timeout" : "xpack.http.default_read_timeout",
    "watcher.shield.encrypt_sensitive_data" : "xpack.watcher.encrypt_sensitive_data",
    "marvel.agent.enabled" : "xpack.monitoring.enabled",
  };

  function re_replace(k, re, replace) {
    if (k.match(re)) {
      return k.replace(re, replace)
    }
  }

  return check_hash(
    'red',
    'Renamed X-Pack settings',
    settings,
    function(v, k) {
      var base_k = strip_dot_num(k);

      if (cloud && base_k.match(/^marvel\./)) {
        delete settings[k];
        return;
      }
      // Marvel 1.x settings
      if (base_k.match('^marvel.agent.(stats|exporter)\.')) {
        return;
      }
      if (_.has(renamed, base_k)) {
        delete settings[k];
        return "`" + base_k + "` has been renamed to `" + renamed[base_k] + "`"
      }
      var new_k = re_replace(
        base_k,
        /^transport\.profiles\.([^.]+)\.shield\.ssl\.client.auth/,
        'transport.profiles.$1.xpack.security.ssl.client_authentication')
        || re_replace(
          base_k,
          /^transport\.profiles\.([^.]+)\.shield\.ssl/,
          'transport.profiles.$1.xpack.security.ssl.enabled')
        || re_replace(
          base_k,
          /^transport\.profiles\.([^.]+)\.shield\.ciphers/,
          'transport.profiles.$1.xpack.security.ssl.cipher_suites')
        || re_replace(
          base_k,
          /^transport\.profiles\.([^.]+)\.shield\.hostname_verification/,
          'transport.profiles.$1.xpack.security.ssl.verification_mode')
        || re_replace(
          base_k,
          /^shield.authc.realms\.([^.]+)\.hostname_verification/,
          'xpack.security.authc.realms.$1.ssl.verification_mode')
        || re_replace(base_k, /^shield\.ssl\./, 'xpack.ssl.')
        || re_replace(base_k, /^shield\./, 'xpack.security.')
        || re_replace(base_k, /^marvel.agent./, 'xpack.monitoring.collection.')
        || re_replace(base_k, /^marvel\./, 'xpack.monitoring.')
        || re_replace(base_k, /^watcher\.http\./, 'xpack.http.')
        || re_replace(
          base_k,
          /^watcher.actions.(pagerduty|slack|hipchat|email).service/,
          "xpack.notification.$1")
        || re_replace(base_k, /^watcher\./, 'xpack.watcher.');

      if (new_k) {
        delete settings[base_k];
        return "`" + base_k + "` has been renamed to `" + new_k + "`";
      }
    },
    "https://www.elastic.co/guide/en/x-pack/5.0/migrating-to-xpack.html");
};

ClusterSettings.removed_settings = function(settings) {
  var removed = {
    "action.get.realtime" : true,
    "gateway.format" : true,
    "http.netty.host" : true,
    "http.netty.bind_host" : true,
    "http.netty.publish_host" : true,
    "node.local" : true,
    "node.mode" : true,
    "path.plugins" : true,
    "indices.recovery.concurrent_small_file_streams" : true,
    "indices.recovery.concurrent_file_streams" : true,
    "indices.requests.cache.concurrency_level" : true,
    "indices.fielddata.cache.concurrency_level" : true,
    "indices.memory.min_shard_index_buffer_size" : true,
    "indices.memory.max_shard_index_buffer_size" : true,
    "max-open-files" : true,
    "netty.gathering" : true,
    "repositories.uri.list_directories" : true,
    "useLinkedTransferQueue" : true
  };

  return check_hash(
    'blue',
    'Removed settings',
    settings,
    function(v, k) {
      var base_k = strip_dot_num(k);
      if (_.has(removed, base_k)) {
        delete settings[k];
        return "`" + base_k + "`"
      }
    },
    "https://www.elastic.co/guide/en/elasticsearch/reference/5.0/breaking_50_settings_changes.html");
};

ClusterSettings.removed_xpack_settings = function(settings) {
  var removed = {
    "security.manager.enabled" : true,
    "shield.ssl.hostname_verification.resolve_name" : true,
    "shield.ssl.session.cache_size" : true,
    "shield.ssl.session.cache_timeout" : true,
    "shield.ssl.protocol" : true,
    "transport.service.type" : true,
    "xpack.security.authc.native.reload.interval" : true,
    "xpack.security.authz.store.files.roles" : true,
    "xpack.security.authz.store.roles.index.reload.interval" : true,
    "xpack.security.http.ssl" : true,
    "xpack.security.http.ssl.client.auth" : true,
    "xpack.security.system_key.file" : true
  };

  return check_hash(
    'blue',
    'Removed X-Pack settings',
    settings,
    function(v, k) {
      var base_k = strip_dot_num(k);
      if (_.has(removed, base_k)
        || base_k
          .match(/transport\.profiles\.[^.]+\.shield\.session\.cache_size/)
        || base_k
          .match(/transport\.profiles\.[^.]+\.shield\.session\.cache_timeout/)
        || base_k
          .match(/transport\.profiles\.[^.]+\.shield\.hostname_verification\.resolve_name/)
        || base_k.match(/transport\.profiles\.[^.]+\.shield.protocol/)) {
        delete settings[k];
        return "`" + base_k + "`"
      }
    },
    "https://www.elastic.co/guide/en/x-pack/current/migrating-to-xpack.html");
};

ClusterSettings.known_settings = {
  "action.auto_create_index" : true,
  "action.destructive_requires_name" : true,
  "action.master.force_local" : true,
  "action.search.shard_count.limit" : true,
  "bootstrap.ctrlhandler" : true,
  "bootstrap.memory_lock" : true,
  "bootstrap.seccomp" : true,
  "cache.recycler.page.limit.heap" : true,
  "cache.recycler.page.type" : true,
  "cache.recycler.page.weight.bytes" : true,
  "cache.recycler.page.weight.ints" : true,
  "cache.recycler.page.weight.longs" : true,
  "cache.recycler.page.weight.objects" : true,
  "client.transport.ignore_cluster_name" : true,
  "client.transport.nodes_sampler_interval" : true,
  "client.transport.ping_timeout" : true,
  "client.transport.sniff" : true,
  "client.type" : true,
  "cloud.aws.ec2.endpoint" : true,
  "cloud.aws.ec2.protocol" : true,
  "cloud.aws.ec2.proxy.host" : true,
  "cloud.aws.ec2.proxy.port" : true,
  "cloud.aws.ec2.proxy.username" : true,
  "cloud.aws.ec2.region" : true,
  "cloud.aws.ec2.signer" : true,
  "cloud.aws.protocol" : true,
  "cloud.aws.proxy.host" : true,
  "cloud.aws.proxy.port" : true,
  "cloud.aws.proxy.username" : true,
  "cloud.aws.region" : true,
  "cloud.aws.s3.endpoint" : true,
  "cloud.aws.s3.protocol" : true,
  "cloud.aws.s3.proxy.host" : true,
  "cloud.aws.s3.proxy.port" : true,
  "cloud.aws.s3.proxy.username" : true,
  "cloud.aws.s3.region" : true,
  "cloud.aws.s3.signer" : true,
  "cloud.aws.signer" : true,
  "cloud.azure.management.cloud.service.name" : true,
  "cloud.azure.storage." : true,
  "cloud.gce.max_wait" : true,
  "cloud.gce.project_id" : true,
  "cloud.gce.refresh_interval" : true,
  "cloud.gce.retry" : true,
  "cloud.gce.zone" : true,
  "cloud.node.auto_attributes" : true,
  "cluster.blocks.read_only" : true,
  "cluster.indices.close.enable" : true,
  "cluster.info.update.interval" : true,
  "cluster.info.update.timeout" : true,
  "cluster.name" : true,
  "cluster.nodes.reconnect_interval" : true,
  "cluster.routing.allocation.allow_rebalance" : true,
  "cluster.routing.allocation.awareness.attributes" : true,
  "cluster.routing.allocation.awareness.force." : true,
  "cluster.routing.allocation.balance.index" : true,
  "cluster.routing.allocation.balance.shard" : true,
  "cluster.routing.allocation.balance.threshold" : true,
  "cluster.routing.allocation.cluster_concurrent_rebalance" : true,
  "cluster.routing.allocation.disk.include_relocations" : true,
  "cluster.routing.allocation.disk.reroute_interval" : true,
  "cluster.routing.allocation.disk.threshold_enabled" : true,
  "cluster.routing.allocation.disk.watermark.high" : true,
  "cluster.routing.allocation.disk.watermark.low" : true,
  "cluster.routing.allocation.enable" : true,
  "cluster.routing.allocation.exclude." : true,
  "cluster.routing.allocation.include." : true,
  "cluster.routing.allocation.node_concurrent_incoming_recoveries" : true,
  "cluster.routing.allocation.node_concurrent_outgoing_recoveries" : true,
  "cluster.routing.allocation.node_concurrent_recoveries" : true,
  "cluster.routing.allocation.node_initial_primaries_recoveries" : true,
  "cluster.routing.allocation.require." : true,
  "cluster.routing.allocation.same_shard.host" : true,
  "cluster.routing.allocation.snapshot.relocation_enabled" : true,
  "cluster.routing.allocation.total_shards_per_node" : true,
  "cluster.routing.allocation.type" : true,
  "cluster.routing.rebalance.enable" : true,
  "cluster.service.slow_task_logging_threshold" : true,
  "discovery.azure.deployment.name" : true,
  "discovery.azure.deployment.slot" : true,
  "discovery.azure.endpoint.name" : true,
  "discovery.azure.host.type" : true,
  "discovery.azure.refresh_interval" : true,
  "discovery.ec2.any_group" : true,
  "discovery.ec2.availability_zones" : true,
  "discovery.ec2.groups" : true,
  "discovery.ec2.host_type" : true,
  "discovery.ec2.node_cache_time" : true,
  "discovery.ec2.tag." : true,
  "discovery.gce.tags" : true,
  "discovery.initial_state_timeout" : true,
  "discovery.type" : true,
  "discovery.zen.commit_timeout" : true,
  "discovery.zen.fd.connect_on_network_disconnect" : true,
  "discovery.zen.fd.ping_interval" : true,
  "discovery.zen.fd.ping_retries" : true,
  "discovery.zen.fd.ping_timeout" : true,
  "discovery.zen.fd.register_connection_listener" : true,
  "discovery.zen.join_retry_attempts" : true,
  "discovery.zen.join_retry_delay" : true,
  "discovery.zen.join_timeout" : true,
  "discovery.zen.master_election.ignore_non_master_pings" : true,
  "discovery.zen.master_election.wait_for_joins_timeout" : true,
  "discovery.zen.masterservice.type" : true,
  "discovery.zen.max_pings_from_another_master" : true,
  "discovery.zen.minimum_master_nodes" : true,
  "discovery.zen.no_master_block" : true,
  "discovery.zen.ping.unicast.concurrent_connects" : true,
  "discovery.zen.ping.unicast.hosts" : true,
  "discovery.zen.ping_timeout" : true,
  "discovery.zen.publish_diff.enable" : true,
  "discovery.zen.publish_timeout" : true,
  "discovery.zen.send_leave_request" : true,
  "gateway.expected_data_nodes" : true,
  "gateway.expected_master_nodes" : true,
  "gateway.expected_nodes" : true,
  "gateway.initial_shards" : true,
  "gateway.recover_after_data_nodes" : true,
  "gateway.recover_after_master_nodes" : true,
  "gateway.recover_after_nodes" : true,
  "gateway.recover_after_time" : true,
  "http.bind_host" : true,
  "http.compression" : true,
  "http.compression_level" : true,
  "http.cors.allow-credentials" : true,
  "http.cors.allow-headers" : true,
  "http.cors.allow-methods" : true,
  "http.cors.allow-origin" : true,
  "http.cors.enabled" : true,
  "http.cors.max-age" : true,
  "http.detailed_errors.enabled" : true,
  "http.enabled" : true,
  "http.host" : true,
  "http.max_chunk_size" : true,
  "http.max_content_length" : true,
  "http.max_header_size" : true,
  "http.max_initial_line_length" : true,
  "http.netty.max_composite_buffer_components" : true,
  "http.netty.max_cumulation_buffer_capacity" : true,
  "http.netty.receive_predictor_max" : true, // Internal setting
  "http.netty.receive_predictor_min" : true, // Internal setting
  "http.netty.worker_count" : true,
  "http.pipelining" : true,
  "http.pipelining.max_events" : true,
  "http.port" : true,
  "http.publish_host" : true,
  "http.publish_port" : true,
  "http.reset_cookies" : true,
  "http.tcp.blocking_server" : true,
  "http.tcp.keep_alive" : true,
  "http.tcp.receive_buffer_size" : true,
  "http.tcp.reuse_address" : true,
  "http.tcp.send_buffer_size" : true,
  "http.tcp_no_delay" : true,
  "http.type" : true,
  "http.type.default" : true,
  "index.codec" : true,
  "index.store.fs.fs_lock" : true,
  "index.store.preload" : true,
  "index.store.type" : true,
  "indices.analysis.hunspell.dictionary." : true,
  "indices.analysis.hunspell.dictionary.ignore_case" : true,
  "indices.analysis.hunspell.dictionary.lazy" : true,
  "indices.breaker.fielddata.limit" : true,
  "indices.breaker.fielddata.overhead" : true,
  "indices.breaker.fielddata.type" : true,
  "indices.breaker.request.limit" : true,
  "indices.breaker.request.overhead" : true,
  "indices.breaker.request.type" : true,
  "indices.breaker.total.limit" : true,
  "indices.breaker.type" : true,
  "indices.cache.cleanup_interval" : true,
  "indices.fielddata.cache.size" : true,
  "indices.mapping.dynamic_timeout" : true,
  "indices.memory.index_buffer_size" : true,
  "indices.memory.interval" : true,
  "indices.memory.max_index_buffer_size" : true,
  "indices.memory.min_index_buffer_size" : true,
  "indices.memory.shard_inactive_time" : true,
  "indices.queries.cache.all_segments" : true,
  "indices.queries.cache.count" : true,
  "indices.queries.cache.size" : true,
  "indices.query.bool.max_clause_count" : true,
  "indices.query.query_string.allowLeadingWildcard" : true,
  "indices.query.query_string.analyze_wildcard" : true,
  "indices.recovery.internal_action_long_timeout" : true,
  "indices.recovery.internal_action_timeout" : true,
  "indices.recovery.max_bytes_per_sec" : true,
  "indices.recovery.recovery_activity_timeout" : true,
  "indices.recovery.retry_delay_network" : true,
  "indices.recovery.retry_delay_state_sync" : true,
  "indices.requests.cache.expire" : true,
  "indices.requests.cache.size" : true,
  "indices.store.delete.shard.timeout" : true,
  "indices.store.throttle.max_bytes_per_sec" : true,
  "indices.store.throttle.type" : true,
  "indices.ttl.interval" : true,
  "license." : true,
  "logger." : true,
  "logger.level" : true,
  "monitor.fs.refresh_interval" : true,
  "monitor.jvm.gc.collector." : true,
  "monitor.jvm.gc.enabled" : true,
  "monitor.jvm.gc.overhead.debug" : true,
  "monitor.jvm.gc.overhead.info" : true,
  "monitor.jvm.gc.overhead.warn" : true,
  "monitor.jvm.gc.refresh_interval" : true,
  "monitor.jvm.refresh_interval" : true,
  "monitor.os.refresh_interval" : true,
  "monitor.process.refresh_interval" : true,
  "network.bind_host" : true,
  "network.breaker.inflight_requests.limit" : true,
  "network.breaker.inflight_requests.overhead" : true,
  "network.host" : true,
  "network.publish_host" : true,
  "network.server" : true,
  "network.tcp.blocking" : true,
  "network.tcp.blocking_client" : true,
  "network.tcp.blocking_server" : true,
  "network.tcp.connect_timeout" : true,
  "network.tcp.keep_alive" : true,
  "network.tcp.no_delay" : true,
  "network.tcp.receive_buffer_size" : true,
  "network.tcp.reuse_address" : true,
  "network.tcp.send_buffer_size" : true,
  "node.add_lock_id_to_custom_path" : true,
  "node.attr." : true,
  "node.data" : true,
  "node.enable_lucene_segment_infos_trace" : true,
  "node.id.seed" : true,
  "node.ingest" : true,
  "node.local_storage" : true,
  "node.master" : true,
  "node.max_local_storage_nodes" : true,
  "node.name" : true,
  "node.portsfile" : true,
  "path.conf" : true,
  "path.data" : true,
  "path.home" : true,
  "path.logs" : true,
  "path.repo" : true,
  "path.scripts" : true,
  "path.shared_data" : true,
  "pidfile" : true,
  "plugin.mandatory" : true,
  "processors" : true,
  "reindex.remote.whitelist" : true,
  "repositories.azure.base_path" : true,
  "repositories.azure.chunk_size" : true,
  "repositories.azure.compress" : true,
  "repositories.azure.container" : true,
  "repositories.azure.location_mode" : true,
  "repositories.fs.chunk_size" : true,
  "repositories.fs.compress" : true,
  "repositories.fs.location" : true,
  "repositories.s3.base_path" : true,
  "repositories.s3.bucket" : true,
  "repositories.s3.buffer_size" : true,
  "repositories.s3.canned_acl" : true,
  "repositories.s3.chunk_size" : true,
  "repositories.s3.compress" : true,
  "repositories.s3.endpoint" : true,
  "repositories.s3.max_retries" : true,
  "repositories.s3.path_style_access" : true,
  "repositories.s3.protocol" : true,
  "repositories.s3.region" : true,
  "repositories.s3.server_side_encryption" : true,
  "repositories.s3.storage_class" : true,
  "repositories.s3.use_throttle_retries" : true,
  "repositories.url.allowed_urls" : true,
  "repositories.url.supported_protocols" : true,
  "repositories.url.url" : true,
  "request.headers." : true,
  "resource.reload.enabled" : true,
  "resource.reload.interval.high" : true,
  "resource.reload.interval.low" : true,
  "resource.reload.interval.medium" : true,
  "rest.action.multi.allow_explicit_index" : true,
  "script.aggs" : true,
  "script.auto_reload_enabled" : true,
  "script.cache.expire" : true,
  "script.cache.max_size" : true,
  "script.engine.expression.file" : true,
  "script.engine.expression.file.aggs" : true,
  "script.engine.expression.file.ingest" : true,
  "script.engine.expression.file.search" : true,
  "script.engine.expression.file.update" : true,
  "script.engine.expression.file.xpack_watch" : true,
  "script.engine.expression.inline" : true,
  "script.engine.expression.inline.aggs" : true,
  "script.engine.expression.inline.ingest" : true,
  "script.engine.expression.inline.search" : true,
  "script.engine.expression.inline.update" : true,
  "script.engine.expression.inline.xpack_watch" : true,
  "script.engine.expression.stored" : true,
  "script.engine.expression.stored.aggs" : true,
  "script.engine.expression.stored.ingest" : true,
  "script.engine.expression.stored.search" : true,
  "script.engine.expression.stored.update" : true,
  "script.engine.expression.stored.xpack_watch" : true,
  "script.engine.groovy.file" : true,
  "script.engine.groovy.file.aggs" : true,
  "script.engine.groovy.file.ingest" : true,
  "script.engine.groovy.file.search" : true,
  "script.engine.groovy.file.update" : true,
  "script.engine.groovy.file.xpack_watch" : true,
  "script.engine.groovy.inline" : true,
  "script.engine.groovy.inline.aggs" : true,
  "script.engine.groovy.inline.ingest" : true,
  "script.engine.groovy.inline.search" : true,
  "script.engine.groovy.inline.update" : true,
  "script.engine.groovy.inline.xpack_watch" : true,
  "script.engine.groovy.stored" : true,
  "script.engine.groovy.stored.aggs" : true,
  "script.engine.groovy.stored.ingest" : true,
  "script.engine.groovy.stored.search" : true,
  "script.engine.groovy.stored.update" : true,
  "script.engine.groovy.stored.xpack_watch" : true,
  "script.engine.javascript.file" : true,
  "script.engine.javascript.file.aggs" : true,
  "script.engine.javascript.file.ingest" : true,
  "script.engine.javascript.file.search" : true,
  "script.engine.javascript.file.update" : true,
  "script.engine.javascript.file.xpack_watch" : true,
  "script.engine.javascript.inline" : true,
  "script.engine.javascript.inline.aggs" : true,
  "script.engine.javascript.inline.ingest" : true,
  "script.engine.javascript.inline.search" : true,
  "script.engine.javascript.inline.update" : true,
  "script.engine.javascript.inline.xpack_watch" : true,
  "script.engine.javascript.stored" : true,
  "script.engine.javascript.stored.aggs" : true,
  "script.engine.javascript.stored.ingest" : true,
  "script.engine.javascript.stored.search" : true,
  "script.engine.javascript.stored.update" : true,
  "script.engine.javascript.stored.xpack_watch" : true,
  "script.engine.mustache.file" : true,
  "script.engine.mustache.file.aggs" : true,
  "script.engine.mustache.file.ingest" : true,
  "script.engine.mustache.file.search" : true,
  "script.engine.mustache.file.update" : true,
  "script.engine.mustache.file.xpack_watch" : true,
  "script.engine.mustache.inline" : true,
  "script.engine.mustache.inline.aggs" : true,
  "script.engine.mustache.inline.ingest" : true,
  "script.engine.mustache.inline.search" : true,
  "script.engine.mustache.inline.update" : true,
  "script.engine.mustache.inline.xpack_watch" : true,
  "script.engine.mustache.stored" : true,
  "script.engine.mustache.stored.aggs" : true,
  "script.engine.mustache.stored.ingest" : true,
  "script.engine.mustache.stored.search" : true,
  "script.engine.mustache.stored.update" : true,
  "script.engine.mustache.stored.xpack_watch" : true,
  "script.engine.painless.file" : true,
  "script.engine.painless.file.aggs" : true,
  "script.engine.painless.file.ingest" : true,
  "script.engine.painless.file.search" : true,
  "script.engine.painless.file.update" : true,
  "script.engine.painless.file.xpack_watch" : true,
  "script.engine.painless.inline" : true,
  "script.engine.painless.inline.aggs" : true,
  "script.engine.painless.inline.ingest" : true,
  "script.engine.painless.inline.search" : true,
  "script.engine.painless.inline.update" : true,
  "script.engine.painless.inline.xpack_watch" : true,
  "script.engine.painless.stored" : true,
  "script.engine.painless.stored.aggs" : true,
  "script.engine.painless.stored.ingest" : true,
  "script.engine.painless.stored.search" : true,
  "script.engine.painless.stored.update" : true,
  "script.engine.painless.stored.xpack_watch" : true,
  "script.engine.python.file" : true,
  "script.engine.python.file.aggs" : true,
  "script.engine.python.file.ingest" : true,
  "script.engine.python.file.search" : true,
  "script.engine.python.file.update" : true,
  "script.engine.python.file.xpack_watch" : true,
  "script.engine.python.inline" : true,
  "script.engine.python.inline.aggs" : true,
  "script.engine.python.inline.ingest" : true,
  "script.engine.python.inline.search" : true,
  "script.engine.python.inline.update" : true,
  "script.engine.python.inline.xpack_watch" : true,
  "script.engine.python.stored" : true,
  "script.engine.python.stored.aggs" : true,
  "script.engine.python.stored.ingest" : true,
  "script.engine.python.stored.search" : true,
  "script.engine.python.stored.update" : true,
  "script.engine.python.stored.xpack_watch" : true,
  "script.file" : true,
  "script.ingest" : true,
  "script.inline" : true,
  "script.legacy.default_lang" : true,
  "script.max_compilations_per_minute" : true,
  "script.max_size_in_bytes" : true,
  "script.painless.regex.enabled" : true,
  "script.search" : true,
  "script.stored" : true,
  "script.update" : true,
  "script.xpack_watch" : true,
  "search.default_keep_alive" : true,
  "search.default_search_timeout" : true,
  "search.keep_alive_interval" : true,
  "security.manager.filter_bad_defaults" : true,
  "thread_pool.bulk.queue_size" : true,
  "thread_pool.bulk.size" : true,
  "thread_pool.estimated_time_interval" : true,
  "thread_pool.fetch_shard_started.core" : true,
  "thread_pool.fetch_shard_started.keep_alive" : true,
  "thread_pool.fetch_shard_started.max" : true,
  "thread_pool.fetch_shard_store.core" : true,
  "thread_pool.fetch_shard_store.keep_alive" : true,
  "thread_pool.fetch_shard_store.max" : true,
  "thread_pool.flush.core" : true,
  "thread_pool.flush.keep_alive" : true,
  "thread_pool.flush.max" : true,
  "thread_pool.force_merge.queue_size" : true,
  "thread_pool.force_merge.size" : true,
  "thread_pool.generic.core" : true,
  "thread_pool.generic.keep_alive" : true,
  "thread_pool.generic.max" : true,
  "thread_pool.get.queue_size" : true,
  "thread_pool.get.size" : true,
  "thread_pool.index.queue_size" : true,
  "thread_pool.index.size" : true,
  "thread_pool.listener.queue_size" : true,
  "thread_pool.listener.size" : true,
  "thread_pool.management.core" : true,
  "thread_pool.management.keep_alive" : true,
  "thread_pool.management.max" : true,
  "thread_pool.refresh.core" : true,
  "thread_pool.refresh.keep_alive" : true,
  "thread_pool.refresh.max" : true,
  "thread_pool.search.queue_size" : true,
  "thread_pool.search.size" : true,
  "thread_pool.snapshot.core" : true,
  "thread_pool.snapshot.keep_alive" : true,
  "thread_pool.snapshot.max" : true,
  "thread_pool.warmer.core" : true,
  "thread_pool.warmer.keep_alive" : true,
  "thread_pool.warmer.max" : true,
  "transport.bind_host" : true,
  "transport.connections_per_node.bulk" : true,
  "transport.connections_per_node.ping" : true,
  "transport.connections_per_node.recovery" : true,
  "transport.connections_per_node.reg" : true,
  "transport.connections_per_node.state" : true,
  "transport.host" : true,
  "transport.netty.boss_count" : true,
  "transport.netty.max_composite_buffer_components" : true,
  "transport.netty.max_cumulation_buffer_capacity" : true,
  "transport.netty.receive_predictor_max" : true,
  "transport.netty.receive_predictor_min" : true,
  "transport.netty.receive_predictor_size" : true,
  "transport.netty.worker_count" : true,
  "transport.ping_schedule" : true,
  "transport.profiles." : true,
  "transport.publish_host" : true,
  "transport.publish_port" : true,
  "transport.tcp.blocking_client" : true,
  "transport.tcp.blocking_server" : true,
  "transport.tcp.compress" : true,
  "transport.tcp.connect_timeout" : true,
  "transport.tcp.keep_alive" : true,
  "transport.tcp.port" : true,
  "transport.tcp.receive_buffer_size" : true,
  "transport.tcp.reuse_address" : true,
  "transport.tcp.send_buffer_size" : true,
  "transport.tcp_no_delay" : true,
  "transport.tracer.exclude" : true,
  "transport.tracer.include" : true,
  "transport.type" : true,
  "transport.type.default" : true,
  "tribe.blocks.metadata" : true,
  "tribe.blocks.metadata.indices" : true,
  "tribe.blocks.read.indices" : true,
  "tribe.blocks.write" : true,
  "tribe.blocks.write.indices" : true,
  "tribe.name" : true,
  "tribe.on_conflict" : true,
  "xpack.graph.enabled" : true,
  "xpack.http.default_connection_timeout" : true,
  "xpack.http.default_read_timeout" : true,
  "xpack.http.proxy." : true,
  "xpack.http.ssl." : true,
  "xpack.monitoring.collection.cluster.state.timeout" : true,
  "xpack.monitoring.collection.cluster.stats.timeout" : true,
  "xpack.monitoring.collection.collectors" : true,
  "xpack.monitoring.collection.index.recovery.active_only" : true,
  "xpack.monitoring.collection.index.recovery.timeout" : true,
  "xpack.monitoring.collection.index.stats.timeout" : true,
  "xpack.monitoring.collection.indices" : true,
  "xpack.monitoring.collection.indices.stats.timeout" : true,
  "xpack.monitoring.collection.interval" : true,
  "xpack.monitoring.enabled" : true,
  "xpack.monitoring.exporters." : true,
  "xpack.monitoring.history.duration" : true,
  "xpack.notification.email." : true,
  "xpack.notification.hipchat." : true,
  "xpack.notification.pagerduty." : true,
  "xpack.notification.slack." : true,
  "xpack.security.audit.enabled" : true,
  "xpack.security.audit.index.bulk_size" : true,
  "xpack.security.audit.index.client." : true,
  "xpack.security.audit.index.events.emit_request_body" : true,
  "xpack.security.audit.index.events.exclude" : true,
  "xpack.security.audit.index.events.include" : true,
  "xpack.security.audit.index.flush_interval" : true,
  "xpack.security.audit.index.queue_max_size" : true,
  "xpack.security.audit.index.rollover" : true,
  "xpack.security.audit.index.settings.index." : true,
  "xpack.security.audit.logfile.events.emit_request_body" : true,
  "xpack.security.audit.logfile.events.exclude" : true,
  "xpack.security.audit.logfile.events.include" : true,
  "xpack.security.audit.logfile.prefix.emit_node_host_address" : true,
  "xpack.security.audit.logfile.prefix.emit_node_host_name" : true,
  "xpack.security.audit.logfile.prefix.emit_node_name" : true,
  "xpack.security.audit.outputs" : true,
  "xpack.security.authc.anonymous.authz_exception" : true,
  "xpack.security.authc.anonymous.roles" : true,
  "xpack.security.authc.anonymous.username" : true,
  "xpack.security.authc.native.scroll.keep_alive" : true,
  "xpack.security.authc.native.scroll.size" : true,
  "xpack.security.authc.realms." : true,
  "xpack.security.authc.reserved_realm.enabled" : true,
  "xpack.security.authc.run_as.enabled" : true,
  "xpack.security.authc.sign_user_header" : true,
  "xpack.security.authz.store.roles.index.cache.max_size" : true,
  "xpack.security.authz.store.roles.index.cache.ttl" : true,
  "xpack.security.authz.store.roles.index.scroll.keep_alive" : true,
  "xpack.security.authz.store.roles.index.scroll.size" : true,
  "xpack.security.dls_fls.enabled" : true,
  "xpack.security.enabled" : true,
  "xpack.security.encryption.algorithm" : true,
  "xpack.security.encryption_key.algorithm" : true,
  "xpack.security.encryption_key.length" : true,
  "xpack.security.filter.always_allow_bound_address" : true,
  "xpack.security.http.filter.allow" : true,
  "xpack.security.http.filter.deny" : true,
  "xpack.security.http.filter.enabled" : true,
  "xpack.security.http.ssl.enabled" : true,
  "xpack.security.transport.filter.allow" : true,
  "xpack.security.transport.filter.deny" : true,
  "xpack.security.transport.filter.enabled" : true,
  "xpack.security.transport.ssl.enabled" : true,
  "xpack.security.user" : true,
  "xpack.watcher.actions.index.default_timeout" : true,
  "xpack.watcher.enabled" : true,
  "xpack.watcher.encrypt_sensitive_data" : true,
  "xpack.watcher.execution.default_throttle_period" : true,
  "xpack.watcher.execution.scroll.size" : true,
  "xpack.watcher.execution.scroll.timeout" : true,
  "xpack.watcher.history.index." : true,
  "xpack.watcher.index.rest.direct_access" : true,
  "xpack.watcher.input.search.default_timeout" : true,
  "xpack.watcher.internal.ops.bulk.default_timeout" : true,
  "xpack.watcher.internal.ops.index.default_timeout" : true,
  "xpack.watcher.internal.ops.search.default_timeout" : true,
  "xpack.watcher.start_immediately" : true,
  "xpack.watcher.stop.timeout" : true,
  "xpack.watcher.thread_pool.queue_size" : true,
  "xpack.watcher.thread_pool.size" : true,
  "xpack.watcher.transform.search.default_timeout" : true,
  "xpack.watcher.trigger.schedule.engine" : true,
  "xpack.watcher.trigger.schedule.ticker.tick_interval" : true,
  "xpack.watcher.triggered_watches.index." : true,
  "xpack.watcher.watch.scroll.size" : true,
  "xpack.watcher.watches.index." : true
};
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
"use strict";

function Indices() {

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
"use strict";

function Warmers(index) {

  return es
    .get('/' + encodeURIComponent(index) + '/_warmers')

    .then(
      function(r) {
        var warmers = _.keys(r[index].warmers);
        return log
          .result(
            'blue',
            'Warmers removed',
            warmers,
            'https://www.elastic.co/guide/en/elasticsearch/reference/5.0/breaking_50_index_apis.html#_warmers')
      });

};
function IndexSettings(index) {

  var color = 'green';
  var settings;

  function removed_settings() {
    var removed = {
      "index.translog.fs.type" : true,
      "index.translog.interval" : true
    };

    return check_hash(
      'yellow',
      'Removed settings',
      settings,
      function(v, k) {
        var base_k = strip_dot_num(k);
        if (removed[base_k]) {
          delete settings[k];
          return "`" + base_k + "` is no longer supported"
        }
      },
      'https://www.elastic.co/guide/en/elasticsearch/reference/5.0/breaking_50_settings_changes.html#_translog_settings');
  }

  function translog_sync() {
    var fail = [];
    if (_.has(settings, [
      'index.translog.sync_interval'
    ]) && settings['index.translog.sync_interval'] === "0") {
      fail = [
        "`index.translog.sync_interval` may no longer be set to `0`"
      ];
    }
    return log
      .result(
        'yellow',
        "Translog sync",
        fail,
        "https://www.elastic.co/guide/en/elasticsearch/reference/5.0/breaking_50_settings_changes.html#_translog_settings")

  }

  function index_store_type() {
    var fail = [];
    if (_.has(settings, [
      'index.store.type'
    ]) && settings['index.store.type'] === "default") {
      fail = [
        "The default `index.store.type` has changed"
      ];
    }
    return log
      .result(
        'blue',
        "Index store type",
        fail,
        "https://www.elastic.co/guide/en/elasticsearch/reference/5.0/breaking_50_fs.html")

  }

  function replaced_settings() {
    var replaced = {
      "index.shard.recovery.translog_size" : "indices.recovery.translog_size",
      "index.shard.recovery.translog_ops" : "indices.recovery.translog_ops",
      "index.shard.recovery.file_chunk_size" : "indices.recovery.file_chunk_size",
      "index.shard.recovery.concurrent_streams" : "indices.recovery.concurrent_streams",
      "index.shard.recovery.concurrent_small_file_streams" : "indices.recovery.concurrent_small_file_streams",
      "indices.cache.query.size" : "indices.requests.cache.size",
      "index.translog.flush_threshold_ops" : "index.translog.flush_threshold_size",
      "index.cache.query.enable" : "index.requests.cache.enable",
      "index.analysis.analyzer.default_index.type" : "index.analysis.analyzer.default.type",
      "index.analysis.analyzer.default_index.tokenizer" : "index.analysis.analyzer.default.tokenizer",
      "index.query.bool.max_clause_count" : "indices.query.bool.max_clause_count"
    };

    return check_hash(
      'red',
      'Replaced settings',
      settings,
      function(v, k) {
        var base_k = strip_dot_num(k);
        if (replaced[base_k]) {
          delete settings[k];
          return "`"
            + base_k
            + "` has been replaced by `"
            + replaced[base_k]
            + "`"
        }
      },
      'https://www.elastic.co/guide/en/elasticsearch/reference/5.0/breaking_50_settings_changes.html');
  }

  function similarity_settings() {
    var forbidden = /^index\.similarity\.(?:classic|BM25|default|DFR|IB|LMDirichlet|LMJelinekMercer|DFI)/;

    return check_hash(
      'red',
      'Built-in similarities cannot be overridden',
      settings,
      function(v, k) {
        if (k.match(forbidden)) {
          return "`" + k + "`"
        }
      },
      'https://www.elastic.co/guide/en/elasticsearch/reference/5.0/breaking_50_settings_changes.html#_similarity_settings');
  }

  function unknown_settings() {
    var group_settings = /^index\.(?:marvel|analysis|similarity|routing\.allocation\.(?:require|include|exclude))\./;

    return check_hash(
      'blue',
      'Unknown index settings',
      settings,
      function(v, k) {
        var base_k = strip_dot_num(k);
        if (!_.has(IndexSettings.known_settings, base_k)
          && !base_k.match(group_settings)) {
          return "`"
            + base_k
            + "` will be moved to the `archived` namespace on upgrade"
        }
      },
      'https://www.elastic.co/guide/en/elasticsearch/reference/5.0/breaking_50_settings_changes.html');
  }

  return es.get('/' + encodeURIComponent(index) + '/_settings', {
    flat_settings : true
  })

  .then(function(r) {
    settings = r[index].settings;

    color = worse(color, translog_sync());
    color = worse(color, index_store_type());
    color = worse(color, removed_settings());
    color = worse(color, replaced_settings());
    color = worse(color, similarity_settings());
    color = worse(color, unknown_settings());

    return color;
  });

}

IndexSettings.known_settings = {
  "index.auto_expand_replicas" : true,
  "index.blocks.metadata" : true,
  "index.blocks.read" : true,
  "index.blocks.read_only" : true,
  "index.blocks.write" : true,
  "index.codec" : true,
  "index.compound_format" : true,
  "index.creation_date" : true,
  "index.data_path" : true,
  "index.fielddata.cache" : true,
  "index.gc_deletes" : true,
  "index.indexing.slowlog.level" : true,
  "index.indexing.slowlog.reformat" : true,
  "index.indexing.slowlog.source" : true,
  "index.indexing.slowlog.threshold.index.debug" : true,
  "index.indexing.slowlog.threshold.index.info" : true,
  "index.indexing.slowlog.threshold.index.trace" : true,
  "index.indexing.slowlog.threshold.index.warn" : true,
  "index.load_fixed_bitset_filters_eagerly" : true,
  "index.mapper.dynamic" : true,
  "index.mapping.attachment.detect_language" : true,
  "index.mapping.attachment.ignore_errors" : true,
  "index.mapping.attachment.indexed_chars" : true,
  "index.mapping.coerce" : true,
  "index.mapping.depth.limit" : true,
  "index.mapping.ignore_malformed" : true,
  "index.mapping.nested_fields.limit" : true,
  "index.mapping.total_fields.limit" : true,
  "index.max_result_window" : true,
  "index.merge.policy.expunge_deletes_allowed" : true,
  "index.merge.policy.floor_segment" : true,
  "index.merge.policy.max_merge_at_once" : true,
  "index.merge.policy.max_merge_at_once_explicit" : true,
  "index.merge.policy.max_merged_segment" : true,
  "index.merge.policy.reclaim_deletes_weight" : true,
  "index.merge.policy.segments_per_tier" : true,
  "index.merge.scheduler.auto_throttle" : true,
  "index.merge.scheduler.max_merge_count" : true,
  "index.merge.scheduler.max_thread_count" : true,
  "index.number_of_replicas" : true,
  "index.number_of_shards" : true,
  "index.percolator.map_unmapped_fields_as_string" : true,
  "index.priority" : true,
  "index.queries.cache.everything" : true,
  "index.queries.cache.type" : true,
  "index.query.default_field" : true,
  "index.query.parse.allow_unmapped_fields" : true,
  "index.query_string.lenient" : true,
  "index.recovery.initial_shards" : true,
  "index.refresh_interval" : true,
  "index.requests.cache.enable" : true,
  "index.routing.allocation.enable" : true,
  "index.routing.allocation.total_shards_per_node" : true,
  "index.routing.rebalance.enable" : true,
  "index.search.slowlog.level" : true,
  "index.search.slowlog.reformat" : true,
  "index.search.slowlog.threshold.fetch.debug" : true,
  "index.search.slowlog.threshold.fetch.info" : true,
  "index.search.slowlog.threshold.fetch.trace" : true,
  "index.search.slowlog.threshold.fetch.warn" : true,
  "index.search.slowlog.threshold.query.debug" : true,
  "index.search.slowlog.threshold.query.info" : true,
  "index.search.slowlog.threshold.query.trace" : true,
  "index.search.slowlog.threshold.query.warn" : true,
  "index.shadow_replicas" : true,
  "index.shard.check_on_startup" : true,
  "index.shared_filesystem" : true,
  "index.shared_filesystem.recover_on_any_node" : true,
  "index.store.fs.fs_lock" : true,
  "index.store.stats_refresh_interval" : true,
  "index.store.throttle.max_bytes_per_sec" : true,
  "index.store.throttle.type" : true,
  "index.store.type" : true,
  "index.translog.durability" : true,
  "index.translog.flush_threshold_size" : true,
  "index.translog.sync_interval" : true,
  "index.ttl.disable_purge" : true,
  "index.unassigned.node_left.delayed_timeout" : true,
  "index.uuid" : true,
  "index.version.created" : true,
  "index.warmer.enabled" : true,

};

  var indices_color = 'green';
  var indices;

  function remove_old_indices() {
    return check_hash(
      'red',
      'Indices created before v2.0.0 must be reindexed with the '
        + '<a href="#" onclick="global_switch_view(\'reindex\')">Reindex Helper</a>',
      indices,
      function(v, k) {
        if (v.settings.index.version.created < '2000000') {
          delete indices[k];
          return '`' + k + '`';
        }
      },
      "https://www.elastic.co/guide/en/elasticsearch/reference/5.0/breaking-changes-5.0.html#_indices_created_before_5_0");
  }

  function indexed_scripts() {
    return check_hash(
      'yellow',
      'Indexed scripts/templates moved to cluster state',
      indices,
      function(v, k) {
        if (k === '.scripts') {
          delete indices[k];
          return "Indexed scripts and templates in the `.scripts` index will need to be recreated as `stored` scripts/templates";
        }
      },
      "https://www.elastic.co/guide/en/elasticsearch/reference/5.0/breaking_50_scripting.html#_indexed_scripts_and_templates");
  }

  function shards_per_index() {
    var min_required_shards = 0;
    var fail = [];
    _.forEach(indices, function(v, k) {
      var shard_count = parseInt(v.settings.index.number_of_shards);
      if (shard_count > 1024) {
        fail.push(k + " has " + shard_count + " shards.");
        if (shard_count > min_required_shards) {
          min_required_shards = shard_count;
        }
      }
    });
    if (min_required_shards > 0) {
      fail
        .push("<b>At least 1 index has `"
          + min_required_shards
          + "` shards.  By default, Elasticsearch 5.0.0 will not start up with"
          + " any index containing > 1024 shards.  If you wish to upgrade, you will need to start Elasticsearch 5.0.0 by setting"
          + " <br>`export ES_JAVA_OPTS=\"-Des.index.max_number_of_shards="
          + min_required_shards
          + "\"`"
          + " <br>first on every node.</b>");
    }
    return log
      .result(
        'red',
        'High index shard count',
        fail,
        'https://www.elastic.co/guide/en/elasticsearch/reference/5.0/index-modules.html#_static_index_settings');
  }

  function total_shards() {
    var total = 0;
    _.forEach(indices, function(v, k) {
      total += parseInt(v.settings.index.number_of_shards);
    });
    var fail = [];
    if (total > 1000) {
      fail
        .push("In 5.x, a maximum of 1000 shards can be queried in a single request.  This cluster has `"
          + total
          + "` primary shards.");
    }
    return log
      .result(
        'blue',
        "Total primary shards",
        fail,
        "https://www.elastic.co/guide/en/elasticsearch/reference/5.0/breaking_50_search_changes.html#_search_shard_limit")
  }

  function index_names() {
    return check_hash(
      'yellow',
      'New indices in 5.x may not begin with `_`, `-`, or `+`',
      indices,
      function(v, k) {
        if (k.match(/^[-_+]/)) {
          return k
        }
      },
      "https://www.elastic.co/guide/en/elasticsearch/reference/5.0/breaking_50_index_apis.html#_creating_indices_starting_with_emphasis_emphasis_or_emphasis_emphasis");
  }

  function per_index_checks(index_names) {

    function _check() {
      var index = index_names.shift();
      if (!index) {
        return;
      }
      var index_color = 'green';

      log.start_section('index', '`' + index + '`');
      log.start_section('mappings', 'Mappings');

      return new Mapping(index)

      .then(function(color) {
        index_color = process_color(index_color, color);
        log.start_section('warmers', 'Warmers');
        return new Warmers(index)
      })

      .then(function(color) {
        index_color = process_color(index_color, color);
        log.start_section('settings', 'Index settings');
        return new IndexSettings(index)
      })

      .then(function(color) {
        index_color = process_color(index_color, color);
        indices_color = process_color(indices_color, index_color);
        return _check();
      })

    }
    return _check();
  }

  return es.get(
    '/_cluster/state/metadata',
    {
      filter_path : "metadata.indices.*.state,"
        + "metadata.indices.*.settings.index.version.created,"
        + "metadata.indices.*.settings.index.number_of_shards"
    })

  .then(function(r) {
    if (_.has(r, [
      'metadata', 'indices', '.security'
    ])) {
      delete r.metadata.indices['.security'];
      if (_.keys(r.metadata.indices).length === 0) {
        r = {}
      }
    }
    if (!r.metadata) {
      log.log('No indices to check');
      return;
    }
    indices = r.metadata.indices;
    indices_color = worse(indices_color, remove_old_indices());
    indices_color = worse(indices_color, total_shards());
    indices_color = worse(indices_color, indexed_scripts());
    indices_color = worse(indices_color, shards_per_index());
    indices_color = worse(indices_color, index_names());
    return per_index_checks(_.keys(indices).sort());
  })

  .then(function() {
    return indices_color;
  });

};
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
"use strict";

var controller_init_time;

function ReindexController(es, wrapper, error) {

function Index(name, info, state, on_change) {

  this.name = name;
  this.info = info;
  this.state = state || {
    reindex_status : ''
  };
  this.extra = '';

  this.sort_key = function() {
    return [
      this.info.state === 'close' ? '1' : '0',
      _.padStart(1000000 - parseInt(this.info.priority || 0), 7, '0'),
      (2000000000000 - this.info.created_timestamp),
      this.name
    ].join('~')
  };

  this.get_extra = function() {
    return this.extra
      || (this.info.state === 'close' && 'Index is closed, cannot be reindexed')
      || (this.info.health !== 'green' && 'Index is not green, cannot be reindexed')
      || (this.get_reindex_status() === 'error' && this.state.error)
      || '';
  };

  this.set_extra = function(extra) {
    this.extra = extra;
    return on_change(this.name)
  };

  this.get_reindex_status = function() {
    return this.state.reindex_status;
  }

  this.set_reindex_status = function(status) {
    if (status && this.state.reindex_status === 'cancelled') {
      return Promise.resolve();
    }
    if (status === this.state.reindex_status) {
      return Promise.resolve();
    }
    console.log("Setting status `" + status + "`");
    this.state.reindex_status = status;
    return status === 'finished' ? this.del() : this.save();
  }

  this.save = function() {
    var name = this.name;
    return es.put(
      '/' + Index.reindex_index + '/index/' + encodeURIComponent(name),
      {
        refresh : true
      },
      this.state)

    .then(function() {
      return on_change(name)
    });
  };

  this.del = function() {
    var name = this.name;
    return es.del(
      '/' + Index.reindex_index + '/index/' + encodeURIComponent(name),
      {
        refresh : true
      })

    .then(function() {
      return on_change(name)
    });
  };

  this.status = function() {

    if (this.info.state === 'close') {
      return 'Closed';
    }

    switch (this.info.health) {
    case 'red':
      return 'Red';
    case 'yellow':
      return 'Yellow';
    }

    switch (this.state.reindex_status) {
    case 'queued':
      return 'Queued';
    case 'error':
      return 'Error';
    case '':
      return 'Pending';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Reindexing'
    }
  };

  this.action = function() {

    var self = this;

    function cancel() {
      return [
        'Cancel',
        function() {
          var status = self.get_reindex_status();

          console.log("Cancelling status `" + status + "`");

          if (status === 'finished'
            || status === 'src_deleted'
            || status === 'green'
            || status === 'aliases_added') {
            console.log("Too late to cancel");
            return;
          }

          if (dequeue(self)) {
            console.log('Found job in queue')
            return self.set_reindex_status('');
          }

          return self.set_reindex_status('cancelled');

        }
      ]
    }

    function reset() {
      return [
        'Reset', function() {
          return new Reindexer(self).reset()
        }
      ]
    }

    function queue() {
      return [
        'Reindex',
        function() {
          var warning;
          if (self.name === '.kibana') {
            warning = 'Warning: You will need to reindex the .kibana index in order '
              + 'to upgrade to Elasticsearch 5.x. However, once you have done so, '
              + 'you will be unable to use Kibana 4.x unless you update kibana.yml to '
              + 'set: \n\n    kibana_index: .kibana-'
              + version
              + '\n\nDo you want to continue?';
          }
          if (self.name === '.watches') {
            warning = 'Warning: You will need to reindex the .watches index in order '
              + 'to upgrade to Elasticsearch 5.x. However, once you have done so, '
              + 'you will be unable to use Watcher in your current cluster.\n\n'
              + 'The .watches index cannot be reindexed correctly unless Watcher is disabled, '
              + 'which you can do by adding the following to your elasticsearch.yml files '
              + 'and restarting your cluster:'
              + '\n\n    watcher.enabled: false'
              + '\n\nDo you want to continue?';
          }
          if (warning && !confirm(warning)) {
            return;
          }
          return self.set_reindex_status('queued') //
          .then(function() {
            enqueue(self);
          });
        }
      ];
    }

    var status = this.status();
    switch (status) {
    case 'Closed':
    case 'Red':
    case 'Yellow':
      return;
    case 'Queued':
      return cancel();
    case 'Error':
    case 'Cancelled':
      return reset();
    case 'Reindexing':
      return cancel();
    case 'Pending':
      return queue();
    default:
      throw ("Unknown status: " + status);
    }
  }

}

Index.reindex_index = '.reindex-status';

Index.init_all_indices = function(on_change) {
  var indices = {};
  return Index.init_index()

  .then(function() {
    console.log('Loading index data');
    return es.post('/_refresh')
  })

  .then(
    function() {
      return Promise.all([
        es.get('/_cluster/state/metadata', {
          "filter_path" : "metadata.indices.*.state,"
            + "metadata.indices.*.settings.index.version.created,"
            + "metadata.indices.*.settings.index.creation_date,"
            + "metadata.indices.*.settings.index.number*,"
            + "metadata.indices.*.settings.index.priority"
        }),
        es.get('/_cluster/health', {
          "level" : "indices",
          "filter_path" : "indices.*.status"
        }),
        es.get('/_stats', {
          "human" : true,
          "filter_path" : "indices.*.primaries.docs.count,"
            + "indices.*.primaries.store.size"
        })

      ])
    })

  .then(
    function(d) {

      function format_version(version) {
        return version.substr(0, 1)
          + '.'
          + parseInt(version.substr(1, 2))
          + '.'
          + parseInt(version.substr(3, 2));
      }

      function format_date(timestamp) {
        var date = new Date(parseInt(timestamp));
        return date.getFullYear()
          + '-'
          + _.padStart(date.getMonth(), 2, '0')
          + '-'
          + _.padStart(date.getDay(), 2, '0');
      }

      var state = d[0].metadata.indices;
      var health = d[1].indices;
      var stats = d[2].indices || {};

      _.forEach(state, function(v, k) {

        var version = v.settings.index.version.created;
        if (version >= 2000000) {
          return;
        }

        indices[k] = {
          version : format_version(version),
          state : v.state,
          shards : v.settings.index.number_of_shards,
          replicas : v.settings.index.number_of_replicas,
          created : format_date(v.settings.index.creation_date),
          created_timestamp : v.settings.index.creation_date,
          priority : v.settings.index.priority || '',
          health : health[k] ? health[k].status : '',
          docs : stats[k] ? stats[k].primaries.docs.count : '',
          size : stats[k] ? stats[k].primaries.store.size : ''
        };

      });

      if (_.keys(indices).length === 0) {
        return Promise.resolve({
          docs : []
        });
      }
      return es.post('/' + Index.reindex_index + '/index/_mget', {
        filter_path : "docs._id,docs._source"
      }, {
        ids : _.keys(indices)
      });
    })

  .then(function(r) {
    _.forEach(r.docs, function(v) {
      indices[v._id] = new Index(v._id, indices[v._id], v._source, on_change)
    });

    if (_.keys(indices).length === 0) {
      return Index.delete_index();
    }
  })

  .then(function() {
    return indices;
  });
}

Index.init_index = function() {
  var index_name = Index.reindex_index;

  console.log('Creating index: `' + index_name + '`');
  return es.put('/' + index_name, {}, {
    "settings" : {
      "number_of_shards" : 1
    },
    "mappings" : {
      "index" : {
        "properties" : {
          "reindex_status" : {
            "type" : "string",
            "index" : "not_analyzed"
          },
          "task_id" : {
            "type" : "string",
            "index" : "not_analyzed"
          },
          "error" : {
            "enabled" : false
          },
          "aliases" : {
            "enabled" : false
          },
          "replicas" : {
            "enabled" : false
          },
          "refresh" : {
            "enabled" : false
          }

        }
      }
    }
  }) //
  .then(function() {
    console.log('Index `' + index_name + '` created successfully')
  }) //
  .caught(ES_Error, function(e) {
    if (e.type === 'index_already_exists_exception') {
      console.log('Index `' + index_name + '` already exists - skipping')
    } else {
      throw (e)
    }
  });
};

Index.delete_index = function() {
  var index_name = Index.reindex_index;
  console.log('Deleting `' + index_name + '`');
  return es.del('/' + index_name)

  .then(function() {
    console.log('Index `' + index_name + '` deleted successfully');
  })

  .caught(ES_Error, function(e) {
    if (e.type === 'index_not_found_exception') {
      console.log('Index `' + index_name + '` not found');
    } else {
      throw (e)
    }
  });
}
function Indices(wrapper) {

  var indices;
  var table;

  function on_change(name) {
    var index = indices[name];
    var row = jQuery('#' + name_to_id(name));
    if (index.get_reindex_status() === 'finished') {
      delete indices[name];
      row.remove();
      if (_.keys(indices).length === 0) {
        return init();
      }
    } else {
      row.attr('class', index.status());
      row.empty().append(render_row(index));
    }
    table.trigger('update');
    add_td_hover(row);
  }

  function name_to_id(name) {
    return 'index_' + name.replace(/[. ]/g, '_');
  }

  function init_queue() {
    var queued = [];

    _.forEach(sorted_indices(), function(name) {
      var index = indices[name];
      var status = index.status();
      if (status === 'Reindexing') {
        enqueue(index);
      } else if (status === 'Queued') {
        queued.push(index)
      }
    });

    _.forEach(queued, function(index) {
      enqueue(index)
    });

  }

  function render_no_indices() {
    wrapper.empty().append(
      '<div id="no_indices">No indices exist which require reindexing.</div>');
  }

  function render_table() {
    var headers = [
      'Name',
      'Version',
      'Created',
      'Docs',
      'Size',
      'Shards',
      'Replicas',
      'Status',
      'Action',
      '&#x2139;',
      'Info',
    ];

    table = jQuery(

    '<table>'
      + col(headers)
      + '<thead>'
      + '<tr>'
      + th(headers)
      + '</tr>'
      + '</thead>'
      + '<tbody></tbody>'
      + '</table>');

    var tbody = table.find('tbody');
    _.forEach(sorted_indices(), function(name) {
      var index = indices[name];
      var row = jQuery(
        '<tr id="'
          + name_to_id(name)
          + '" class="'
          + index.status()
          + '"></tr>)') //
      .append(render_row(index));
      tbody.append(row);
    });

    wrapper.empty().append('<div id="td_detail"></div>').append(table);

    table.tablesorter({
      cssAsc : 'asc',
      cssDesc : 'desc'
    });

    add_td_hover(table);
  }

  function render_row(index) {

    return jQuery(
      td([
        index.name,
        index.info.version,
        index.info.created,
        index.info.docs,
        index.info.size,
        index.info.shards,
        index.info.replicas,
        index.status()
      ])).add(build_action(index.action())).add(build_reindex_info(index)).add(
      td([
        index.get_extra()
      ]));
  }

  function add_td_hover(el) {
    var detail = jQuery('#td_detail');
    detail.hide().mouseout(function() {
      detail.hide();
    });

    el.find('td').mouseover(
      function() {
        var td = jQuery(this);
        if (td.text() === '' || td.find('button,a').length > 0) {
          return;
        }
        var pos = td.position();
        detail.text(td.text()).css('top', pos.top - 0.5 * td.height()).css(
          'left',
          pos.left + 'px').css('min-width', td.width()).show();
      });
  }

  function col(cols) {
    var html = '';
    _.forEach(cols, function(v) {
      html += '<col class="' + v + '">'
    });
    return html;
  }

  function th(ths) {
    var html = '';
    _.forEach(ths, function(v) {
      html += '<th>' + v + '</th>'
    });
    return html;
  }

  function td(tds) {
    var html = '';
    _.forEach(tds, function(v) {
      html += '<td>' + v + '</td>'
    });
    return html;
  }

  function build_reindex_info(index) {
    var a = jQuery('<a href="#" class="info">&#x2139;</a>').click(function(e) {
      e.preventDefault();
      return new Reindexer(index).reindex_to_html();
    });
    return jQuery('<td></td>').append(a);
  }

  function build_action(action) {
    if (!action) {
      return '<td></td>'
    }
    var button = jQuery('<button>' + action[0] + '</button>').click(action[1]);
    return jQuery('<td>').append(button);
  }

  function sorted_indices() {
    var sort_keys = {};
    _.forEach(indices, function(v, k) {
      sort_keys[k] = v.sort_key()
    });

    return _.keys(sort_keys).sort(function(a, b) {
      if (sort_keys[a] < sort_keys[b]) {
        return -1
      }
      if (sort_keys[b] < sort_keys[a]) {
        return 1
      }
      return 0;
    })
  }

  function init() {
    return Index.init_all_indices(on_change)

    .then(function(i) {
      indices = i;
      if (_.keys(indices).length === 0) {
        render_no_indices();
      } else {
        render_table();
        init_queue();
      }
    });
  }

  init();
}
function Reindexer(index) {
  var src = index.name;
  var dest = src + "-" + version;

  function run_stmt(r) {
    if (!r) {
      return;
    }
    if (r.log) {
      console.log(r.log);
    }
    return es[r.method](r.path, r.qs, r.body);
  }

  function create_dest_index() {
    if (index.get_reindex_status() !== 'starting') {
      return Promise.resolve()
    }

    return create_dest_index_stmt().then(run_stmt)

    .then(function() {
      return index.set_reindex_status('index_created')
    });
  }

  function create_dest_index_stmt() {
    return es.get('/' + encodeURIComponent(src)) //
    .then(function(d) {
      d = d[src];

      delete d.warmers;

      index.state.aliases = d.aliases;
      delete d.aliases;

      index.state.refresh = d.settings.index.refresh_interval || '1s';
      index.state.replicas = d.settings.index.number_of_replicas;

      d.settings.index.refresh_interval = -1;
      d.settings.index.number_of_replicas = 0;

      delete d.settings.index.uuid;
      delete d.settings.index.version;
      delete d.settings.index.creation_date;
      delete d.settings.index.blocks;
      delete d.settings.index.legacy;
      return {
        log : 'Creating index `' + dest + '`',
        method : "put",
        path : '/' + encodeURIComponent(dest),
        body : d
      };
    });
  }

  function set_src_read_only() {
    if (index.get_reindex_status() !== 'index_created') {
      return Promise.resolve()
    }

    return set_src_read_only_stmt().then(run_stmt)
  }

  function set_src_read_only_stmt() {
    return Promise.resolve({
      log : 'Setting index `' + src + '` to read-only',
      method : 'put',
      path : '/' + encodeURIComponent(src) + '/_settings',
      body : {
        "index.blocks.write" : true
      }
    });
  }

  function start_reindex() {
    if (index.get_reindex_status() !== 'index_created') {
      return Promise.resolve()
    }
    return start_reindex_stmt().then(run_stmt)

    .then(function(r) {
      index.state.task_id = r.task;
      return index.set_reindex_status('reindexing');
    });
  }

  function start_reindex_stmt() {
    return Promise.resolve({
      log : "Starting reindex",
      method : 'post',
      path : '/_reindex',
      qs : {
        wait_for_completion : false
      },
      body : {
        source : {
          index : src,
          sort : "_doc",
          size : 1000
        },
        dest : {
          index : dest,
          version_type : "external"
        }
      }
    });
  }

  function monitor_reindex() {
    if (index.get_reindex_status() !== 'reindexing') {
      return Promise.resolve();
    }
    if (!index.state.task_id) {
      throw ("Index should be reindexing, but there is no task ID");
    }

    return new MonitorTask(index, index.state.task_id).then(function() {
      index.set_reindex_status('reindexed');
      return es.post('/' + encodeURIComponent(dest) + '/_refresh');
    });
  }

  function monitor_task_stmt() {
    return Promise
      .resolve({
        log : "Use the task_id from the reindex request above to monitor the reindex status",
        method : "get",
        path : "/_tasks/{TASK_ID}",
        qs : {
          detailed : true
        }
      });
  }

  function check_success() {
    if (index.get_reindex_status() !== 'reindexed') {
      return Promise.resolve();
    }
    var src_count;
    return check_src_count_stmt().then(run_stmt)

    .then(function(r) {
      src_count = r.count;
      return check_dest_count_stmt()
    }).then(run_stmt)

    .then(
      function(r) {
        if (r.count !== src_count) {
          throw ('Index `'
            + src
            + '` has `'
            + src_count
            + '` docs, but index `'
            + dest
            + '` has `'
            + r.count + '` docs');
        }
        console.log('Indices `'
          + src
          + '` and `'
          + dest
          + '` have the same number of docs');
      });
  }

  function check_src_count_stmt() {
    return Promise.resolve({
      log : "Check that `"
        + src
        + "` and `"
        + dest
        + "` have the same number of documents",
      method : "get",
      path : '/' + encodeURIComponent(src) + '/_count'
    });

  }

  function check_dest_count_stmt() {
    return Promise.resolve({
      method : "get",
      path : '/' + encodeURIComponent(dest) + '/_count'
    });

  }

  function finalise_dest() {
    if (index.get_reindex_status() !== 'reindexed') {
      return Promise.resolve();
    }
    return finalise_dest_stmt().then(run_stmt)

    .then(function() {
      console.log('Waiting for index `' + dest + '` to turn green');
      index.set_extra('Waiting for index `' + dest + '` to turn `green`');
      return new MonitorHealth(index, dest)
    })
  }

  function finalise_dest_stmt() {
    return Promise.resolve({
      log : 'Adding replicas to index `' + dest + '`',
      method : 'put',
      path : '/' + encodeURIComponent(dest) + '/_settings',
      body : {
        "index.number_of_replicas" : index.state.replicas,
        "index.refresh_interval" : index.state.refresh
      }
    });
  }

  function monitor_health_stmt() {
    return Promise.resolve({
      log : "Wait for index `" + dest + "` to turn green",
      method : "get",
      path : "/_cluster/health/" + encodeURIComponent(dest),
      qs : {
        wait_for_status : 'green'
      }
    });
  }

  function move_extra_aliases_to_dest() {
    if (index.get_reindex_status() !== 'green') {
      return Promise.resolve();
    }

    return move_extra_aliases_to_dest_stmt().then(run_stmt)

    .then(function() {
      return index.set_reindex_status('aliases_added');
    });
  }

  function move_extra_aliases_to_dest_stmt() {
    if (_.keys(index.state.aliases).length == 0) {
      return Promise.resolve();
    }

    var actions = [];

    _.forEach(index.state.aliases, function(v, k) {
      v.index = dest;
      v.alias = k;
      actions.push({
        add : v
      });
    });
    return Promise.resolve({
      log : 'Moving extra aliases to index `' + dest + '`',
      method : 'post',
      path : '/_aliases',
      body : {
        actions : actions
      }
    });
  }

  function delete_src() {
    if (index.get_reindex_status() !== 'aliases_added') {
      return Promise.resolve();
    }
    return delete_src_stmt().then(run_stmt)

    .then(function() {
      return index.set_reindex_status('src_deleted');
    });
  }

  function delete_src_stmt() {
    return Promise.resolve({
      log : 'Deleting index `' + src + '`',
      method : 'del',
      path : '/' + encodeURIComponent(src)
    });
  }

  function add_name_alias_to_dest() {
    if (index.get_reindex_status() !== 'src_deleted') {
      return Promise.resolve();
    }

    return add_name_alias_to_dest_stmt().then(run_stmt)

    .then(function() {
      return index.set_reindex_status('finished');
    });
  }

  function add_name_alias_to_dest_stmt() {
    var actions = [
      {
        add : {
          index : dest,
          alias : src
        }
      }
    ];

    return Promise.resolve({
      log : 'Adding `' + src + '` alias to index `' + dest + '`',
      method : 'post',
      path : '/_aliases',
      body : {
        actions : actions
      }
    });
  }

  function reset() {
    console.log('Resetting index `' + src + '` and index `' + dest + '`');
    index.set_extra('');
    return Promise
      .all([ //
        es.get('/' + encodeURIComponent(src) + '/_count'), //
        es.get('/_cluster/health/' + encodeURIComponent(src), {
          level : "indices"
        })
      //
      ])

      .then(
        function(r) {
          if (r[0].count !== index.info.docs) {
            throw ('Doc count in index `' + src + '` has changed. Not resetting.')
          }

          var health = _.get(r[1], [
            'indices', src, 'status'
          ]) || 'missing';
          if (health !== 'green') {
            throw ('Health of index `'
              + src
              + '` is `'
              + health
              + '`, not `green`. ' + 'Not resetting.');
          }

          console.log('Setting index `' + src + '` to writable');
        })

      .then(function() {
        return es.put('/' + encodeURIComponent(src) + '/_settings', {}, {
          "index.blocks.write" : false
        });
      })

      .then(
        function() {
          console.log('Deleting index `' + dest + '`');
          return es.del('/' + encodeURIComponent(dest)).caught(
            ES_Error,
            function(e) {
              if (e.status !== 404) {
                throw (e);
              }
            })
        })

      .lastly(function() {
        error.empty();
        index.set_extra('');
        index.set_reindex_status('');
        reindex_next();
        return;
      })

      .caught(handle_error);
  }

  function handle_error(e) {
    index.state.error = e.toString();
    return index.set_reindex_status('error') //
    .then(function() {
      throw (e)
    });

  }

  function reindex() {

    if (index.get_reindex_status() === 'error') {
      return Promise.reject("Cannot reindex `"
        + src
        + "`. First resolve error: "
        + state.error);
    }

    console.log('Reindexing `' + src + '` to `' + dest + '`');

    return create_dest_index() //
    .then(set_src_read_only) //
    .then(start_reindex) //
    .then(monitor_reindex) //
    .then(check_success) //
    .then(finalise_dest) //
    .then(move_extra_aliases_to_dest) //
    .then(delete_src) //
    .then(add_name_alias_to_dest) //
    .then(function() {
      if (index.get_reindex_status() === 'cancelled') {
        console.log('Reindexing cancelled');
        return reset();
      }
      return console.log('Reindexing completed successfully');
    }) //
    .caught(handle_error);
  }

  function reindex_to_html() {
    var out;
    function print_stmt(r) {
      if (!r) {
        return;
      }
      var html = "";
      if (r.log) {
        html = '<pre>## ' + r.log + "</pre>\n";
      }
      var method;
      switch (r.method) {
      case 'get':
        method = 'GET';
        break;
      case 'put':
        method = 'PUT';
        break;
      case 'post':
        method = 'POST';
        break;
      case 'del':
        method = 'DELETE';
        break;
      }
      var url = es.host + r.path;
      if (r.qs) {
        url += '?' + jQuery.param(r.qs);
      }
      html += '<pre class="curl">curl -X' + method + " '" + url + "'";

      if (r.body) {
        html += " -d '\n" + JSON.stringify(r.body, null, 2) + "\n'\n"
      } else {
        html += "\n"
      }
      ;

      html += "</pre>\n\n";
      out.append(html);
    }
    var close = jQuery('<a href="#">Close</a>').click(function(e) {
      e.preventDefault();
      jQuery('#reindex_process').hide()
    });
    out = jQuery('#reindex_process').empty().show().append(
      '<div id="reindex_content"></div>').find('#reindex_content');
    out.append(close);
    out.append('<h2>Steps to manually reindex <code>'
      + src
      + '</code> to <code>'
      + dest
      + '</code></h2>'
      + "\n");

    return create_dest_index_stmt().then(print_stmt).then(
      set_src_read_only_stmt).then(print_stmt) //
    .then(start_reindex_stmt).then(print_stmt) //
    .then(monitor_task_stmt).then(print_stmt) //
    .then(check_src_count_stmt).then(print_stmt) //
    .then(check_dest_count_stmt).then(print_stmt) //
    .then(finalise_dest_stmt).then(print_stmt) //
    .then(monitor_health_stmt).then(print_stmt) //
    .then(move_extra_aliases_to_dest_stmt).then(print_stmt) //
    .then(delete_src_stmt).then(print_stmt) //
    .then(add_name_alias_to_dest_stmt).then(print_stmt) //

  }

  return {
    reindex : reindex,
    reindex_to_html : reindex_to_html,
    reset : reset
  }

}
function MonitorTask(index, task_id) {

  var monitor_init_time = controller_init_time;
  var node_id = task_id.split(':')[0];

  function get_task(resolve, reject) {

    function _get_task() {
      if (index.get_reindex_status() === 'cancelled') {
        console.log('Cancelling reindex task: ', task_id);
        resolve();
        return es.post('/_tasks/' + task_id + '/_cancel')
      }

      return es.get('/_tasks/' + task_id, {
        detailed : true,
        nodes : node_id
      }) //
      .then(
        function(r) {
          if (monitor_init_time === controller_init_time && r.nodes[node_id]) {
            var status = r.nodes[node_id].tasks[task_id].status;
            index.set_extra((status.created + status.updated)
              + " / "
              + status.total);
            return Promise.delay(1000).then(_get_task);
          }
          index.set_extra('');
          resolve();
        }) //
      .caught(reject);
    }
    _get_task();
  }
  return new Promise(get_task);
};
function MonitorHealth(index, dest) {

  var monitor_init_time = controller_init_time;

  function wait_for_green(resolve, reject) {

    function _wait_for_green() {
      es.get('/_cluster/health/' + encodeURIComponent(dest), {
        level : 'indices'
      }) //
      .then(
        function(r) {
          if (index.get_reindex_status() === 'cancelled'
            || monitor_init_time !== controller_init_time) {
            resolve();
            return;
          }
          if (r.indices[dest].status === 'green') {
            index.set_extra('');
            index.set_reindex_status('green');
            resolve();
            return;
          }
          return Promise.delay(1000).then(_wait_for_green);
        }) //
      .caught(reject);
    }
    _wait_for_green();
  }

  return new Promise(wait_for_green);

}

  var version;
  var current;
  var queue = [];

  function enqueue(index) {
    queue.push(index);
    reindex_next();
  }

  function dequeue(index) {
    var found = _.remove(queue, function(el) {
      return el.name === index.name
    });
    return found.length > 0;
  }

  function reindex_next() {
    var reindex_init_time = controller_init_time;

    if (current) {
      return;
    }

    function _next() {
      if (reindex_init_time !== controller_init_time) {
        return;
      }

      current = queue.shift();
      if (current) {
        Promise.resolve().then(function() {
          if (current.get_reindex_status() === 'queued') {
            return current.set_reindex_status('starting')
          }
        })

        .then(function() {
          return new Reindexer(current).reindex()
        })

        .caught(show_error).lastly(function() {
          current = undefined;
        })

        .delay(0).then(_next)
      }
    }

    _next();
  }

  function show_error(e) {
    error.empty().html(e);
    throw (e);
  }

  controller_init_time = Date.now();

  error.empty();
  wrapper.empty();

  console.log('Connecting to: ' + es.host);

  es.get_version().then(function(v) {
    version = v;
    if (v.lt('2.3.*') || v.gt('2.*')) {
      throw ('The Reindex Helper only works with Elasticsearch versions 2.3.0 - 2.4.x')
    }
    return new Indices(wrapper);
  }).caught(show_error);
}
"use strict";

var controller_init_time;

function DeprecationController(es, wrapper, error) {

  function render_status(status) {
    var msg;
    var buttons;
    var color;

    switch (status) {
    case -1:
      msg = "Enabled on all nodes";
      color = 'green';
      buttons = [
        'disable'
      ];
      break;
    case 0:
      msg = "Disabled on all nodes";
      color = 'red';
      buttons = [
        'enable'
      ];
      break;
    default:
      color = 'yellow';
      msg = "Enabled on some nodes";
      buttons = [
        'enable', 'disable'
      ];
    }

    wrapper.empty().html(
      '<h2>Deprecation logging is currently: '
        + '<span id="depr_status" class="'
        + color
        + '">'
        + msg
        + '</span></h2>');

    _.forEach(buttons, function(v) {
      var button;
      switch (v) {
      case 'enable':
        button = jQuery(
          '<a href="#" class="enable">'
            + 'Enable deprecation logging on all nodes in the cluster'
            + '</a>').click(function(e) {
          e.preventDefault();
          return set_status('enable');
        }); break;
      case 'disable':
        button = jQuery(
          '<a href="#" class="disable">'
            + 'Disable deprecation logging on all nodes in the cluster'
            + '</a>').click(function(e) {
          e.preventDefault();
          return set_status('disable');
        });
      }
      wrapper.append(button);
    });

  }

  function set_status(status) {
    return es.put('/_cluster/settings', {}, {
      "transient" : {
        "logger.deprecation" : status === 'enable' ? 'DEBUG' : 'INFO'
      }
    })

    .then(get_status)
  }

  function get_status() {
    return Promise.all([
      es.get('/_cluster/settings', {
        flat_settings : true
      }), es.get('/_nodes/settings', {
        flat_settings : true
      })
    ])

    .then(function(r) {
      var status;
      var setting = _.get(r[0], [
        'transient', 'logger.deprecation'
      ]) || _.get(r[0], [
        'persistent', 'logger.deprecation'
      ]);
      if (setting) {
        status = setting === 'DEBUG' ? -1 : 0;
      } else {
        var nodes = r[1].nodes;
        var count = 0;
        _.forEach(nodes, function(v) {
          if (_.get(v, [
            'settings', 'logger.deprecation'
          ]) === 'DEBUG') {
            count++;
          }
        });
        if (count === _.keys(nodes).length) {
          status = -1;
        } else if (count === 0) {
          status = 0;
        } else {
          status = count
        }
      }
      render_status(status)
    });
  }

  function show_error(e) {
    error.empty().html(e);
    throw (e);
  }

  error.empty();
  wrapper.empty();

  console.log('Connecting to: ' + es.host);

  es.get_version().then(function(v) {
    if (v.lt('2.4.*') || v.gt('2.*')) {
      throw ('Deprecation Logging is only available in Elasticsearch versions 2.4.x')
    }
    return get_status();
  }).caught(show_error);
}

  var els = {
    home : jQuery('#intro_switch'),
    blurb : jQuery('#blurb p, #blurb ul'),
    form : jQuery('#blurb form'),
    es_host : jQuery('#es_host'),
    creds : jQuery('#enable_creds'),
    show_green : jQuery('#show_green'),
    buttons : {
      blurb : jQuery('#blurb_button'),
      migration : jQuery('#blurb form button.migration'),
      reindex : jQuery('#blurb form button.reindex'),
      depr : jQuery('#blurb form button.depr'),
    },
    sections : {
      intro : jQuery('.intro'),
      migration : jQuery('.migration'),
      reindex : jQuery('.reindex'),
      depr : jQuery('.depr')
    },
    wrappers : {
      migration : jQuery('#migration_wrapper'),
      migration_log : jQuery('#migration_log'),
      reindex : jQuery('#reindex_wrapper'),
      depr : jQuery('#depr_wrapper'),
      error : jQuery('#error_wrapper'),
    }
  };

  function get_client() {
    return new Client(els.es_host.val(), els.creds.is(':checked'));
  }

  function run_migration(e) {
    e.preventDefault();
    blurb('Hide');
    els.wrappers.migration.show();
    new MigrationController(
      get_client(),
      els.wrappers.migration_log,
      els.wrappers.error);
  }

  function run_reindex(e) {
    e.preventDefault();
    blurb('Hide');
    new ReindexController(
      get_client(),
      els.wrappers.reindex,
      els.wrappers.error);
  }

  function run_depr(e) {
    e.preventDefault();
    blurb('Hide');
    new DeprecationController(
      get_client(),
      els.wrappers.depr,
      els.wrappers.error);
  }

  function blurb(state) {
    if (state !== 'Show' && state !== 'Hide') {
      state = els.buttons.blurb.text()
    }

    if (state === 'Show') {
      els.blurb.show(200);
      els.buttons.blurb.text('Hide');
    } else {
      els.blurb.hide(200);
      els.buttons.blurb.text('Show');
    }
    els.buttons.blurb.blur();
  }

  function switch_view(page) {
    _.forEach(els.sections, function(v, k) {
      k === page ? v.show(200) : v.hide(200);
    });

    if (page === 'intro') {
      els.home.hide(200);
      els.buttons.blurb.hide(200);
      els.form.hide(200);
    } else {
      els.home.show(200);
      els.buttons.blurb.show(200);
      els.form.show(200);
    }

    if (page === 'migration') {
      els.wrappers.migration.hide(200);
      els.wrappers.migration_log.empty();
    }

    blurb('Show');
    els.wrappers.error.empty();
  }

  function show_green() {
    if (els.show_green.is(':checked')) {
      els.wrappers.migration_log.removeClass('no_green');
    } else {
      els.wrappers.migration_log.addClass('no_green');
    }
  }

  function init() {
    _.forEach(_.keys(els.sections), function(k) {
      jQuery('#' + k + '_switch').click(function(e) {
        e.preventDefault();
        switch_view(k)
      });
    });

    els.buttons.migration.click(run_migration);
    els.buttons.reindex.click(run_reindex);
    els.buttons.depr.click(run_depr);
    els.buttons.blurb.click(blurb);

    els.show_green.change(show_green);

    switch_view('intro');

    els.es_host.val(location.protocol + '//' + location.host);
    global_switch_view = switch_view;
  }
  init();
});