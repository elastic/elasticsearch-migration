"use strict";

Checks.register("tests",

[ {
  name : "Ancient index segments",
  setup : [],

  checks : [ {
    index : "closed_index",
    msg : /This index is closed/
  }, {
    index : "old_segments",
    msg : /contains segments created before Lucene 4/
  }, {
    index : "old_index",
    msg : /needs to be marked as upgraded/
  }, {
    index : "upgraded_index"
  }, {
    index : "new_index"
  }, ]
} ]);
