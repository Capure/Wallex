/*
 * Copyright 2018 Robin Andersson <me@robinwassen.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const os = require('os');
const bindings = require('bindings');

exports.attachWindow = function(window, offsetX, offsetY, width, height) {
  switch (os.platform()) {
    case 'win32':
      bindings('electron-wallpaper').attachWindow(window.getNativeWindowHandle(), offsetX, offsetY, width, height);
      break;
    default:
      throw new Error('Platform not supported.');
  }
};
