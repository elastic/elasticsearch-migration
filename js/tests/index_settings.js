"use strict";

Checks.register("tests",

/* In-memory indices */

[ {
  name : "In-memory indices",
  setup : [

  [ "PUT", "/ram", {
    settings : {
      "index.store.type" : "ram"
    }
  } ],

  [ "PUT", "/memory", {
    settings : {
      "index.store.type" : "memory"
    }
  } ],

  [ "PUT", "/good", {} ]

  ],

  checks : [ {
    index : "ram",
    msg : /index.store.type.*no longer supported/
  }, {
    index : "memory",
    msg : /index.store.type.*no longer supported/
  }, {
    index : "good"
  } ]
},

/* Type wrapper setting */

{
  name : "Type wrapper setting",
  setup : [

  [ "PUT", "/good", {
    settings : {
      "index.mapping.allow_type_wrapper" : false
    }
  } ],

  [ "PUT", "/bad", {
    settings : {
      "index.mapping.allow_type_wrapper" : true
    }
  } ],

  [ "PUT", "/not_set" ]

  ],

  checks : [ {
    index : "good"
  }, {
    index : "not_set"
  }, {
    index : "bad",
    msg : /index.mapping.allow_type_wrapper/
  } ]

},

/* Codec setting */

{
  name : "Codec setting",
  setup : [

  [ "PUT", "/good" ], [ "PUT", "/bad", {
    settings : {
      "codec.postings_format" : {
        my_format : {
          type : "pulsing",
          freq_cut_off : 5
        }
      }
    }
  } ]

  ],
  checks : [ {
    index : "good"
  }, {
    index : "bad",
    msg : /Custom codecs can no longer be configured/
  } ]

}

]);
