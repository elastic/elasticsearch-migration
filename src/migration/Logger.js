"use strict";

function Logger(log_el,error_el) {
  var out;
  var header_el;
  var sections;

  function start_section(class_name, msg) {
    msg = msg.replace(/`([^`]+)`/g, "<code>$1</code>");
    var new_out = jQuery('<li class="section '
      + class_name
      + '"><span>'
      + msg
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
    header_el.text(msg);
    header_el.attr('class','header '+color);
  }

  function error(e) {
    var msg;
    if (typeof e === "string") {
      console.log(e);
      msg = e;
    } else if (e instanceof ES_Error) {
      msg = e.toString();
      console.log(msg);
    } else {
      console.log(e.message, e.stack);
      msg = e.message;
    }
    error_el.empty().html(msg);
    header("An error occurred", 'error');
    throw (e);
  }

  function clear() {
    error_el.empty();
    log_el.html('<ul><li class="header"></li></ul>');
    out = log_el.find('ul');
    header_el = out.find('.header');
    sections = [];
  }

  function result(color, check, fail, docs) {
    check = check.replace(/`([^`]+)`/g, "<code>$1</code>");
    if (fail.length === 0) {
      color = 'green';
    }
    if (docs) {
      docs = '<a class="info" title="Read more" href="'
        + docs
        + '" target="_blank">&#x2139;</a>';
    } else {
      docs = '';
    }
    if (fail.length > 0) {
      start_section('check', check + docs);
      _.forEach(_.sortedUniq(fail), function(msg) {
        msg = msg.replace(/`([^`]+)`/g, "<code>$1</code>");
        out.append('<li>' + msg + '</li>');
      });
      set_section_color(color);
      end_section();
    } else {
      out.append('<li class="status '
        + color
        + '">'
        + check
        + docs
        + '</li>');
    }
    return color;
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
