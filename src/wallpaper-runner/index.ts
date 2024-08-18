import type { Display } from "electron";
import type { WallpaperRunner } from "./interfaces/wallpaper-runner";
import { DarwinWallpaperRunnerFactory } from "./darwin/wallpaper-runner-factory";
import { Wallpaper } from "../wallpaper-manager";

export const createWallpaperRunner = (display: Display, wallpaper: Wallpaper): WallpaperRunner => {
    switch (process.platform) {
        case "darwin":
            const factory = new DarwinWallpaperRunnerFactory();
            return factory.createWallpaperRunner(display, wallpaper);
        default:
            throw new Error("unsupported operating system");
    }
};