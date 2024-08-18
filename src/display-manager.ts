import type { Display } from "electron";
import type { WallpaperRunner } from "./wallpaper-runner/interfaces/wallpaper-runner";
import type { Wallpaper } from "./wallpaper-manager";
import { createWallpaperRunner } from "./wallpaper-runner";

export class DisplayManager {
    private readonly display: Display;
    private wallpaperRunner?: WallpaperRunner;
    constructor(display: Display) {
        this.display = display;
    }
    public getLabel() {
        return this.display.label;
    }
    public setWallpaper(wallpaper: Wallpaper) {
        if (this.wallpaperRunner) this.wallpaperRunner.destroyWallpaper();
        this.wallpaperRunner = createWallpaperRunner(this.display, wallpaper);
        this.wallpaperRunner.createWallpaper();
    }
}