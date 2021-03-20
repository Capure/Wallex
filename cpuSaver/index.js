'use strict';

const os = require('os');
const bindings = require('bindings');

exports.attachCpuSaver = function(window, jsOffsetX, jsOffsetY, Width, Height) {
  switch (os.platform()) {
    case 'win32':
      bindings('wallex-native').attachCpuSaver(window.getNativeWindowHandle(), jsOffsetX, jsOffsetY, Width, Height);
      break;
    default:
      throw new Error('Platform not supported.');
  }
};