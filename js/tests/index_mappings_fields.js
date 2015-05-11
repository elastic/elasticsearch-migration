"use strict";

Checks.register("tests", [

/* index_name / path */

{
  name : "Use of index_name or path",
  setup : [

  [ "PUT", "/good", {
    mappings : {
      test : {
        properties : {
          foo : {
            properties : {
              bar : {
                type : "string",
                copy_to : [ "baz" ]
              }
            }
          }
        }
      }
    }
  } ],

  [ "PUT", "/bad", {
    mappings : {
      test : {
        properties : {
          foo : {
            path : "just_name",
            properties : {
              bar : {
                type : "string",
                index_name : "baz"
              }
            }
          }
        }
      }
    }
  } ],

  ],

  checks : [ {
    index : "good"
  }, {
    index : "bad",
    msg : /Field test:foo uses deprecated parameter path/
  }, {
    index : "bad",
    msg : /Field test:foo.bar uses deprecated parameter index_name/
  } ]
},

/* boolean fields */

{
  name : "Boolean fields",
  setup : [

  [ "PUT", "/good", {
    mappings : {
      test : {
        properties : {
          foo : {
            type : "string"
          }
        }
      }
    }
  } ], [ "PUT", "/bad", {
    mappings : {
      test : {
        properties : {
          foo : {
            type : "boolean"
          }
        }
      }
    }
  } ]

  ],

  checks : [ {
    index : "good"
  }, {
    index : "bad",
    msg : /Boolean field test:foo will return 1\/0/
  } ]
},

/* Per-field postings format */

{
  name : "Per-field postings format",
  setup : [

  [ "PUT", "/good", {
    mappings : {
      test : {
        properties : {
          foo : {
            type : "string",
            index : "not_analyzed"
          }
        }
      }
    }
  } ], [ "PUT", "/bad", {
    mappings : {
      test : {
        properties : {
          foo : {
            type : "string",
            index : "not_analyzed",
            postings_format : "pulsing"
          }
        }
      }
    }
  } ]

  ],

  checks : [ {
    index : "good"
  }, {
    index : "bad",
    msg : /Field test:foo contains a postings_format/
  } ]
},

]);
