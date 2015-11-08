"use strict";

Checks
  .register(
    "index.settings",
    [
      {
        name : "In-memory indices",
        docs : "https://www.elastic.co/guide/en/elasticsearch/reference/2.0/breaking_20_setting_changes.html#_in_memory_indices",
        color : "red",
        check : function(settings) {
          if (Checks.get_key(settings, "index.store.type").match(/ram|memory/)) {
            return "Indices with `index.store.type` of `ram` or `memory` "
              + "are no longer supported."
          }
        }
      },

      {
        name : "Type wrapper setting",
        docs : "https://www.elastic.co/guide/en/elasticsearch/reference/2.0/breaking_20_crud_and_routing_changes.html#_documents_must_be_specified_without_a_type_wrapper",
        color : "red",
        check : function(settings) {
          if (Checks.get_key(settings, "index.mapping.allow_type_wrapper") === 'true') {
            return "The document `_source` field may no longer have "
              + "the type name as the root element. "
              + "Remove the `index.mapping.allow_type_wrapper` setting.";
          }
        }
      },

      {
        name : "Codec setting",
        docs : "https://www.elastic.co/guide/en/elasticsearch/reference/2.0/breaking_20_mapping_changes.html#_posting_and_doc_values_codecs",
        color : "red",
        check : function(settings) {
          if (Checks.get_key(settings, "index.codec")) {
            return "Custom codecs can no longer be configured. Reindex "
              + "without the `index.codec` setting.";
          }
        }
      },

      {
        name : "Default index analyzer",
        color : "yellow",
        check : function(settings) {
          if (Checks.get_key(settings, "index.analysis.analyzer.default_index")) {
            return "`default_index` analyzer has been replaced by the name `default`."
          }
        }
      },

      {
        name : "Units for time and byte settings",
        docs : "https://www.elastic.co/guide/en/elasticsearch/reference/2.0/breaking_20_setting_changes.html#_units_required_for_time_and_byte_sized_settings",
        color : "blue",
        check : function(settings) {

          var list = [ "index.merge.policy.floor_segment",
            "index.merge.policy.max_merged_segment",
            "index.merge.policy.max_merge_size",
            "index.merge.policy.min_merge_size",
            "index.shard.recovery.file_chunk_size",
            "index.shard.recovery.translog_size",
            "index.store.throttle.max_bytes_per_sec",
            "index.translog.flush_threshold_size",
            "index.translog.fs.buffer_size", "index.version_map_size",
            "index.gateway.wait_for_mapping_update_post_recovery",
            "index.gc_deletes", "index.indexing.slowlog.threshold.index.debug",
            "index.indexing.slowlog.threshold.index.info",
            "index.indexing.slowlog.threshold.index.trace",
            "index.indexing.slowlog.threshold.index.warn",
            "index.refresh_interval",
            "index.search.slowlog.threshold.fetch.debug",
            "index.search.slowlog.threshold.fetch.info",
            "index.search.slowlog.threshold.fetch.trace",
            "index.search.slowlog.threshold.fetch.warn",
            "index.search.slowlog.threshold.query.debug",
            "index.search.slowlog.threshold.query.info",
            "index.search.slowlog.threshold.query.trace",
            "index.search.slowlog.threshold.query.warn",
            "index.shadow.wait_for_initial_commit",
            "index.store.stats_refresh_interval",
            "index.translog.flush_threshold_period", "index.translog.interval",
            "index.translog.sync_interval" ];
          var errors = [];
          forall(list, function(setting) {
            var val = Checks.get_key(settings, setting);
            if (val.match(/\d$/) && val !== "0" && val !== "-1") {
              errors.push(setting)
            }
          });
          if (errors.length) {
            return "Units are required for byte and time settings: "
              + errors.sort().join(", ");
          }
        }
      },

      {
        name : "Merge policy settings",
        docs : "https://www.elastic.co/guide/en/elasticsearch/reference/2.0/breaking_20_setting_changes.html#_merge_and_merge_throttling_settings",
        color : "blue",
        check : function(settings) {

          var list = [ "index.merge.policy.type",
            "index.merge.policy.min_merge_size",
            "index.merge.policy.max_merge_size",
            "index.merge.policy.merge_factor",
            "index.merge.policy.max_merge_docs",
            "index.merge.policy.calibrate_size_by_deletes",
            "index.merge.policy.min_merge_docs",
            "index.merge.policy.max_merge_docs", 'indices.store.throttle.type',
            'indices.store.throttle.max_bytes_per_sec',
            'index.store.throttle.type',
            'index.store.throttle.max_bytes_per_sec' ];
          var errors = [];
          forall(list, function(setting) {
            if (Checks.get_key(settings, setting)) {
              errors.push(setting)
            }
          });
          if (errors.length) {
            return "Merge policy settings will be ignored: "
              + errors.sort().join(", ");
          }
        }
      },

      {
        name : "Index buffer size setting",
        color : "blue",
        check : function(settings) {
          if (Checks.get_key(settings, "index.buffer_size")) {
            return "The `index.buffer_size` setting has been removed and will be ignored."
          }
        }
      },

    ]);
