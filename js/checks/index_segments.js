"use strict";

Checks
  .register(
    "index.segments",
    [

    {
      name : "Ancient index segments",
      color : "red",
      check : function(segments) {

        function check_segment(segment) {
          if (!Checks.get_key(segment, 'version').match('^[45]')) {
            return "This index contains segments created before Lucene 4. "
              + 'Install Elasticsearch 1.6.x and upgrade this "+"index with the <a href="http://www.elastic.co/guide/en/elasticsearch/reference/current/indices-upgrade.html">`upgrade` API</a>.';
          }
        }

        function check_shard(shard) {
          return forall(shard.segments, check_segment)
        }

        function check_shard_group(group) {
          return forall(group, check_shard)
        }

        return forall(segments.shards, check_shard_group);
      }
    }

    ]);
