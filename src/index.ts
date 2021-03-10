import {app, Menu, Tray, BrowserWindow, screen, MenuItemConstructorOptions, dialog} from 'electron';
import electronWallpaper from '../electronWallpaper';
import path from 'path';
import fs from 'fs';
import { Wallpaper } from './interfaces/wallpaper';
import { loadProject } from './utils/loadProject';
import { loadSettings } from './utils/loadSettings';
import { updateSettings } from './utils/updateSettings';

class Wallex {
  private wallpaperWindows: BrowserWindow[] = [];
  private tray: Tray | null = null;
  private screens: Electron.Display[] | null = null;
  private currentScreen: Electron.Display | null = null; // This is used for changing wallpapers
  private currentScreenIdx: number | null = null; // Same as above
  private readonly pathToData = app.getPath('userData');
  private pathsToWallpapers: Wallpaper[] = [];
  private settings = loadSettings(this.pathToData);

  constructor() {
    this.loadWallpapers(); // Initial wallpaper load
    app.on('ready', () => {
      this.screens = screen.getAllDisplays().sort((a, b) => a.bounds.x - b.bounds.x); // Electron can't into multi display setups
      this.createTray();
      this.settings.prevWallpapers.forEach(wallpaper => {
        if (wallpaper.displayIdx !== undefined && this.screens && wallpaper.displayIdx < this.screens.length) {
          this.setCurrentScreen(wallpaper.displayIdx, wallpaper.path);
        }
      });
    });
    app.on('window-all-closed', () => {}); // Overwrites the default exit behaviour
  }

  private loadWallpapers(){
    try {
      const dirRaw = fs.readdirSync(path.join(this.pathToData, 'wallpapers'), { withFileTypes: true });
      dirRaw.forEach((dir: fs.Dirent) => {
        if (!dir.isDirectory()) {
          return;
        }
        this.pathsToWallpapers.push({path: path.join(this.pathToData, 'wallpapers', dir.name, 'index.html'), name: dir.name});
      });
    } catch {
      fs.mkdirSync(path.join(this.pathToData, 'wallpapers'));
    }
  }


  private getOffsetX() {
    if (!this.currentScreen || this.currentScreenIdx === null || !this.screens) {
      throw Error("Current screen is unset!");
    }
    if (this.currentScreenIdx === 0) {
      return 0;
    } else {
      const screensToTheLeft = this.screens.slice(0, this.currentScreenIdx);
      return screensToTheLeft.reduce((sum, item) => sum + item.bounds.width, 0); // My trial and error approach to windows positioning system
      // It sums the width of all the monitors to the left
      // This is based on my system where x is:
      // - according to electron: -1920, 0, 2560
      // - according to windows: 0, 1920, 4440
      // So I assume that windows is the one to go with
    }
  }

  private updatePrevWallpaper(idx: number, newWallpaper?: Wallpaper) {
      updateSettings(this.pathToData,
        {...this.settings,
          ...{ prevWallpapers: [...this.settings.prevWallpapers.filter(wallpaper =>
            wallpaper.displayIdx !== idx), ...(newWallpaper ? [newWallpaper] : [])] }});
      this.settings = loadSettings(this.pathToData);
  }

  private destroyWallpaper(idx: number, deleteFromSettings?: boolean) {
    if (this.wallpaperWindows[idx]) {
      this.wallpaperWindows[idx].close();
      this.wallpaperWindows = this.wallpaperWindows.filter((_, index) => index !== idx);
      if (deleteFromSettings) { this.updatePrevWallpaper(idx) }
    }
  }

