"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _electron = require("electron");

var _electronWallpaper = _interopRequireDefault(require("../electronWallpaper"));

var _path = _interopRequireDefault(require("path"));

var _fs = _interopRequireDefault(require("fs"));

var Wallex = /*#__PURE__*/function () {
  // This is used for changing wallpapers
  // Same as above
  function Wallex() {
    var _this = this;

    (0, _classCallCheck2["default"])(this, Wallex);
    (0, _defineProperty2["default"])(this, "wallpaperWindows", []);
    (0, _defineProperty2["default"])(this, "tray", null);
    (0, _defineProperty2["default"])(this, "screens", null);
    (0, _defineProperty2["default"])(this, "currentScreen", null);
    (0, _defineProperty2["default"])(this, "currentScreenIdx", null);
    (0, _defineProperty2["default"])(this, "pathToData", _electron.app.getPath('userData'));
    (0, _defineProperty2["default"])(this, "pathsToWallpapers", []);
    this.loadWallpapers(); // Initial wallpaper load

    _electron.app.on('ready', function () {
      _this.screens = _electron.screen.getAllDisplays().sort(function (a, b) {
        return a.bounds.x - b.bounds.x;
      }); // Electron can't into multi display setups

      _this.createTray();
    });

    _electron.app.on('window-all-closed', function () {}); // Overwrites the default exit behaviour

  }

  (0, _createClass2["default"])(Wallex, [{
    key: "loadWallpapers",
    value: function loadWallpapers() {
      var _this2 = this;

      try {
        var dirRaw = _fs["default"].readdirSync(_path["default"].join(this.pathToData, 'wallpapers'), {
          withFileTypes: true
        });

        dirRaw.forEach(function (dir) {
          if (!dir.isDirectory()) {
            return;
          }

          _this2.pathsToWallpapers.push({
            path: _path["default"].join(_this2.pathToData, 'wallpapers', dir.name, 'index.html'),
            name: dir.name
          });
        });
      } catch (_unused) {
        _fs["default"].mkdirSync(_path["default"].join(this.pathToData, 'wallpapers'));
      }
    }
  }, {
    key: "getOffsetX",
    value: function getOffsetX() {
      if (!this.currentScreen || this.currentScreenIdx === null || !this.screens) {
        throw Error("Current screen is unset!");
      }

      if (this.currentScreenIdx === 0) {
        return 0;
      } else {
        var screensToTheLeft = this.screens.slice(0, this.currentScreenIdx);
        return screensToTheLeft.reduce(function (sum, item) {
          return sum + item.bounds.width;
        }, 0); // My trial and error approach to windows positioning system
        // It sums the width of all the monitors to the left
        // This based on my system where x is:
        // - according to electron: -1920, 0, 2560
        // - according to windows: 0, 1920, 4440
        // So I assume that windows is the one to go with
      }
    }
  }, {
    key: "destroyWallpaper",
    value: function destroyWallpaper(idx) {
      if (this.wallpaperWindows[idx]) {
        this.wallpaperWindows[idx].close();
        this.wallpaperWindows = this.wallpaperWindows.filter(function (_, index) {
          return index !== idx;
        });
      }
    }
  }, {
    key: "createWallpaperWindow",
    value: function createWallpaperWindow(pathToWallpaper) {
      if (!this.currentScreen || this.currentScreenIdx === null || !this.screens) {
        throw Error("Current screen is unset!");
      }

      this.wallpaperWindows[this.currentScreenIdx] = new _electron.BrowserWindow({
        width: 1000,
        // Initial value cuz electron || windows (I don't know what's the problem at this point)
        height: 1000,
        // Initial value cuz electron || windows (I don't know what's the problem at this point)
        autoHideMenuBar: true,
        frame: false,
        transparent: true,
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false,
          enableRemoteModule: true
        } // 3 fucking lines cuz electron is "SECURE" now
        // The lines above allow node modules in wallpapers

      });
      this.wallpaperWindows[this.currentScreenIdx].loadFile(pathToWallpaper);

      _electronWallpaper["default"].attachWindow(this.wallpaperWindows[this.currentScreenIdx], this.getOffsetX(), // getOffsetX is needed cuz electron can't into multi display setups
      this.currentScreen.bounds.y, this.currentScreen.bounds.width, this.currentScreen.bounds.height);
    }
  }, {
    key: "setCurrentScreen",
    value: function setCurrentScreen(idx, pathToWallpaper) {
      if (!this.screens) {
        throw Error("Screens hasn't been initialized!");
      }

      this.currentScreen = this.screens[idx];
      this.currentScreenIdx = idx;
      this.destroyWallpaper(idx);
      this.createWallpaperWindow(pathToWallpaper);
    }
  }, {
    key: "createTray",
    value: function createTray() {
      var _this3 = this;

      if (!this.screens) {
        throw Error("Screens hasn't been initialized!");
      }

      this.tray = new _electron.Tray(_path["default"].join(__dirname, '../public/logo.png'));

      var ctxMenu = _electron.Menu.buildFromTemplate([].concat((0, _toConsumableArray2["default"])(this.screens.map(function (_, idx) {
        // Displays a submenu for each screen
        return {
          label: "Screen ".concat(idx + 1),
          type: 'submenu',
          submenu: [{
            label: 'Disable',
            type: 'normal',
            click: function click() {
              return _this3.destroyWallpaper(idx);
            }
          }].concat((0, _toConsumableArray2["default"])(_this3.pathsToWallpapers.map(function (item) {
            return {
              label: item.name,
              type: 'normal',
              click: function click() {
                return _this3.setCurrentScreen(idx, item.path);
              }
            };
          })))
        };
      })), [// Allows the user to pick a wallpaper for each screen
      {
        label: 'wallpapers',
        type: 'normal',
        click: function click() {
          // Allows the user to add new wallpapers easily
          _electron.dialog.showOpenDialog({
            title: 'Add your wallpaper',
            defaultPath: _path["default"].join(_this3.pathToData, 'wallpapers'),
            buttonLabel: '-->'
          }).then(function () {
            var _this3$tray;

            _this3.pathsToWallpapers.length = 0;

            _this3.loadWallpapers();

            (_this3$tray = _this3.tray) === null || _this3$tray === void 0 ? void 0 : _this3$tray.destroy();

            _this3.createTray();
          }); // Refreshes the wallpaper list

        }
      }, {
        label: 'quit',
        type: 'normal',
        click: function click() {
          _this3.wallpaperWindows.map(function (_, idx) {
            return _this3.destroyWallpaper(idx);
          }); // Kills all the wallpapers so that user isn't stuck with them


          _electron.app.quit();
        }
      }]));

      this.tray.setToolTip('Wallex');
      this.tray.setContextMenu(ctxMenu);
    }
  }]);
  return Wallex;
}();

