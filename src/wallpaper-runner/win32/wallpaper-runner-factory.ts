import type { Display } from "electron";
import type { Wallpaper } from "../../wallpaper-manager";
import type { WallpaperRunner } from "../interfaces/wallpaper-runner";
import { WallpaperRunnerFactory } from "../wallpaper-runner-factory";
import { WinWebWallpaperRunner } from "./web-wallpaper-runner";

export class WindowsWallpaperRunnerFactory extends WallpaperRunnerFactory {
    public createWallpaperRunner(display: Display, wallpaper: Wallpaper): WallpaperRunner {
        switch (wallpaper.project.type) {
            case "web":
                return new WinWebWallpaperRunner(display, wallpaper);
            case "video":
                throw new Error("unsupported wallpaper type");
            default:
                throw new Error("unsupported wallpaper type");
        }        
    }
}