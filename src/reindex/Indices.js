function Indices(wrapper) {

  var indices;
  var table;

  function on_change(name) {
    var index = indices[name];
    var row = jQuery('#' + name_to_id(name));
    if (index.get_reindex_status() === 'finished') {
      delete indices[name];
      row.remove();
      if (_.keys(indices).length === 0) {
        return init();
      }
    } else {
      row.attr('class', index.status());
      row.empty().append(render_row(index));
    }
    table.trigger('update');
    add_td_hover(row);
  }

  function name_to_id(name) {
    return 'index_' + name.replace(/[. ]/g, '_');
  }

  function init_queue() {
    var queued = [];

    _.forEach(sorted_indices(), function(name) {
      var index = indices[name];
      var status = index.status();
      if (status === 'Reindexing') {
        enqueue(index);
      } else if (status === 'Queued') {
        queued.push(index)
      }
    });

    _.forEach(queued, function(index) {
      enqueue(index)
    });

  }

  function render_no_indices() {
    wrapper.empty().append(
      '<div id="no_indices">No indices exist which require reindexing.</div>');
  }

  function render_table() {
    var headers = [
      'Name',
      'Version',
      'Created',
      'Docs',
      'Size',
      'Shards',
      'Replicas',
      'Status',
      'Action',
      '&#x2139;',
      'Info',
    ];

    table = jQuery(

    '<table>'
      + col(headers)
      + '<thead>'
      + '<tr>'
      + th(headers)
      + '</tr>'
      + '</thead>'
      + '<tbody></tbody>'
      + '</table>');

    var tbody = table.find('tbody');
    _.forEach(sorted_indices(), function(name) {
      var index = indices[name];
      var row = jQuery(
        '<tr id="'
          + name_to_id(name)
          + '" class="'
          + index.status()
          + '"></tr>)') //
      .append(render_row(index));
      tbody.append(row);
    });

    wrapper.empty().append('<div id="td_detail"></div>').append(table);

    table.tablesorter({
      cssAsc : 'asc',
      cssDesc : 'desc'
    });

    add_td_hover(table);
  }

  function render_row(index) {

    return jQuery(
      td([
        index.name,
        index.info.version,
        index.info.created,
        index.info.docs,
        index.info.size,
        index.info.shards,
        index.info.replicas,
        index.status()
      ])).add(build_action(index.action())).add(build_reindex_info(index)).add(
      td([
        index.get_extra()
      ]));
  }

  function add_td_hover(el) {
    var detail = jQuery('#td_detail');
    detail.hide().mouseout(function() {
      detail.hide();
    });

    el.find('td').mouseover(
      function() {
        var td = jQuery(this);
        if (td.text() === '' || td.find('button,a').length > 0) {
          return;
        }
        var pos = td.position();
        detail.text(td.text()).css('top', pos.top - 0.5 * td.height()).css(
          'left',
          pos.left + 'px').css('min-width', td.width()).show();
      });
  }

  function col(cols) {
    var html = '';
    _.forEach(cols, function(v) {
      html += '<col class="' + v + '">'
    });
    return html;
  }

  function th(ths) {
    var html = '';
    _.forEach(ths, function(v) {
      html += '<th>' + v + '</th>'
    });
    return html;
  }

  function td(tds) {
    var html = '';
    _.forEach(tds, function(v) {
      html += '<td>' + v + '</td>'
    });
    return html;
  }

  function build_reindex_info(index) {
    var a = jQuery('<a href="#" class="info">&#x2139;</a>').click(function(e) {
      e.preventDefault();
      return new Reindexer(index).reindex_to_html();
    });
    return jQuery('<td></td>').append(a);
  }

  function build_action(action) {
    if (!action) {
      return '<td></td>'
    }
    var button = jQuery('<button>' + action[0] + '</button>').click(action[1]);
    return jQuery('<td>').append(button);
  }

  function sorted_indices() {
    var sort_keys = {};
    _.forEach(indices, function(v, k) {
      sort_keys[k] = v.sort_key()
    });

    return _.keys(sort_keys).sort(function(a, b) {
      if (sort_keys[a] < sort_keys[b]) {
        return -1
      }
      if (sort_keys[b] < sort_keys[a]) {
        return 1
      }
      return 0;
    })
  }

  function init() {
    return Index.init_all_indices(on_change)

    .then(function(i) {
      indices = i;
      if (_.keys(indices).length === 0) {
        render_no_indices();
      } else {
        render_table();
        init_queue();
      }
    });
  }

  init();
}
