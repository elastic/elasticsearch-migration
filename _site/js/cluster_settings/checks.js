"use strict";

Checks
  .register(
    "cluster.settings",
    [

      {
        name : "Units for time and byte cluster settings",
        docs : "https://www.elastic.co/guide/en/elasticsearch/reference/2.0/breaking_20_setting_changes.html#_units_required_for_time_and_byte_sized_settings",
        color : "blue",
        check : function(settings) {

          var list = [ "indices.store.throttle.max_bytes_per_sec",
            "indices.recovery.file_chunk_size",
            "indices.recovery.translog_size",
            "indices.recovery.max_bytes_per_sec", "indices.ttl.interval",
            "indices.recovery.retry_delay_state_sync",
            "indices.recovery.retry_delay_network",
            "indices.recovery.recovery_activity_timeout",
            "indices.recovery.internal_action_timeout",
            "indices.recovery.internal_action_long_timeout",
            "cluster.routing.allocation.disk.reroute_interval",
            "cluster.info.update.interval", "cluster.info.update.timeout",
            "discovery.zen.publish_timeout",
            "cluster.service.slow_task_logging_threshold" ];
          var errors = [];
          forall(list, function(setting) {
            if (Checks.get_key(settings.persistent, setting).match(/\d$/)) {
              errors.push(setting)
            }
          });
          if (errors.length) {
            return "Units are required for byte and time settings: "
              + errors.sort().join(", ");
          }
        }
      },

    ]);
