import {app, Menu, Tray, BrowserWindow, screen, MenuItemConstructorOptions} from 'electron';
import electronWallpaper from '../electronWallpaper';
import path from 'path';


app.allowRendererProcessReuse = true;

let wallpaperWindows: BrowserWindow[] = [];
let tray: Tray | null;
let currentScreen: Electron.Display | null;
let currentScreenIdx: number | null;

let screens: Electron.Display[] | null;

const getOffsetX = () => {
  if (!currentScreen || currentScreenIdx === null || !screens) {
    throw Error("Current screen is unset!");
  }
  if (currentScreenIdx === 0) {
    return 0;
  } else {
    const screensToTheLeft = screens.slice(0, currentScreenIdx);
    return screensToTheLeft.reduce((sum, item) => sum + item.bounds.width, 0); // My trial and error approach to windows positioning system
  }
}

const destroyWallpaper = (idx: number) => {
  if (wallpaperWindows[idx]) {
    wallpaperWindows[idx].close();
    wallpaperWindows = wallpaperWindows.filter((_, index) => index !== idx);
  }
}

const createWallpaperWindow = function() {
  if (!currentScreen || currentScreenIdx === null || !screens) {
    throw Error("Current screen is unset!");
  }
  wallpaperWindows[currentScreenIdx] = new BrowserWindow({
    width: 1000, // Initial value cuz electron || windows (I don't know what's the problem at this point)
    height: 1000, // Initial value cuz electron || windows (I don't know what's the problem at this point)
    autoHideMenuBar: true,
    frame: false,
    transparent: true,
    // webPreferences: {
    //   nodeIntegration: true,
    //   contextIsolation: false,
    //   enableRemoteModule: true
    // }, // 3 fucking lines cuz electron is "SECURE" now
    // The lines above allow node modules in wallpapers
  });
  wallpaperWindows[currentScreenIdx].loadFile('../public/dashboard.html');
  electronWallpaper.attachWindow(wallpaperWindows[currentScreenIdx], getOffsetX(),
    currentScreen.bounds.y, currentScreen.bounds.width, currentScreen.bounds.height);
};

const setCurrentScreen = (idx: number) => {
  if (!screens) {
    throw Error("Screens hasn't been initialized!");
  }
  currentScreen = screens[idx];
  currentScreenIdx = idx;
  destroyWallpaper(idx);
  createWallpaperWindow();
}

const createTray = () => {
  if (!screens) {
    throw Error("Screens hasn't been initialized!");
  }
  tray = new Tray(path.join(__dirname, '../public/logo.png'));
  const ctxMenu = Menu.buildFromTemplate([
    // { label: 'display', type: 'submenu', submenu: [
    //   ...(screens.map((_, idx): MenuItemConstructorOptions => ({
    //     label: idx.toString(),
    //     type: 'normal',
    //     click: () => setCurrentScreen(idx)
    //   })))
    // ] }, // This creates a menu entry for every monitor available in the system. TODO: allow multiply monitors
    ...(screens.map((_, idx): MenuItemConstructorOptions => {
      return { label: `Screen ${idx+1}`, type: 'submenu', submenu: [
        { label: 'Disable', type: 'normal', click: () => destroyWallpaper(idx) },
        { label: 'Default', type: 'normal', click: () => setCurrentScreen(idx) }
      ] }
    })),
    { label: 'quit', type: 'normal', click: () => { 
      wallpaperWindows.map((_, idx) => destroyWallpaper(idx));
      app.quit();
    } }
  ]);
  tray.setToolTip('Wallex');
  tray.setContextMenu(ctxMenu);
}


app.on('ready', () => {
  screens = screen.getAllDisplays().sort((a, b) => a.bounds.x - b.bounds.x); // Electron can't into multi display setups
  createTray();
});

app.on('window-all-closed', () => {}); // Overwrites the default exit behaviour