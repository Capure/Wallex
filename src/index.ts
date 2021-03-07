import {app, Menu, Tray, BrowserWindow, screen, MenuItemConstructorOptions, dialog} from 'electron';
import electronWallpaper from '../electronWallpaper';
import path from 'path';
import fs from 'fs';

app.allowRendererProcessReuse = true;

let wallpaperWindows: BrowserWindow[] = [];
let tray: Tray | null;
let currentScreen: Electron.Display | null;
let currentScreenIdx: number | null;

interface Wallpaper {
  path: string,
  name: string
}

let screens: Electron.Display[] | null;
const pathToData = app.getPath('userData');
const pathsToWallpapers: Wallpaper[] = [];

const loadWallpapers = () => {
  try {
    const dirRaw = fs.readdirSync(path.join(pathToData, 'wallpapers'), { withFileTypes: true });
    dirRaw.forEach((dir: fs.Dirent) => {
      if (!dir.isDirectory()) {
        return;
      }
      pathsToWallpapers.push({path: path.join(pathToData, 'wallpapers', dir.name, 'index.html'), name: dir.name});
    });
  } catch {
    fs.mkdirSync(path.join(pathToData, 'wallpapers'));
  }
}

loadWallpapers(); // Initial load

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

const createWallpaperWindow = function(pathToWallpaper: string) {
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
  wallpaperWindows[currentScreenIdx].loadFile(pathToWallpaper);
  electronWallpaper.attachWindow(wallpaperWindows[currentScreenIdx], getOffsetX(),
    currentScreen.bounds.y, currentScreen.bounds.width, currentScreen.bounds.height);
};

const setCurrentScreen = (idx: number, pathToWallpaper: string) => {
  if (!screens) {
    throw Error("Screens hasn't been initialized!");
  }
  currentScreen = screens[idx];
  currentScreenIdx = idx;
  destroyWallpaper(idx);
  createWallpaperWindow(pathToWallpaper);
}

const createTray = () => {
  if (!screens) {
    throw Error("Screens hasn't been initialized!");
  }
  tray = new Tray(path.join(__dirname, '../public/logo.png'));
  const ctxMenu = Menu.buildFromTemplate([
    ...(screens.map((_, idx): MenuItemConstructorOptions => {
      return { label: `Screen ${idx+1}`, type: 'submenu', submenu: [
        { label: 'Disable', type: 'normal', click: () => destroyWallpaper(idx) },
        ...(pathsToWallpapers.map((item): MenuItemConstructorOptions => ({ label: item.name, type: 'normal', click: () => setCurrentScreen(idx, item.path) })))
      ] }
    })), // Allows the user to pick a wallpaper for each screen
    { label: 'wallpapers', type: 'normal', click: () => {
      dialog.showOpenDialog({ title: 'Add your wallpaper', defaultPath: path.join(pathToData, 'wallpapers'),
      buttonLabel: '-->' }).then(() => { pathsToWallpapers.length = 0; loadWallpapers(); tray?.destroy(); createTray() }); // Should refresh the wallpapers
    } },
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