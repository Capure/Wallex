import { BrowserWindow, type Display } from "electron";
import type { Wallpaper } from "../../wallpaper-manager";
import type { WallpaperRunner } from "../interfaces/wallpaper-runner";
import path from "path";

export class DarwinWebWallpaperRunner implements WallpaperRunner {
    private readonly display: Display;
    private readonly wallpaper: Wallpaper;
    private browserWindow?: BrowserWindow;
    constructor(display: Display, wallpaper: Wallpaper) {
        this.display = display;
        this.wallpaper = wallpaper;
    };
    createWallpaper() {
        this.browserWindow = new BrowserWindow({
            width: this.display.size.width,
            height: this.display.size.height,
            autoHideMenuBar: true,
            frame: false,
            transparent: true,
            type: "desktop",
            enableLargerThanScreen: true,
            roundedCorners: false,
            webPreferences: {
                contextIsolation: false,
                preload: path.join(__dirname, "..", "public", "preload.js"), // Wallpaper Engine API
            }
        });
        this.browserWindow.loadFile(path.join(this.wallpaper.path, this.wallpaper.project.file));
    };
    destroyWallpaper() {
        if (this.browserWindow) {
            this.browserWindow.destroy();
            this.browserWindow = undefined;
        }
    };
}