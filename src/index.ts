import {app, Menu, Tray, BrowserWindow, screen, MenuItemConstructorOptions} from 'electron';
import electronWallpaper from '../electronWallpaper';
import path from 'path';


app.allowRendererProcessReuse = true;

let wallpaperWindow: null | BrowserWindow;
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

const destroyWallpaper = () => {
  if (wallpaperWindow) {
    wallpaperWindow.close();
    wallpaperWindow = null;
  }
}

const createWallpaperWindow = function() {
  if (!currentScreen || currentScreenIdx === null || !screens) {
    throw Error("Current screen is unset!");
  }
  wallpaperWindow = new BrowserWindow({
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
  wallpaperWindow.loadFile('../public/dashboard.html');
  electronWallpaper.attachWindow(wallpaperWindow, getOffsetX(),
    currentScreen.bounds.y, currentScreen.bounds.width, currentScreen.bounds.height);
};

const setCurrentScreen = (idx: number) => {
  if (!screens) {
    throw Error("Screens hasn't been initialized!");
  }
  currentScreen = screens[idx];
  currentScreenIdx = idx;
  destroyWallpaper();
  createWallpaperWindow();
}

const createTray = () => {
  if (!screens) {
    throw Error("Screens hasn't been initialized!");
  }
  tray = new Tray(path.join(__dirname, '../public/logo.png'));
  const ctxMenu = Menu.buildFromTemplate([
    { label: 'display', type: 'submenu', submenu: [
      ...(screens.map((_, idx): MenuItemConstructorOptions => ({
        label: idx.toString(),
        type: 'normal',
        click: () => setCurrentScreen(idx)
      })))
    ] }, // This creates a menu entry for every monitor available in the system. TODO: allow multiply monitors
    { label: 'quit', type: 'normal', click: () => { destroyWallpaper(); app.quit() } }
  ]);
  tray.setToolTip('Wallex');
  tray.setContextMenu(ctxMenu);
}


app.on('ready', () => {
  screens = screen.getAllDisplays().sort((a, b) => a.bounds.x - b.bounds.x); // Electron can't into multi display setups
  createTray();
});

app.on('window-all-closed', () => {}); // Overwrites the default exit behaviour