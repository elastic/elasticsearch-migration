#!/bin/bash

echo "Creating directory ./test/"
mkdir -p test
cd test

echo ""
if [ -d elasticsearch-0.20.0 ]; then
    echo "elasticsearch 0.20.0 already downloaded"
else
    echo "Downloading elasticsearch 0.20.0";
    curl -s https://download.elastic.co/elasticsearch/elasticsearch/elasticsearch-0.20.0.tar.gz | tar -xz
fi;

if [ -d elasticsearch-0.90.0 ]; then
    echo "elasticsearch 0.90.0 already downloaded"
else
    echo "Downloading elasticsearch 0.90.0";
    curl -s https://download.elastic.co/elasticsearch/elasticsearch/elasticsearch-0.90.0.tar.gz | tar -xz
fi;

echo ""
echo "Creating data directory ./test/data/"
rm -Rf data
rm -f test_data.tar.gz
mkdir data


echo ""
echo "Starting Elasticsearch 0.20.0"
./elasticsearch-0.20.0/bin/elasticsearch -Des.path.data=data -p pid
sleep 10

echo ""
echo "Create index: segments-old_segments"
curl -XPUT "http://localhost:9200/segments-old_segments"

echo ""
echo "Create index: segments-old_index"
curl -XPUT "http://localhost:9200/segments-old_index"

echo ""
echo "Create index: segments-upgraded_index"
curl -XPUT "http://localhost:9200/segments-upgraded_index" -d'
{
  "settings": {
    "index.version.minimum_compatible": "4.0.0"
  }
}'

echo ""
echo "Create index: segments-red_index"
curl -XPUT "http://localhost:9200/segments-red_index"

sleep 2

echo ""
echo "Indexing documents into: segments-old_segments"
curl -XPOST "http://localhost:9200/segments-old_segments/my_type/_bulk" -d'
{ "index": {}}
{}
{ "index": {}}
{}
{ "index": {}}
{}
{ "index": {}}
{}
'
echo ""
echo "Flushing"
curl -XPOST "http://localhost:9200/_flush"

echo ""
sleep 1

echo ""
echo "Stopping Elasticsearch 0.20.0"
kill `cat pid`
sleep 1

echo ""
echo "Removing shard for segments-red_index"
rm -Rf data/elasticsearch/nodes/0/indices/segments-red_index/0

echo ""
echo "Starting Elasticsearch 0.90.0"
./elasticsearch-0.90.0/bin/elasticsearch -Des.path.data=data -p pid
sleep 10

echo ""
echo ""
echo "Create index: segments-new_index"
curl -XPUT "http://localhost:9200/segments-new_index"

echo ""
echo ""
echo "Create index: segments-closed_index"
curl -XPUT "http://localhost:9200/segments-closed_index"

echo ""
echo "Indexing documents into: segments-old_index"
curl -XPOST "http://localhost:9200/segments-old_index/my_type/_bulk" -d'
{ "index": {}}
{}
{ "index": {}}
{}
{ "index": {}}
{}
{ "index": {}}
{}
'

echo ""
echo "Indexing documents into: segments-upgraded_index"
curl -XPOST "http://localhost:9200/segments-upgraded_index/my_type/_bulk" -d'
{ "index": {}}
{}
{ "index": {}}
{}
{ "index": {}}
{}
{ "index": {}}
{}
'

echo ""
echo "Indexing documents into: segments-new_index"
curl -XPOST "http://localhost:9200/segments-new_index/my_type/_bulk" -d'
{ "index": {}}
{}
{ "index": {}}
{}
{ "index": {}}
{}
{ "index": {}}
{}
'

echo ""
echo "Indexing documents into: segments-closed_index"
curl -XPOST "http://localhost:9200/segments-closed_index/my_type/_bulk" -d'
{ "index": {}}
{}
{ "index": {}}
{}
{ "index": {}}
{}
{ "index": {}}
{}
'

echo ""
echo "Closing index: segments-new_index"
curl -XPOST "http://localhost:9200/segments-closed_index/_close"

echo ""
echo "Create index: conflicting_fields-bad"
curl -XPUT "http://localhost:9200/conflicting_fields-bad" -d'
{
  "mappings": {
    "one": {
      "properties": {
        "aaa": {
          "type": "string"
        },
        "bbb": {
          "properties": {
            "ccc": {
              "type": "string"
            }
          }
        },
        "ddd": {
          "type": "string",
          "fielddata": {
            "format": "disabled"
          }
        }
      }
    },
    "two": {
      "properties": {
        "aaa": {
          "type": "date"
        },
        "bbb": {
          "properties": {
            "ccc": {
              "type": "date"
            }
          }
        },
        "ddd": {
          "type": "string",
          "fielddata": {
            "format": "lazy"
          }
        }
      }
    }
  }
}'

