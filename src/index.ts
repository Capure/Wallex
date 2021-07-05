import { app, screen } from "electron";
import { SettingsManager } from "./settingsManager";
import { UiManager } from "./uiManager";
import { WallpaperManager } from "./wallpaperManager";
import { ScreenManager } from "./screenManager";
import { WindowManager } from "./windowManager";

class Wallex {
  private readonly screenManager = new ScreenManager();
  private readonly pathToData = app.getPath("userData");
  private readonly wallpaperManager = new WallpaperManager(this.pathToData);
  private windowManager: WindowManager | null = null;
  private uiManager: UiManager | null = null;
  private settingsManager: SettingsManager | null = null;

  constructor() {
    const gotTheLock = app.requestSingleInstanceLock();
    if (!gotTheLock) {
      app.quit();
    }
    app.on("ready", () => {
      this.screenManager.init(screen.getAllDisplays());
      this.windowManager = new WindowManager(this.screenManager);
      this.settingsManager = new SettingsManager(
        this.pathToData,
        this.windowManager
      );
      this.uiManager = new UiManager(
        this.wallpaperManager,
        this.screenManager,
        this.pathToData
      );
      this.uiManager.on("quit", () => {
        if (this.windowManager) {
          this.windowManager.destroyAll();
        }
        app.quit();
      });
      this.uiManager.on("clearWallpaper", (screenId: number) => {
        if (this.windowManager) {
          this.windowManager.destroyWindowByScreenId(screenId);
        }
      });
      this.uiManager.on("setWallpaper", (e) => {
        if (this.windowManager) {
          const { wallpaperIdx, screenId } = e;
          const window = this.windowManager.getWindowByScreenId(screenId);
          if (window) {
            this.windowManager.destroyWindowByScreenId(screenId);
          }
          const wallpaper =
            this.wallpaperManager.getWallpaperByIdx(wallpaperIdx);
          this.settingsManager?.updateWallpaper(screenId, wallpaper);
          this.windowManager.createNewWindow(screenId, wallpaper);
        }
      });
      this.uiManager.on("update-props", () =>
        this.windowManager?.refreshAllProps()
      );
    });
    app.on("window-all-closed", () => {}); // Overwrites the default exit behaviour
  }
}

new Wallex(); // Starts the application
