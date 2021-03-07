import {app, Menu, Tray, BrowserWindow, screen, MenuItemConstructorOptions, dialog} from 'electron';
import electronWallpaper from '../electronWallpaper';
import path from 'path';
import fs from 'fs';
import { Wallpaper } from './interfaces/wallpaper';

class Wallex {
  private wallpaperWindows: BrowserWindow[] = [];
  private tray: Tray | null = null;
  private screens: Electron.Display[] | null = null;
  private currentScreen: Electron.Display | null = null; // This is used for changing wallpapers
  private currentScreenIdx: number | null = null; // Same as above
  private readonly pathToData = app.getPath('userData');
  private pathsToWallpapers: Wallpaper[] = [];

  constructor() {
    this.loadWallpapers(); // Initial wallpaper load
    app.on('ready', () => {
      this.screens = screen.getAllDisplays().sort((a, b) => a.bounds.x - b.bounds.x); // Electron can't into multi display setups
      this.createTray();
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
      // This based on my system where x is:
      // - according to electron: -1920, 0, 2560
      // - according to windows: 0, 1920, 4440
      // So I assume that windows is the one to go with
    }
  }

  private destroyWallpaper(idx: number) {
    if (this.wallpaperWindows[idx]) {
      this.wallpaperWindows[idx].close();
      this.wallpaperWindows = this.wallpaperWindows.filter((_, index) => index !== idx);
    }
  }

  private createWallpaperWindow(pathToWallpaper: string) {
    if (!this.currentScreen || this.currentScreenIdx === null || !this.screens) {
      throw Error("Current screen is unset!");
    }
    this.wallpaperWindows[this.currentScreenIdx] = new BrowserWindow({
      width: 1000, // Initial value cuz electron || windows (I don't know what's the problem at this point)
      height: 1000, // Initial value cuz electron || windows (I don't know what's the problem at this point)
      autoHideMenuBar: true,
      frame: false,
      transparent: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true
      }, // 3 fucking lines cuz electron is "SECURE" now
      // The lines above allow node modules in wallpapers
    });
    this.wallpaperWindows[this.currentScreenIdx].loadFile(pathToWallpaper);
    electronWallpaper.attachWindow(this.wallpaperWindows[this.currentScreenIdx], this.getOffsetX(), // getOffsetX is needed cuz electron can't into multi display setups
      this.currentScreen.bounds.y, this.currentScreen.bounds.width, this.currentScreen.bounds.height);
  };

  private setCurrentScreen(idx: number, pathToWallpaper: string) {
    if (!this.screens) {
      throw Error("Screens hasn't been initialized!");
    }
    this.currentScreen = this.screens[idx];
    this.currentScreenIdx = idx;
    this.destroyWallpaper(idx);
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
          { label: 'Disable', type: 'normal', click: () => this.destroyWallpaper(idx) }, // Allows the user to disable the wallpaper on a given screen
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