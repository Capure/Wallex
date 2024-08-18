import type { Display } from "electron";
import type { Wallpaper } from "../wallpaper-manager";
import type { WallpaperRunner } from "./interfaces/wallpaper-runner";

export abstract class WallpaperRunnerFactory {
    public abstract createWallpaperRunner(display: Display, wallpaper: Wallpaper): WallpaperRunner;
}