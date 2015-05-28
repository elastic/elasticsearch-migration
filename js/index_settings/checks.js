"use strict";

Checks
  .register(
    "index.settings",
    [
      {
        name : "In-memory indices",
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
        color : "red",
        check : function(settings) {
          if (Checks.get_key(settings, "index.codec")) {
            return "Custom codecs can no longer be configured. Reindex "
              + "without the `index.codec` setting.";
          }
        }
      },

    ]);
