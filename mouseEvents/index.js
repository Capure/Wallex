'use strict';

const os = require('os');
const bindings = require('bindings');

exports.createMouseForwarder = function(window, jsOffsetX, jsOffsetY) {
  switch (os.platform()) {
    case 'win32':
      bindings('wallex-native').createMouseForwarder(window.getNativeWindowHandle(), jsOffsetX, jsOffsetY);
      break;
    default:
      throw new Error('Platform not supported.');
  }
};