"use strict";

Checks
  .register(
    "tests",
    [

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

        checks : [
          {
            index : "good"
          },
          {
            index : "bad",
            msg : /The path and index_name parameters are deprecated, in fields: test:foo, test:foo.bar/
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

        checks : [
          {
            index : "good"
          },
          {
            index : "bad",
            msg : /Boolean fields will return 1\/0 instead of T\/F in scripts, aggregations, or sort values, in field: test:foo/
          } ]
      },

      /* Per-field postings format */

      {
        name : "Per-field postings format",
        skip : {
          gte : "1.4.*"
        },
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
          msg : /The postings_format parameter is no longer supported/
        } ]
      },

      /* Binary field compression */

      {
        name : "Binary field compression",
        setup : [

        [ "PUT", "/good", {
          "mappings" : {
            "good" : {
              "properties" : {
                "binary" : {
                  "type" : "binary"
                }
              }
            }
          }
        } ], [ "PUT", "/bad", {
          "mappings" : {
            "bad" : {
              "properties" : {
                "binary" : {
                  "type" : "binary",
                  "compress" : false,
                  "compress_threshold" : 100
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
          msg : /The compress and compress_threshold parameters/
        } ]
      },

      /* Fielddata formats */

      {
        name : "Fielddata formats",
        skip : {
          lt : "1.0.*"
        },
        setup : [

        [ "PUT", "/good", {
          "mappings" : {
            "good" : {
              "properties" : {
                "text" : {
                  "type" : "string",
                  "fielddata" : {
                    "format" : "pagedbytes"
                  }
                }
              }
            }
          }
        } ], [ "PUT", "/fst", {
          "mappings" : {
            "bad" : {
              "properties" : {
                "fst" : {
                  "type" : "string",
                  "fielddata" : {
                    "format" : "fst"
                  }
                }
              }
            }
          }
        } ], [ "PUT", "/compressed", {
          "mappings" : {
            "bad" : {
              "properties" : {
                "compressed" : {
                  "type" : "geo_point",
                  "fielddata" : {
                    "format" : "compressed"
                  }
                }
              }
            }
          }
        } ]

        ],

        checks : [
          {
            index : "good"
          },
          {
            index : "fst",
            msg : /The fst and compressed fielddata formats.*in field: bad:fst/
          },
          {
            index : "compressed",
            msg : /The fst and compressed fielddata formats.*in field: bad:compressed/
          } ]
      },

      /* Fields with dots */

      {
        name : "Fields with dots",
        setup : [

        [ "PUT", "/good", {
          "mappings" : {
            "good" : {
              "properties" : {
                "foo" : {
                  "properties" : {
                    "bar" : {
                      "type" : "string"
                    }
                  }
                }
              }
            }
          }
        } ], [ "PUT", "/bad", {
          "mappings" : {
            "bad" : {
              "properties" : {
                "foo.bar" : {
                  "type" : "string"
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
          msg : /Dots in field names.* in field: bad:foo\\.bar/
        } ]
      },

      /* search_analyzer without analyzer */

      {
        name : "Search analyzer without index analyzer",
        setup : [

        [ "PUT", "/analyzer", {
          "mappings" : {
            "good" : {
              "properties" : {
                "foo" : {
                  "properties" : {
                    "bar" : {
                      "type" : "string",
                      "search_analyzer" : "simple",
                      "analyzer" : "keyword"
                    }
                  }
                }
              }
            }
          }
        } ], [ "PUT", "/index_analyzer", {
          "mappings" : {
            "good" : {
              "properties" : {
                "foo" : {
                  "properties" : {
                    "bar" : {
                      "type" : "string",
                      "search_analyzer" : "simple",
                      "index_analyzer" : "keyword"
                    }
                  }
                }
              }
            }
          }
        } ], [ "PUT", "/bad", {
          "mappings" : {
            "bad" : {
              "properties" : {
                "foo.bar" : {
                  "type" : "string",
                  "search_analyzer" : "simple"
                }
              }
            }
          }
        } ]

        ],

        checks : [
          {
            index : "analyzer"
          },
          {
            index : "index_analyzer"
          },
          {
            index : "bad",
            msg : /Analyzer must be set when search_analyzer is set, in field: bad:foo..bar./
          } ]
      },

      /* Position offset gap */

      {
        name : "Position offset gap",
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
                  type : "string",
                  position_offset_gap : 10
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
          msg : /The position_offset_gap parameter has been renamed/
        } ]
      },

      /* Murmur3 */

      {
        name : "Murmur3",
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
                  type : "murmur3"
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
          msg : /The murmur3 field datatype has been moved/
        } ]
      }, ]);
