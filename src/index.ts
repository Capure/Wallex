import {app, screen} from 'electron';
import { SettingsManager } from './settingsManager';
import { UiManager } from './uiManager';
import { WallpaperManager } from './wallpaperManager';
import { ScreenManager } from './screenManager';
import { BrowserWindowManager } from './browserWindowManager';

class Wallex {
  private readonly screenManager = new ScreenManager();
  private readonly pathToData = app.getPath('userData');
  private readonly wallpaperManager = new WallpaperManager(this.pathToData);
  private browserWindowManager: BrowserWindowManager | null = null;
  private uiManager: UiManager | null = null;
  private settingsManager: SettingsManager | null = null;

  constructor() {
    app.on('ready', () => {
      this.screenManager.init(screen.getAllDisplays());
      this.browserWindowManager = new BrowserWindowManager(this.screenManager);
      this.settingsManager = new SettingsManager(this.pathToData, this.browserWindowManager);
      this.uiManager = new UiManager(this.wallpaperManager, this.screenManager, this.pathToData);
      this.uiManager.on('quit', () => {
        if (this.browserWindowManager) {
          this.browserWindowManager.destroyAll();
        }
        app.quit();
      });
      this.uiManager.on('clearWallpaper', (screenId: number) => {
        if (this.browserWindowManager) {
          this.browserWindowManager.destroyWindowByScreenId(screenId);
        }
      });
      this.uiManager.on('setWallpaper', e => {
        if (this.browserWindowManager) {
          const { wallpaperIdx, screenId } = e;
          const window = this.browserWindowManager.getWindowByScreenId(screenId);
          if (window) {
            this.browserWindowManager.destroyWindowByScreenId(screenId);
          }
          const wallpaper = this.wallpaperManager.getWallpaperByIdx(wallpaperIdx);
          this.settingsManager?.updateWallpaper(screenId, wallpaper);
          this.browserWindowManager.createNewWindow(screenId, wallpaper);
        }
      });
    });
    app.on('window-all-closed', () => {}); // Overwrites the default exit behaviour
  }
}

new Wallex(); // Starts the application