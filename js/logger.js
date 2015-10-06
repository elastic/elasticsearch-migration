"use strict";

function Logger(out_id) {
  var out;
  var header_el;
  var sections;

  function start_section(class_name, msg) {
    msg = msg.replace(/`([^`]+)`/g, "<code>$1</code>");
    var new_out = jQuery('<li class="section"><span class="section '
      + class_name + '"><i class="dot"></i>' + '<strong>' + msg + '</strong>'
      + '</span><ul></ul></li>');
    out.append(new_out);
    sections.push(out);
    out = new_out.find('ul');
  }

  function set_section_color(color) {
    out.parent().addClass(color)
  }

  function end_section() {
    out = sections.pop();
  }

  function log(msg) {
    out.append('<li>' + msg + '</li>');
  }

  function header(msg, color) {
    color = color || '';
    header_el.html('<span class="' + color + '"><i class="fa"></i>' + msg
      + '</span>');
  }

  function error(e) {
    var msg;
    if (typeof e === "string") {
      console.log(e);
      msg = e;
    } else {
      console.log(e.message, e.stack);
      msg = e.message;
    }
    header(msg, 'error');
    throw (e);
  }

  function clear() {
    jQuery(out_id).html('<ul><li class="header"></li></ul>');
    out = jQuery(out_id).find('ul');
    header_el = out.find('.header');
    sections = [];
  }

  function result(color, check, msg, docs) {
    check = check.replace(/`([^`]+)`/g, "<code>$1</code>");
    if (docs) {
      docs = '<a class="info fa" title="Read more" href="' + docs
        + '" rel="external"></a>';
    } else {
      docs = '';
    }
    if (msg) {
      start_section('check', check + docs);
      msg = msg.replace(/`([^`]+)`/g, "<code>$1</code>");
      forall(msg.split(/\n/), function(line) {
        out.append('<li class="status ' + color
          + '"><i class="dot"></i><span class="msg">' + line + '</span></li>');
      });
      set_section_color(color);
      end_section();
    } else {
      out.append('<li class="status ' + color
        + '"><i class="dot"></i><span class="check">' + check + docs
        + '</span></li>');
    }
  }

  clear();

  return {
    clear : clear,
    log : log,
    error : error,
    header : header,
    result : result,
    start_section : start_section,
    end_section : end_section,
    set_section_color : set_section_color
  };

}