  private createWallpaperWindow(pathToWallpaper: string) {
    if (!this.currentScreen || this.currentScreenIdx === null || !this.screens) {
      throw Error("Current screen is unset!");
    }
    const project = loadProject(pathToWallpaper);
    if (project) {
      if (JSON.parse(project).type !== "web") {
        dialog.showMessageBox({ title: 'Not impemented!', message: 'The wallpaper must be of type "web"!' });
        return;
      }
    }
    this.wallpaperWindows[this.currentScreenIdx] = new BrowserWindow({
      width: 1000, // Initial value cuz electron || windows (I don't know what's the problem at this point)
      height: 1000, // Initial value cuz electron || windows (I don't know what's the problem at this point)
      autoHideMenuBar: true,
      frame: false,
      transparent: true,
      webPreferences: {
        preload: path.join(__dirname, '..', 'public', 'preload.js'),
        contextIsolation: false,
        enableRemoteModule: true
      }
      // The lines above enable the wallpaper engine emulation
    });
    this.wallpaperWindows[this.currentScreenIdx].loadFile(pathToWallpaper)
    if (project) {
      this.wallpaperWindows[this.currentScreenIdx].webContents.executeJavaScript(`window.project = JSON.parse(${JSON.stringify(project)})`);
      // Injects the project config
    } else {
      this.wallpaperWindows[this.currentScreenIdx].webContents.executeJavaScript(`window.noproject = true`);
      // Stops the interval if there is no config
    }
    const jsOffsetX = this.screens[this.currentScreenIdx].bounds.x; // Electron offset != winapi
    const jsOffsetY = this.screens[this.currentScreenIdx].bounds.y; // Electron offset != winapi
    // this.wallpaperWindows[this.currentScreenIdx].webContents.executeJavaScript(`window.jsOffsetX = ${jsOffsetX}; window.jsOffsetY = ${jsOffsetY}`); // allows the preload to translate mouse events
    this.wallpaperWindows[this.currentScreenIdx].webContents.executeJavaScript(`const e = new Event('offsetLoaded'); e.jsOffsetX = ${jsOffsetX}; e.jsOffsetY = ${jsOffsetY}; window.dispatchEvent(e)`);
    electronWallpaper.attachWindow(this.wallpaperWindows[this.currentScreenIdx], this.getOffsetX(), // getOffsetX is needed cuz electron can't into multi display setups
      this.currentScreen.bounds.y, this.currentScreen.bounds.width, this.currentScreen.bounds.height);
    this.updatePrevWallpaper(this.currentScreenIdx,
      { name: "undefined", path: pathToWallpaper, displayIdx: this.currentScreenIdx });
    this.wallpaperWindows[this.currentScreenIdx].webContents.openDevTools({ mode: 'detach' });
  };

  private setCurrentScreen(idx: number, pathToWallpaper: string) {
    if (!this.screens) {
      throw Error("Screens hasn't been initialized!");
    }
    this.currentScreen = this.screens[idx];
    this.currentScreenIdx = idx;
    this.destroyWallpaper(idx, true);
    this.createWallpaperWindow(pathToWallpaper);
  }

  private createTray() {
    if (!this.screens) {
      throw Error("Screens hasn't been initialized!");
    }
    this.tray = new Tray(path.join(__dirname, '../public/logo.png'));
    const ctxMenu = Menu.buildFromTemplate([
      ...(this.screens.map((_, idx): MenuItemConstructorOptions => { // Displays a submenu for each screen
        return { label: `Screen ${idx+1}`, type: 'submenu', submenu: [
          { label: 'Disable', type: 'normal', click: () => this.destroyWallpaper(idx, true) }, // Allows the user to disable the wallpaper on a given screen
          ...(this.pathsToWallpapers.map((item): MenuItemConstructorOptions => 
          ({ label: item.name, type: 'normal', click: () => this.setCurrentScreen(idx, item.path) }))) // Wallpaper entry
        ] }
      })), // Allows the user to pick a wallpaper for each screen
      { label: 'wallpapers', type: 'normal', click: () => { // Allows the user to add new wallpapers easily
        dialog.showOpenDialog({ title: 'Add your wallpaper', defaultPath: path.join(this.pathToData, 'wallpapers'),
        buttonLabel: '-->' }).then(() => { this.pathsToWallpapers.length = 0; this.loadWallpapers(); this.tray?.destroy(); this.createTray() }); // Refreshes the wallpaper list
      } },
      { label: 'quit', type: 'normal', click: () => { 
        this.wallpaperWindows.map((_, idx) => this.destroyWallpaper(idx)); // Kills all the wallpapers so that user isn't stuck with them
        app.quit();
      } }
    ]);
    this.tray.setToolTip('Wallex');
    this.tray.setContextMenu(ctxMenu);
  }
}

new Wallex(); // Starts the application