new Wallex(); // Starts the application
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC50cyJdLCJuYW1lcyI6WyJXYWxsZXgiLCJhcHAiLCJnZXRQYXRoIiwibG9hZFdhbGxwYXBlcnMiLCJvbiIsInNjcmVlbnMiLCJzY3JlZW4iLCJnZXRBbGxEaXNwbGF5cyIsInNvcnQiLCJhIiwiYiIsImJvdW5kcyIsIngiLCJjcmVhdGVUcmF5IiwiZGlyUmF3IiwiZnMiLCJyZWFkZGlyU3luYyIsInBhdGgiLCJqb2luIiwicGF0aFRvRGF0YSIsIndpdGhGaWxlVHlwZXMiLCJmb3JFYWNoIiwiZGlyIiwiaXNEaXJlY3RvcnkiLCJwYXRoc1RvV2FsbHBhcGVycyIsInB1c2giLCJuYW1lIiwibWtkaXJTeW5jIiwiY3VycmVudFNjcmVlbiIsImN1cnJlbnRTY3JlZW5JZHgiLCJFcnJvciIsInNjcmVlbnNUb1RoZUxlZnQiLCJzbGljZSIsInJlZHVjZSIsInN1bSIsIml0ZW0iLCJ3aWR0aCIsImlkeCIsIndhbGxwYXBlcldpbmRvd3MiLCJjbG9zZSIsImZpbHRlciIsIl8iLCJpbmRleCIsInBhdGhUb1dhbGxwYXBlciIsIkJyb3dzZXJXaW5kb3ciLCJoZWlnaHQiLCJhdXRvSGlkZU1lbnVCYXIiLCJmcmFtZSIsInRyYW5zcGFyZW50Iiwid2ViUHJlZmVyZW5jZXMiLCJub2RlSW50ZWdyYXRpb24iLCJjb250ZXh0SXNvbGF0aW9uIiwiZW5hYmxlUmVtb3RlTW9kdWxlIiwibG9hZEZpbGUiLCJlbGVjdHJvbldhbGxwYXBlciIsImF0dGFjaFdpbmRvdyIsImdldE9mZnNldFgiLCJ5IiwiZGVzdHJveVdhbGxwYXBlciIsImNyZWF0ZVdhbGxwYXBlcldpbmRvdyIsInRyYXkiLCJUcmF5IiwiX19kaXJuYW1lIiwiY3R4TWVudSIsIk1lbnUiLCJidWlsZEZyb21UZW1wbGF0ZSIsIm1hcCIsImxhYmVsIiwidHlwZSIsInN1Ym1lbnUiLCJjbGljayIsInNldEN1cnJlbnRTY3JlZW4iLCJkaWFsb2ciLCJzaG93T3BlbkRpYWxvZyIsInRpdGxlIiwiZGVmYXVsdFBhdGgiLCJidXR0b25MYWJlbCIsInRoZW4iLCJsZW5ndGgiLCJkZXN0cm95IiwicXVpdCIsInNldFRvb2xUaXAiLCJzZXRDb250ZXh0TWVudSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQUE7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0lBR01BLE07QUFJbUQ7QUFDUDtBQUloRCxvQkFBYztBQUFBOztBQUFBO0FBQUEsK0RBUjhCLEVBUTlCO0FBQUEsbURBUGMsSUFPZDtBQUFBLHNEQU4rQixJQU0vQjtBQUFBLDREQUxtQyxJQUtuQztBQUFBLCtEQUo0QixJQUk1QjtBQUFBLHlEQUhnQkMsY0FBSUMsT0FBSixDQUFZLFVBQVosQ0FHaEI7QUFBQSxnRUFGMkIsRUFFM0I7QUFDWixTQUFLQyxjQUFMLEdBRFksQ0FDVzs7QUFDdkJGLGtCQUFJRyxFQUFKLENBQU8sT0FBUCxFQUFnQixZQUFNO0FBQ3BCLE1BQUEsS0FBSSxDQUFDQyxPQUFMLEdBQWVDLGlCQUFPQyxjQUFQLEdBQXdCQyxJQUF4QixDQUE2QixVQUFDQyxDQUFELEVBQUlDLENBQUo7QUFBQSxlQUFVRCxDQUFDLENBQUNFLE1BQUYsQ0FBU0MsQ0FBVCxHQUFhRixDQUFDLENBQUNDLE1BQUYsQ0FBU0MsQ0FBaEM7QUFBQSxPQUE3QixDQUFmLENBRG9CLENBQzREOztBQUNoRixNQUFBLEtBQUksQ0FBQ0MsVUFBTDtBQUNELEtBSEQ7O0FBSUFaLGtCQUFJRyxFQUFKLENBQU8sbUJBQVAsRUFBNEIsWUFBTSxDQUFFLENBQXBDLEVBTlksQ0FNMkI7O0FBQ3hDOzs7O1dBRUQsMEJBQXdCO0FBQUE7O0FBQ3RCLFVBQUk7QUFDRixZQUFNVSxNQUFNLEdBQUdDLGVBQUdDLFdBQUgsQ0FBZUMsaUJBQUtDLElBQUwsQ0FBVSxLQUFLQyxVQUFmLEVBQTJCLFlBQTNCLENBQWYsRUFBeUQ7QUFBRUMsVUFBQUEsYUFBYSxFQUFFO0FBQWpCLFNBQXpELENBQWY7O0FBQ0FOLFFBQUFBLE1BQU0sQ0FBQ08sT0FBUCxDQUFlLFVBQUNDLEdBQUQsRUFBb0I7QUFD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QUEsTUFBSSxDQUFDaEMsZ0JBQUwsQ0FBc0I0QixHQUF0QixDQUEwQixVQUFDekIsQ0FBRCxFQUFJSixHQUFKO0FBQUEsbUJBQVksTUFBSSxDQUFDcUIsZ0JBQUwsQ0FBc0JyQixHQUF0QixDQUFaO0FBQUEsV0FBMUIsRUFENEMsQ0FDdUI7OztBQUNuRXBDLHdCQUFJK0UsSUFBSjtBQUNEO0FBSEQsT0FaYyxHQUFoQjs7QUFpQkEsV0FBS3BCLElBQUwsQ0FBVXFCLFVBQVYsQ0FBcUIsUUFBckI7QUFDQSxXQUFLckIsSUFBTCxDQUFVc0IsY0FBVixDQUF5Qm5CLE9BQXpCO0FBQ0Q7Ozs7O0FBR0gsSUFBSS9ELE1BQUosRyxDQUFjIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHthcHAsIE1lbnUsIFRyYXksIEJyb3dzZXJXaW5kb3csIHNjcmVlbiwgTWVudUl0ZW1Db25zdHJ1Y3Rvck9wdGlvbnMsIGRpYWxvZ30gZnJvbSAnZWxlY3Ryb24nO1xyXG5pbXBvcnQgZWxlY3Ryb25XYWxscGFwZXIgZnJvbSAnLi4vZWxlY3Ryb25XYWxscGFwZXInO1xyXG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcclxuaW1wb3J0IGZzIGZyb20gJ2ZzJztcclxuaW1wb3J0IHsgV2FsbHBhcGVyIH0gZnJvbSAnLi9pbnRlcmZhY2VzL3dhbGxwYXBlcic7XHJcblxyXG5jbGFzcyBXYWxsZXgge1xyXG4gIHByaXZhdGUgd2FsbHBhcGVyV2luZG93czogQnJvd3NlcldpbmRvd1tdID0gW107XHJcbiAgcHJpdmF0ZSB0cmF5OiBUcmF5IHwgbnVsbCA9IG51bGw7XHJcbiAgcHJpdmF0ZSBzY3JlZW5zOiBFbGVjdHJvbi5EaXNwbGF5W10gfCBudWxsID0gbnVsbDtcclxuICBwcml2YXRlIGN1cnJlbnRTY3JlZW46IEVsZWN0cm9uLkRpc3BsYXkgfCBudWxsID0gbnVsbDsgLy8gVGhpcyBpcyB1c2VkIGZvciBjaGFuZ2luZyB3YWxscGFwZXJzXHJcbiAgcHJpdmF0ZSBjdXJyZW50U2NyZWVuSWR4OiBudW1iZXIgfCBudWxsID0gbnVsbDsgLy8gU2FtZSBhcyBhYm92ZVxyXG4gIHByaXZhdGUgcmVhZG9ubHkgcGF0aFRvRGF0YSA9IGFwcC5nZXRQYXRoKCd1c2VyRGF0YScpO1xyXG4gIHByaXZhdGUgcGF0aHNUb1dhbGxwYXBlcnM6IFdhbGxwYXBlcltdID0gW107XHJcblxyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgdGhpcy5sb2FkV2FsbHBhcGVycygpOyAvLyBJbml0aWFsIHdhbGxwYXBlciBsb2FkXHJcbiAgICBhcHAub24oJ3JlYWR5JywgKCkgPT4ge1xyXG4gICAgICB0aGlzLnNjcmVlbnMgPSBzY3JlZW4uZ2V0QWxsRGlzcGxheXMoKS5zb3J0KChhLCBiKSA9PiBhLmJvdW5kcy54IC0gYi5ib3VuZHMueCk7IC8vIEVsZWN0cm9uIGNhbid0IGludG8gbXVsdGkgZGlzcGxheSBzZXR1cHNcclxuICAgICAgdGhpcy5jcmVhdGVUcmF5KCk7XHJcbiAgICB9KTtcclxuICAgIGFwcC5vbignd2luZG93LWFsbC1jbG9zZWQnLCAoKSA9PiB7fSk7IC8vIE92ZXJ3cml0ZXMgdGhlIGRlZmF1bHQgZXhpdCBiZWhhdmlvdXJcclxuICB9XHJcblxyXG4gIHByaXZhdGUgbG9hZFdhbGxwYXBlcnMoKXtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IGRpclJhdyA9IGZzLnJlYWRkaXJTeW5jKHBhdGguam9pbih0aGlzLnBhdGhUb0RhdGEsICd3YWxscGFwZXJzJyksIHsgd2l0aEZpbGVUeXBlczogdHJ1ZSB9KTtcclxuICAgICAgZGlyUmF3LmZvckVhY2goKGRpcjogZnMuRGlyZW50KSA9PiB7XHJcbiAgICAgICAgaWYgKCFkaXIuaXNEaXJlY3RvcnkoKSkge1xyXG4gICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLnBhdGhzVG9XYWxscGFwZXJzLnB1c2goe3BhdGg6IHBhdGguam9pbih0aGlzLnBhdGhUb0RhdGEsICd3YWxscGFwZXJzJywgZGlyLm5hbWUsICdpbmRleC5odG1sJyksIG5hbWU6IGRpci5uYW1lfSk7XHJcbiAgICAgIH0pO1xyXG4gICAgfSBjYXRjaCB7XHJcbiAgICAgIGZzLm1rZGlyU3luYyhwYXRoLmpvaW4odGhpcy5wYXRoVG9EYXRhLCAnd2FsbHBhcGVycycpKTtcclxuICAgIH1cclxuICB9XHJcblxyXG5cclxuICBwcml2YXRlIGdldE9mZnNldFgoKSB7XHJcbiAgICBpZiAoIXRoaXMuY3VycmVudFNjcmVlbiB8fCB0aGlzLmN1cnJlbnRTY3JlZW5JZHggPT09IG51bGwgfHwgIXRoaXMuc2NyZWVucykge1xyXG4gICAgICB0aHJvdyBFcnJvcihcIkN1cnJlbnQgc2NyZWVuIGlzIHVuc2V0IVwiKTtcclxuICAgIH1cclxuICAgIGlmICh0aGlzLmN1cnJlbnRTY3JlZW5JZHggPT09IDApIHtcclxuICAgICAgcmV0dXJuIDA7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBjb25zdCBzY3JlZW5zVG9UaGVMZWZ0ID0gdGhpcy5zY3JlZW5zLnNsaWNlKDAsIHRoaXMuY3VycmVudFNjcmVlbklkeCk7XHJcbiAgICAgIHJldHVybiBzY3JlZW5zVG9UaGVMZWZ0LnJlZHVjZSgoc3VtLCBpdGVtKSA9PiBzdW0gKyBpdGVtLmJvdW5kcy53aWR0aCwgMCk7IC8vIE15IHRyaWFsIGFuZCBlcnJvciBhcHByb2FjaCB0byB3aW5kb3dzIHBvc2l0aW9uaW5nIHN5c3RlbVxyXG4gICAgICAvLyBJdCBzdW1zIHRoZSB3aWR0aCBvZiBhbGwgdGhlIG1vbml0b3JzIHRvIHRoZSBsZWZ0XHJcbiAgICAgIC8vIFRoaXMgYmFzZWQgb24gbXkgc3lzdGVtIHdoZXJlIHggaXM6XHJcbiAgICAgIC8vIC0gYWNjb3JkaW5nIHRvIGVsZWN0cm9uOiAtMTkyMCwgMCwgMjU2MFxyXG4gICAgICAvLyAtIGFjY29yZGluZyB0byB3aW5kb3dzOiAwLCAxOTIwLCA0NDQwXHJcbiAgICAgIC8vIFNvIEkgYXNzdW1lIHRoYXQgd2luZG93cyBpcyB0aGUgb25lIHRvIGdvIHdpdGhcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHByaXZhdGUgZGVzdHJveVdhbGxwYXBlcihpZHg6IG51bWJlcikge1xyXG4gICAgaWYgKHRoaXMud2FsbHBhcGVyV2luZG93c1tpZHhdKSB7XHJcbiAgICAgIHRoaXMud2FsbHBhcGVyV2luZG93c1tpZHhdLmNsb3NlKCk7XHJcbiAgICAgIHRoaXMud2FsbHBhcGVyV2luZG93cyA9IHRoaXMud2FsbHBhcGVyV2luZG93cy5maWx0ZXIoKF8sIGluZGV4KSA9PiBpbmRleCAhPT0gaWR4KTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHByaXZhdGUgY3JlYXRlV2FsbHBhcGVyV2luZG93KHBhdGhUb1dhbGxwYXBlcjogc3RyaW5nKSB7XHJcbiAgICBpZiAoIXRoaXMuY3VycmVudFNjcmVlbiB8fCB0aGlzLmN1cnJlbnRTY3JlZW5JZHggPT09IG51bGwgfHwgIXRoaXMuc2NyZWVucykge1xyXG4gICAgICB0aHJvdyBFcnJvcihcIkN1cnJlbnQgc2NyZWVuIGlzIHVuc2V0IVwiKTtcclxuICAgIH1cclxuICAgIHRoaXMud2FsbHBhcGVyV2luZG93c1t0aGlzLmN1cnJlbnRTY3JlZW5JZHhdID0gbmV3IEJyb3dzZXJXaW5kb3coe1xyXG4gICAgICB3aWR0aDogMTAwMCwgLy8gSW5pdGlhbCB2YWx1ZSBjdXogZWxlY3Ryb24gfHwgd2luZG93cyAoSSBkb24ndCBrbm93IHdoYXQncyB0aGUgcHJvYmxlbSBhdCB0aGlzIHBvaW50KVxyXG4gICAgICBoZWlnaHQ6IDEwMDAsIC8vIEluaXRpYWwgdmFsdWUgY3V6IGVsZWN0cm9uIHx8IHdpbmRvd3MgKEkgZG9uJ3Qga25vdyB3aGF0J3MgdGhlIHByb2JsZW0gYXQgdGhpcyBwb2ludClcclxuICAgICAgYXV0b0hpZGVNZW51QmFyOiB0cnVlLFxyXG4gICAgICBmcmFtZTogZmFsc2UsXHJcbiAgICAgIHRyYW5zcGFyZW50OiB0cnVlLFxyXG4gICAgICB3ZWJQcmVmZXJlbmNlczoge1xyXG4gICAgICAgIG5vZGVJbnRlZ3JhdGlvbjogdHJ1ZSxcclxuICAgICAgICBjb250ZXh0SXNvbGF0aW9uOiBmYWxzZSxcclxuICAgICAgICBlbmFibGVSZW1vdGVNb2R1bGU6IHRydWVcclxuICAgICAgfSwgLy8gMyBmdWNraW5nIGxpbmVzIGN1eiBlbGVjdHJvbiBpcyBcIlNFQ1VSRVwiIG5vd1xyXG4gICAgICAvLyBUaGUgbGluZXMgYWJvdmUgYWxsb3cgbm9kZSBtb2R1bGVzIGluIHdhbGxwYXBlcnNcclxuICAgIH0pO1xyXG4gICAgdGhpcy53YWxscGFwZXJXaW5kb3dzW3RoaXMuY3VycmVudFNjcmVlbklkeF0ubG9hZEZpbGUocGF0aFRvV2FsbHBhcGVyKTtcclxuICAgIGVsZWN0cm9uV2FsbHBhcGVyLmF0dGFjaFdpbmRvdyh0aGlzLndhbGxwYXBlcldpbmRvd3NbdGhpcy5jdXJyZW50U2NyZWVuSWR4XSwgdGhpcy5nZXRPZmZzZXRYKCksIC8vIGdldE9mZnNldFggaXMgbmVlZGVkIGN1eiBlbGVjdHJvbiBjYW4ndCBpbnRvIG11bHRpIGRpc3BsYXkgc2V0dXBzXHJcbiAgICAgIHRoaXMuY3VycmVudFNjcmVlbi5ib3VuZHMueSwgdGhpcy5jdXJyZW50U2NyZWVuLmJvdW5kcy53aWR0aCwgdGhpcy5jdXJyZW50U2NyZWVuLmJvdW5kcy5oZWlnaHQpO1xyXG4gIH07XHJcblxyXG4gIHByaXZhdGUgc2V0Q3VycmVudFNjcmVlbihpZHg6IG51bWJlciwgcGF0aFRvV2FsbHBhcGVyOiBzdHJpbmcpIHtcclxuICAgIGlmICghdGhpcy5zY3JlZW5zKSB7XHJcbiAgICAgIHRocm93IEVycm9yKFwiU2NyZWVucyBoYXNuJ3QgYmVlbiBpbml0aWFsaXplZCFcIik7XHJcbiAgICB9XHJcbiAgICB0aGlzLmN1cnJlbnRTY3JlZW4gPSB0aGlzLnNjcmVlbnNbaWR4XTtcclxuICAgIHRoaXMuY3VycmVudFNjcmVlbklkeCA9IGlkeDtcclxuICAgIHRoaXMuZGVzdHJveVdhbGxwYXBlcihpZHgpO1xyXG4gICAgdGhpcy5jcmVhdGVXYWxscGFwZXJXaW5kb3cocGF0aFRvV2FsbHBhcGVyKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgY3JlYXRlVHJheSgpIHtcclxuICAgIGlmICghdGhpcy5zY3JlZW5zKSB7XHJcbiAgICAgIHRocm93IEVycm9yKFwiU2NyZWVucyBoYXNuJ3QgYmVlbiBpbml0aWFsaXplZCFcIik7XHJcbiAgICB9XHJcbiAgICB0aGlzLnRyYXkgPSBuZXcgVHJheShwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vcHVibGljL2xvZ28ucG5nJykpO1xyXG4gICAgY29uc3QgY3R4TWVudSA9IE1lbnUuYnVpbGRGcm9tVGVtcGxhdGUoW1xyXG4gICAgICAuLi4odGhpcy5zY3JlZW5zLm1hcCgoXywgaWR4KTogTWVudUl0ZW1Db25zdHJ1Y3Rvck9wdGlvbnMgPT4geyAvLyBEaXNwbGF5cyBhIHN1Ym1lbnUgZm9yIGVhY2ggc2NyZWVuXHJcbiAgICAgICAgcmV0dXJuIHsgbGFiZWw6IGBTY3JlZW4gJHtpZHgrMX1gLCB0eXBlOiAnc3VibWVudScsIHN1Ym1lbnU6IFtcclxuICAgICAgICAgIHsgbGFiZWw6ICdEaXNhYmxlJywgdHlwZTogJ25vcm1hbCcsIGNsaWNrOiAoKSA9PiB0aGlzLmRlc3Ryb3lXYWxscGFwZXIoaWR4KSB9LCAvLyBBbGxvd3MgdGhlIHVzZXIgdG8gZGlzYWJsZSB0aGUgd2FsbHBhcGVyIG9uIGEgZ2l2ZW4gc2NyZWVuXHJcbiAgICAgICAgICAuLi4odGhpcy5wYXRoc1RvV2FsbHBhcGVycy5tYXAoKGl0ZW0pOiBNZW51SXRlbUNvbnN0cnVjdG9yT3B0aW9ucyA9PiBcclxuICAgICAgICAgICh7IGxhYmVsOiBpdGVtLm5hbWUsIHR5cGU6ICdub3JtYWwnLCBjbGljazogKCkgPT4gdGhpcy5zZXRDdXJyZW50U2NyZWVuKGlkeCwgaXRlbS5wYXRoKSB9KSkpIC8vIFdhbGxwYXBlciBlbnRyeVxyXG4gICAgICAgIF0gfVxyXG4gICAgICB9KSksIC8vIEFsbG93cyB0aGUgdXNlciB0byBwaWNrIGEgd2FsbHBhcGVyIGZvciBlYWNoIHNjcmVlblxyXG4gICAgICB7IGxhYmVsOiAnd2FsbHBhcGVycycsIHR5cGU6ICdub3JtYWwnLCBjbGljazogKCkgPT4geyAvLyBBbGxvd3MgdGhlIHVzZXIgdG8gYWRkIG5ldyB3YWxscGFwZXJzIGVhc2lseVxyXG4gICAgICAgIGRpYWxvZy5zaG93T3BlbkRpYWxvZyh7IHRpdGxlOiAnQWRkIHlvdXIgd2FsbHBhcGVyJywgZGVmYXVsdFBhdGg6IHBhdGguam9pbih0aGlzLnBhdGhUb0RhdGEsICd3YWxscGFwZXJzJyksXHJcbiAgICAgICAgYnV0dG9uTGFiZWw6ICctLT4nIH0pLnRoZW4oKCkgPT4geyB0aGlzLnBhdGhzVG9XYWxscGFwZXJzLmxlbmd0aCA9IDA7IHRoaXMubG9hZFdhbGxwYXBlcnMoKTsgdGhpcy50cmF5Py5kZXN0cm95KCk7IHRoaXMuY3JlYXRlVHJheSgpIH0pOyAvLyBSZWZyZXNoZXMgdGhlIHdhbGxwYXBlciBsaXN0XHJcbiAgICAgIH0gfSxcclxuICAgICAgeyBsYWJlbDogJ3F1aXQnLCB0eXBlOiAnbm9ybWFsJywgY2xpY2s6ICgpID0+IHsgXHJcbiAgICAgICAgdGhpcy53YWxscGFwZXJXaW5kb3dzLm1hcCgoXywgaWR4KSA9PiB0aGlzLmRlc3Ryb3lXYWxscGFwZXIoaWR4KSk7IC8vIEtpbGxzIGFsbCB0aGUgd2FsbHBhcGVycyBzbyB0aGF0IHVzZXIgaXNuJ3Qgc3R1Y2sgd2l0aCB0aGVtXHJcbiAgICAgICAgYXBwLnF1aXQoKTtcclxuICAgICAgfSB9XHJcbiAgICBdKTtcclxuICAgIHRoaXMudHJheS5zZXRUb29sVGlwKCdXYWxsZXgnKTtcclxuICAgIHRoaXMudHJheS5zZXRDb250ZXh0TWVudShjdHhNZW51KTtcclxuICB9XHJcbn1cclxuXHJcbm5ldyBXYWxsZXgoKTsgLy8gU3RhcnRzIHRoZSBhcHBsaWNhdGlvbiJdfQ==