echo ""
echo "Create index: conflicting_fields-good"
curl -XPUT "http://localhost:9200/conflicting_fields-good" -d'
{
  "mappings": {
    "one": {
      "properties": {
        "aaa": {
          "type": "string"
        },
        "bbb": {
          "dynamic": false,
          "properties": {
            "ccc": {
              "type": "date",
              "copy_to": [
                "foo"
              ]
            }
          }
        }
      }
    },
    "two": {
      "properties": {
        "aaa": {
          "type": "string",
          "ignore_above": 10
        },
        "bbb": {
          "dynamic": true,
          "properties": {
            "ccc": {
              "type": "date",
              "copy_to": [
                "bar"
              ],
              "include_in_all": true
            }
          }
        }
      }
    }
  }
}'

echo ""
echo "Create index: mappings"
curl -XPUT "http://localhost:9200/mappings" -d'
{
  "mappings": {
    "12345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890": {},
    ".dot": {},
    "test": {
      "_id": {
        "store": true
      },
      "_type": {
        "store": true
      },
      "_analyzer": {
        "path": "foo"
      },
      "_boost": {
        "name": "foo"
      },
      "_routing": {
        "required": true,
        "path": "foo"
      },
      "_index": {
        "store": true
      },
      "_size": {
        "store": true
      },
      "_timestamp": {
        "enabled": true,
        "format": "dateOptionalTime",
        "path": "date",
        "store": true,
        "default": "2015-01-01",
        "index": "no"
      },
      "analyzer": "whitespace",
      "index_analyzer": "whitespace",
      "search_analyzer": "whitespace"
    }
  }
}'

echo ""
echo "Create index: index_settings"
curl -XPUT "http://localhost:9200/index_settings" -d'
{
  "settings": {
    "index.store.type": "ram",
    "index.mapping.allow_type_wrapper": true,
    "index.refresh_interval": 1000,
    "index.merge.policy.max_merge_docs": 10000,
    "analysis": {
      "analyzer": {
        "default_index": {
          "type": "standard"
        }
      }
    }
  }
}'

echo ""
echo "Create index: index_settings-codec"
curl -XPUT "http://localhost:9200/index_settings-codec" -d'
{
  "settings": {
    "codec.postings_format": {
      "my_format": {
        "type": "pulsing",
        "freq_cut_off": 5
      }
    }
  }
}'

echo ""
echo "Create index: field_mappings"
curl -XPUT "http://localhost:9200/field_mappings" -d'
{
  "mappings": {
    "test": {
      "properties": {
        "index_name_and_path": {
          "path": "just_name",
          "properties": {
            "bar": {
              "type": "string",
              "index_name": "baz"
            }
          }
        },
        "boolean_field": {
          "type": "boolean"
        },
        "uid" : {
          "properties" : {
            "_uid" : {
              "type" : "string"
            }
          }
        },
        "binary_field": {
          "type": "binary",
          "compressed": true
        },
        "fielddata_field": {
          "type": "string",
          "fielddata": {
            "format": "fst"
          }
        },
        "position_gap": {
          "type": "string",
          "position_offset_gap": 10
        },
        "index_analyzer": {
          "type": "string",
          "search_analyzer": "whitespace"
        }
      }
    }
  }
}'

curl -XPUT "http://localhost:9200/murmur" -d'
{
  "mappings": {
    "test": {
      "properties": {
        "murmur3": {
          "type": "murmur3"
        }
      }
    }
  }
}'

echo ""
echo "Create index: field_mappings"
curl -XPUT "http://localhost:9200/field_mappings-postings_format" -d'
{
  "mappings": {
    "test": {
      "properties": {
        "postings": {
          "type": "string",
          "index": "not_analyzed",
          "postings_format": "pulsing"
        }
      }
    }
  }
}'

echo ""
echo "Cluster settings"
curl -XPUT "http://localhost:9200/_cluster/settings" -d'
{
  "persistent": {
    "indices.ttl.interval": 30000
  }
}'


echo ""
sleep 1;

echo ""
echo "Shutting down Elasticsearch 0.90.0"
kill `cat pid`
sleep 2

tar -czf test_data.tar.gz data

echo ""
echo "Test data directory now available in ./test/data/ or ./test/test_data.tar.gz"
