import {Menu, Tray, MenuItemConstructorOptions, dialog, BrowserWindow, ipcMain} from 'electron';
import path from 'path';
import EventEmitter from 'events';
import { WallpaperManager } from './wallpaperManager';
import { ScreenManager } from './screenManager';

export class UiManager extends EventEmitter {
  private tray: Tray | null = null;
  private readonly wallpaperManager: WallpaperManager;
  private readonly screenManager: ScreenManager;
  private readonly pathToData: string;
  private settingsWindow: BrowserWindow | null = null;
  constructor(wallpaperManager: WallpaperManager, screenManager: ScreenManager, pathToData: string) {
    super();
    this.wallpaperManager = wallpaperManager;
    this.screenManager = screenManager;
    this.pathToData = pathToData;
    this.createTray();
  }
  private openWallpapersFolder = () => {
      dialog.showOpenDialog({
        title: 'Add your wallpaper',
        defaultPath: path.join(this.pathToData, 'wallpapers')
      }).then(() => { this.reloadWallpaper(true), this.tray?.destroy(); this.createTray() });
  }
  private reloadWallpaper(reloadManager?: boolean) {
    if (reloadManager) {this.wallpaperManager.reload()}
    const wallpapers = this.wallpaperManager.getWallpapers();
    this.settingsWindow?.webContents.send('loadWallpapers', wallpapers);
    // this.settingsWindow?.webContents.executeJavaScript(`window.wallpapers = JSON.parse(${JSON.stringify(JSON.stringify(wallpapers))})`);
    // this.settingsWindow?.webContents.executeJavaScript(`window.dispatchEvent(new Event("wallpapersLoaded"))`);
  }
  private createTray() {
    this.tray = new Tray(path.join(__dirname, '../public/logo.png'));
    const template: (MenuItemConstructorOptions | Electron.MenuItem)[] = [];
    this.screenManager.getScreens().forEach((screen, screenIdx) => {
      const submenu: MenuItemConstructorOptions[] = [];
      submenu.push({ label: 'Clear', click: () => this.emit('clearWallpaper', screen.id) });
      this.wallpaperManager.getWallpapers().forEach((wallpaper, wallpaperIdx) => {
        submenu.push({ label: wallpaper.name, click: () => this.emit('setWallpaper', {
          wallpaperIdx,
          screenId: screen.id
        }) });
      });
      template.push({ label: `Screen ${screenIdx + 1}`, type: 'submenu', submenu: submenu });
    });
    template.push({ label: 'Wallpapers Folder', click: this.openWallpapersFolder });
    template.push({ label: 'Open settings', click: this.openSettingsWindow });
    template.push({ label: 'Quit', click: () => this.emit('quit') });
    this.tray.setContextMenu(Menu.buildFromTemplate(template));
    this.tray.setToolTip("Wallex");
  }
  private openSettingsWindow = () => {
    if (this.settingsWindow) {
      dialog.showMessageBox({ title: 'Wallex', message: 'The settings window is already open!' });
    } else {
      this.settingsWindow = new BrowserWindow({
        width: 1000, // Initial value
        height: 800, // Initial value
        autoHideMenuBar: true,
        resizable: false,
        fullscreenable: false,
        maximizable: false,
        icon: path.join(__dirname, "..", "public", "icon.ico"),
        webPreferences: {
          nodeIntegration: true,
          enableRemoteModule: true,
          contextIsolation: false
        }
      });
      this.settingsWindow.loadFile(path.join("..", "public", "settings", "index.html"));
      this.settingsWindow.on('close', () => { this.settingsWindow = null });
      this.settingsWindow.webContents.on('dom-ready', () => this.reloadWallpaper());
    }
  }
}