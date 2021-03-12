import {Menu, Tray, MenuItemConstructorOptions, dialog} from 'electron';
import path from 'path';
import EventEmitter from 'events';
import { WallpaperManager } from './wallpaperManager';
import { ScreenManager } from './screenManager';

export class UiManager extends EventEmitter {
  private tray: Tray | null = null;
  private readonly wallpaperManager: WallpaperManager;
  private readonly screenManager: ScreenManager;
  private readonly pathToData: string;
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
      }).then(() => { this.wallpaperManager.reload(), this.tray?.destroy(); this.createTray() });
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
    template.push({ label: 'Quit', click: () => this.emit('quit') });
    this.tray.setContextMenu(Menu.buildFromTemplate(template));
    this.tray.setToolTip("Wallex");
  }
}