import type { Display } from "electron";
import type { WallpaperRunner } from "./interfaces/wallpaper-runner";
import { Wallpaper } from "../wallpaper-manager";
import { DarwinWallpaperRunnerFactory } from "./darwin/wallpaper-runner-factory";
import { WindowsWallpaperRunnerFactory } from "./win32/wallpaper-runner-factory";

export const createWallpaperRunner = (display: Display, wallpaper: Wallpaper): WallpaperRunner => {
    switch (process.platform) {
        case "darwin":
            const darwinFactory = new DarwinWallpaperRunnerFactory();
            return darwinFactory.createWallpaperRunner(display, wallpaper);
        case "win32":
            const winFactory = new WindowsWallpaperRunnerFactory();
            return winFactory.createWallpaperRunner(display, wallpaper);
        default:
            throw new Error("unsupported operating system");
    }
};