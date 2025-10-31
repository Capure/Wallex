import { BrowserWindow, type Display } from "electron";
import type { Wallpaper } from "../../wallpaper-manager";
import type { WallpaperRunner } from "../interfaces/wallpaper-runner";
import { attachWallpaper, captureAudio } from "./native";
import path from "path";

export class WinWebWallpaperRunner implements WallpaperRunner {
  private readonly display: Display;
  private readonly wallpaper: Wallpaper;
  private browserWindow?: BrowserWindow;
  constructor(display: Display, wallpaper: Wallpaper) {
    this.display = display;
    this.wallpaper = wallpaper;
  }
  createWallpaper() {
    const { x, y } = this.display.bounds;
    const { width, height } = this.display.size;

    this.browserWindow = new BrowserWindow({
      x,
      y,
      width,
      height,
      frame: false,
      transparent: true,
      webPreferences: {
        devTools: true,
        contextIsolation: false,
        preload: path.join(process.cwd(), "public", "preload.js"), // Wallpaper Engine API
      },
    });

    this.browserWindow.loadFile(
      path.join(this.wallpaper.path, this.wallpaper.project.file)
    );

    if (!attachWallpaper(this.browserWindow.getNativeWindowHandle(), x, y, width, height)) {
      throw new Error("Failed to attach the window.");
    };

    const { left, right } = captureAudio();
    const floatsA = new Float32Array(left.buffer, left.byteOffset, left.byteLength / 4);
    const floatsB = new Float32Array(right.buffer, right.byteOffset, right.byteLength / 4);

    setInterval(() => {
      console.log('A:', floatsA.slice(0, 5));
      console.log('B:', floatsB.slice(0, 5));
    }, 100);
  }
  destroyWallpaper() {
    if (this.browserWindow) {
      this.browserWindow.close();
      this.browserWindow = undefined;
    }
  }
}
