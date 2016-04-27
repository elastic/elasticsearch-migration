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
        .removed_settings(settings));
      cluster_color = worse(cluster_color, ClusterSettings
        .renamed_settings(settings));
      cluster_color = worse(cluster_color, ClusterSettings
        .unknown_settings(settings));

      return cluster_color;
    });

};

ClusterSettings.unknown_settings = function(settings) {

  var group_settings = [
    /^cluster\.routing\.allocation\.(?:require|include|exclude|awareness\.force)\./,
    /^indices\.analysis\.hunspell\.dictionary\./,
    /^logger\./,
    /^monitor\.jvm\.gc\.collector\./,
    /^node\.attr\./,
    /^request\.headers\./,
    /^threadpool\./,
    /^transport\.profiles\./
  ];
  return check_hash(
    'blue',
    'Unknown settings',
    settings,
    function(v, s) {
      if (_.has(ClusterSettings.known_settings, s)) {
        return;
      }
      var found = false;
      _.forEach(group_settings, function(regex) {
        if (s.match(regex)) {
          found = true;
        }
      })
      if (found) {
        return;
      }
      return "`" + s + "` will be moved to the `archived` namespace on upgrade"
    },
    'https://www.elastic.co/guide/en/elasticsearch/reference/master/breaking_50_settings_changes.html');
};

ClusterSettings.renamed_settings = function(settings) {

  var renamed = {
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
    "cluster.routing.allocation.concurrent_recoveries" : "cluster.routing.allocation.node_concurrent_recoveries",
    "cloud.aws.proxy_host" : "cloud.aws.proxy.host",
    "cloud.aws.ec2.proxy_host" : "cloud.aws.ec2.proxy.host",
    "cloud.aws.s3.proxy_host" : "cloud.aws.s3.proxy.host",
    "cloud.aws.proxy_port" : "cloud.aws.proxy.port",
    "cloud.aws.ec2.proxy_port" : "cloud.aws.ec2.proxy.port",
    "cloud.aws.s3.proxy_port" : "cloud.aws.s3.proxy.port",
    "cloud.azure.storage.account" : "cloud.azure.storage.{my_account_name}.account",
    "cloud.azure.storage.key" : "cloud.azure.storage.{my_account_name}.key",
    "shield.ssl" : "xpack.security.ssl.enabled",
    "shield.http.ssl" : "xpack.security.http.ssl.enabled",
    "shield.ssl.hostname_verification" : "xpack.security.ssl.hostname_verification.enabled",
    "watcher.actions.pagerduty" : "xpack.notification.pagerduty",
    "watcher.actions.slack" : "xpack.notification.slack",
    "watcher.actions.hipchat" : "xpack.notification.hipchat",
    "watcher.actions.email" : "xpack.notification.email",

  };

  function re_replace(k, re, replace) {
    if (k.match(re)) {
      return k.replace(re, replace)
    }
  }

  return check_hash(
    'blue',
    'Renamed settings',
    settings,
    function(v, k) {
      if (_.has(renamed, k)) {
        delete settings[k];
        return "`" + k + "` has been renamed to `" + renamed[k] + "`"
      }
      var new_k = re_replace(k, /^shield\./, 'xpack.security.')
        || re_replace(k, /^marvel\./, 'xpack.monitoring.')
        || re_replace(k, /^watcher\./, 'xpack.watcher.');
      if (new_k) {
        delete settings[k];
        return "`" + k + "` has been renamed to `" + new_k + "`";
      }
    },
    "https://www.elastic.co/guide/en/elasticsearch/reference/master/breaking_50_settings_changes.html");
};

ClusterSettings.removed_settings = function(settings) {
  var removed = {
    "action.get.realtime" : true,
    "gateway.format" : true,
    "http.netty.host" : true,
    "http.netty.bind_host" : true,
    "http.netty.publish_host" : true,
    "security.manager.enabled" : true,
    "indices.recovery.concurrent_small_file_streams" : true,
    "indices.recovery.concurrent_file_streams" : true,
    "indices.requests.cache.concurrency_level" : true,
    "indices.fielddata.cache.concurrency_level" : true,
    "indices.memory.min_shard_index_buffer_size" : true,
    "indices.memory.max_shard_index_buffer_size" : true,
    "max-open-files" : true,
    "netty.gathering" : true,
    "useLinkedTransferQueue" : true,
  };

  return check_hash(
    'blue',
    'Removed settings',
    settings,
    function(v, k) {
      if (_.has(removed, k)) {
        delete settings[k];
        return "`" + k + "`"
      }
    },
    "https://www.elastic.co/guide/en/elasticsearch/reference/master/breaking_50_settings_changes.html");
};

