import { BrowserWindow, type Display } from "electron";
import type { Wallpaper } from "../../wallpaper-manager";
import type { WallpaperRunner } from "../interfaces/wallpaper-runner";
import path from "path";

export class DarwinVideoWallpaperRunner implements WallpaperRunner {
  private readonly display: Display;
  private readonly wallpaper: Wallpaper;
  private browserWindow?: BrowserWindow;
  constructor(display: Display, wallpaper: Wallpaper) {
    this.display = display;
    this.wallpaper = wallpaper;
  }
  createWallpaper() {
    this.browserWindow = new BrowserWindow({
      x: this.display.bounds.x,
      y: this.display.bounds.y,
      width: this.display.size.width,
      height: this.display.size.height,
      autoHideMenuBar: true,
      frame: false,
      transparent: true,
      type: "desktop",
      enableLargerThanScreen: true,
      roundedCorners: false,
      webPreferences: {
        devTools: true,
        contextIsolation: false,
        preload: path.join(process.cwd(), "public", "preload.js"), // Wallpaper Engine API
      },
    });
    this.browserWindow.webContents.send(
      "video-src",
      path.join(this.wallpaper.path, this.wallpaper.project.file)
    );
    this.browserWindow.webContents.send("load-project", this.wallpaper.project);
    this.browserWindow.loadFile(
      path.join(process.cwd(), "public", "video", "index.html")
    );
  }
  destroyWallpaper() {
    if (this.browserWindow) {
      this.browserWindow.close();
      this.browserWindow = undefined;
    }
  }
}
