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
