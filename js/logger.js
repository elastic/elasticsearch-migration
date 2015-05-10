"use strict";

function Logger(out_id) {
  var out;
  var sections = [];

  jQuery(out_id).html('<ul id="output"></ul>');
  out = jQuery('#output');

  function start_section(msg) {
    out
      .append('<li><span class="section msg">' + msg + '</span><ul></ul></li>');
    sections.push(out);
    out = out.find(':last');
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

  function error(e) {
    console.log(e.message, e.stack);
    while (sections.length) {
      end_section()
    }
    out.append('<p class="error">' + e.message + '</p>');
  }

  function result(color, check, msg) {
    check = check.replace(/`([^`]+)`/g, "<code>$1</code>");
    if (msg) {
      start_section(check);
      msg = msg.replace(/`([^`]+)`/g, "<code>$1</code>");
      forall(msg.split(/\n/), function(line) {
        result(color, line);
      });
      set_section_color(color);
      end_section();
    } else {
      out.append('<li class="' + color + '"><span class="check">' + check
        + '</span></li>');
    }
  }

  return {
    log : log,
    error : error,
    result : result,
    start_section : start_section,
    end_section : end_section,
    set_section_color : set_section_color
  };

}
