"use strict";

Checks.register("tests",

[ {
  name : "Ancient index segments",
  setup : [],

  checks : [ {
    index : "segments-red_index",
    msg : /This index is missing 1 primary shard/
  }, {
    index : "segments-closed_index",
    msg : /This index is closed/
  }, {
    index : "segments-old_segments",
    msg : /contains segments created before Lucene 4/
  }, {
    index : "segments-old_index",
    msg : /needs to be marked as upgraded/
  }, {
    index : "segments-upgraded_index"
  }, {
    index : "segments-new_index"
  }, ]
} ]);
