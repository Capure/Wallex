import { Wallpaper } from "./interfaces/wallpaper";
import { loadSettings } from "./utils/loadSettings";
import { updateSettings } from "./utils/updateSettings";
import { Settings } from "./interfaces/settings";
import { WindowManager } from "./windowManager";
import { loadProject } from "./utils/loadProject";

export class SettingsManager {
  private readonly pathToData: string;
  private settings: Settings;
  private windowManager: WindowManager;
  constructor(pathToData: string, windowManager: WindowManager) {
    this.pathToData = pathToData;
    this.settings = loadSettings(this.pathToData);
    this.windowManager = windowManager;
    this.loadPrevWallpapers();
  }
  private loadPrevWallpapers() {
    this.settings.prevWallpapers.forEach((wallpaperSettingOld) => {
      try {
        const wallpaperSetting = {
          ...wallpaperSettingOld,
          wallpaper: { ...wallpaperSettingOld.wallpaper, project: null },
        }; // getting the path to last wallpaper but ignoring the settings
        this.windowManager.createNewWindow(
          wallpaperSetting.screenId,
          wallpaperSetting.wallpaper
        );
      } catch {}
    });
  }
  public updateWallpaper(screenId: number, wallpaper?: Wallpaper) {
    if (wallpaper) {
      if (!this.settings.prevWallpapers.find((e) => e.screenId === screenId)) {
        updateSettings(this.pathToData, {
          prevWallpapers: [
            ...this.settings.prevWallpapers,
            { screenId: screenId, wallpaper: wallpaper },
          ],
        });
        return;
      }
      updateSettings(this.pathToData, {
        prevWallpapers: this.settings.prevWallpapers.map((wallpaperSetting) => {
          if (wallpaperSetting.screenId !== screenId) {
            return wallpaperSetting;
          }
          wallpaperSetting.wallpaper = wallpaper;
          return wallpaperSetting;
        }),
      });
      this.settings = loadSettings(this.pathToData);
    } else {
      updateSettings(this.pathToData, {
        prevWallpapers: this.settings.prevWallpapers.filter(
          (wallpaperSetting) => wallpaperSetting.screenId !== screenId
        ),
      });
      this.settings = loadSettings(this.pathToData);
    }
  }
}