ClusterSettings.known_settings = {
  "action.auto_create_index" : true,
  "action.destructive_requires_name" : true,
  "action.master.force_local" : true,
  "action.search.shard_count.limit" : true,
  "bootstrap.ctrlhandler" : true,
  "bootstrap.mlockall" : true,
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
  "cluster.blocks.read_only" : true,
  "cluster.indices.close.enable" : true,
  "cluster.info.update.interval" : true,
  "cluster.info.update.timeout" : true,
  "cluster.name" : true,
  "cluster.nodes.reconnect_interval" : true,
  "cluster.routing.allocation.allow_rebalance" : true,
  "cluster.routing.allocation.awareness.attributes" : true,
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
  "cluster.routing.allocation.node_concurrent_incoming_recoveries" : true,
  "cluster.routing.allocation.node_concurrent_outgoing_recoveries" : true,
  "cluster.routing.allocation.node_concurrent_recoveries" : true,
  "cluster.routing.allocation.node_initial_primaries_recoveries" : true,
  "cluster.routing.allocation.snapshot.relocation_enabled" : true,
  "cluster.routing.allocation.total_shards_per_node" : true,
  "cluster.routing.allocation.type" : true,
  "cluster.routing.rebalance.enable" : true,
  "cluster.service.slow_task_logging_threshold" : true,
  "config.ignore_system_properties" : true,
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
  "http.max_chunk_size" : true,
  "http.max_content_length" : true,
  "http.max_header_size" : true,
  "http.max_initial_line_length" : true,
  "http.netty.max_composite_buffer_components" : true,
  "http.netty.max_cumulation_buffer_capacity" : true,
  "http.netty.receive_predictor_max" : true,
  "http.netty.receive_predictor_min" : true,
  "http.netty.worker_count" : true,
  "http.pipelining" : true,
  "http.pipelining.max_events" : true,
  "http.port" : true,
  "http.publish_port" : true,
  "http.reset_cookies" : true,
  "http.tcp.blocking_server" : true,
  "http.tcp.keep_alive" : true,
  "http.tcp.receive_buffer_size" : true,
  "http.tcp.reuse_address" : true,
  "http.tcp.send_buffer_size" : true,
  "http.tcp_no_delay" : true,
  "http.type" : true,
  "index.codec" : true,
  "index.store.fs.fs_lock" : true,
  "index.store.type" : true,
  "indices.analysis.hunspell.dictionary.ignore_case" : true,
  "indices.analysis.hunspell.dictionary.lazy" : true,
  "indices.breaker.fielddata.limit" : true,
  "indices.breaker.fielddata.overhead" : true,
  "indices.breaker.fielddata.type" : true,
  "indices.breaker.request.limit" : true,
  "indices.breaker.request.overhead" : true,
  "indices.breaker.request.type" : true,
  "indices.breaker.total.limit" : true,
  "indices.cache.cleanup_interval" : true,
  "indices.fielddata.cache.size" : true,
  "indices.mapping.dynamic_timeout" : true,
  "indices.queries.cache.count" : true,
  "indices.queries.cache.size" : true,
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
  "logger.level" : true,
  "monitor.fs.refresh_interval" : true,
  "monitor.jvm.gc.enabled" : true,
  "monitor.jvm.gc.refresh_interval" : true,
  "monitor.jvm.refresh_interval" : true,
  "monitor.os.refresh_interval" : true,
  "monitor.process.refresh_interval" : true,
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
  "node.add_id_to_custom_path" : true,
  "node.data" : true,
  "node.enable_lucene_segment_infos_trace" : true,
  "node.ingest" : true,
  "node.local" : true,
  "node.master" : true,
  "node.max_local_storage_nodes" : true,
  "node.mode" : true,
  "node.name" : true,
  "node.portsfile" : true,
  "node_id.seed" : true,
  "path.conf" : true,
  "path.home" : true,
  "path.logs" : true,
  "path.plugins" : true,
  "path.scripts" : true,
  "path.shared_data" : true,
  "pidfile" : true,
  "processors" : true,
  "repositories.fs.chunk_size" : true,
  "repositories.fs.compress" : true,
  "repositories.fs.location" : true,
  "repositories.uri.list_directories" : true,
  "repositories.url.url" : true,
  "rest.action.multi.allow_explicit_index" : true,
  "script.aggs" : true,
  "script.auto_reload_enabled" : true,
  "script.cache.expire" : true,
  "script.cache.max_size" : true,
  "script.default_lang" : true,
  "script.engine.expression.file.aggs" : true,
  "script.engine.expression.file.ingest" : true,
  "script.engine.expression.file.search" : true,
  "script.engine.expression.file.update" : true,
  "script.engine.expression.stored.aggs" : true,
  "script.engine.expression.stored.ingest" : true,
  "script.engine.expression.stored.search" : true,
  "script.engine.expression.stored.update" : true,
  "script.engine.expression.inline.aggs" : true,
  "script.engine.expression.inline.ingest" : true,
  "script.engine.expression.inline.search" : true,
  "script.engine.expression.inline.update" : true,
  "script.engine.groovy.file.aggs" : true,
  "script.engine.groovy.file.ingest" : true,
  "script.engine.groovy.file.search" : true,
  "script.engine.groovy.file.update" : true,
  "script.engine.groovy.stored.aggs" : true,
  "script.engine.groovy.stored.ingest" : true,
  "script.engine.groovy.stored.search" : true,
  "script.engine.groovy.stored.update" : true,
  "script.engine.groovy.inline.aggs" : true,
  "script.engine.groovy.inline.ingest" : true,
  "script.engine.groovy.inline.search" : true,
  "script.engine.groovy.inline.update" : true,
  "script.engine.mustache.file.aggs" : true,
  "script.engine.mustache.file.ingest" : true,
  "script.engine.mustache.file.search" : true,
  "script.engine.mustache.file.update" : true,
  "script.engine.mustache.stored.aggs" : true,
  "script.engine.mustache.stored.ingest" : true,
  "script.engine.mustache.stored.search" : true,
  "script.engine.mustache.stored.update" : true,
  "script.engine.mustache.inline.aggs" : true,
  "script.engine.mustache.inline.ingest" : true,
  "script.engine.mustache.inline.search" : true,
  "script.engine.mustache.inline.update" : true,
  "script.engine.painless.file.aggs" : true,
  "script.engine.painless.file.ingest" : true,
  "script.engine.painless.file.search" : true,
  "script.engine.painless.file.update" : true,
  "script.engine.painless.stored.aggs" : true,
  "script.engine.painless.stored.ingest" : true,
  "script.engine.painless.stored.search" : true,
  "script.engine.painless.stored.update" : true,
  "script.engine.painless.inline.aggs" : true,
  "script.engine.painless.inline.ingest" : true,
  "script.engine.painless.inline.search" : true,
  "script.engine.painless.inline.update" : true,
  "script.file" : true,
  "script.indexed" : true,
  "script.ingest" : true,
  "script.inline" : true,
  "script.search" : true,
  "script.update" : true,
  "search.default_keep_alive" : true,
  "search.default_search_timeout" : true,
  "search.keep_alive_interval" : true,
  "security.manager.filter_bad_defaults" : true,
  "transport.connections_per_node.bulk" : true,
  "transport.connections_per_node.ping" : true,
  "transport.connections_per_node.recovery" : true,
  "transport.connections_per_node.reg" : true,
  "transport.connections_per_node.state" : true,
  "transport.netty.boss_count" : true,
  "transport.netty.max_composite_buffer_components" : true,
  "transport.netty.max_cumulation_buffer_capacity" : true,
  "transport.netty.receive_predictor_max" : true,
  "transport.netty.receive_predictor_min" : true,
  "transport.netty.receive_predictor_size" : true,
  "transport.netty.worker_count" : true,
  "transport.ping_schedule" : true,
  "transport.publish_port" : true,
  "transport.service.type" : true,
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
  "transport.type" : true,
  "tribe.blocks.metadata" : true,
  "tribe.blocks.write" : true,
  "tribe.name" : true,
  "tribe.on_conflict" : true
};
