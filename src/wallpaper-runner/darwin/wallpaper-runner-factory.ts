import type { Display } from "electron";
import type { Wallpaper } from "../../wallpaper-manager";
import type { WallpaperRunner } from "../interfaces/wallpaper-runner";
import { WallpaperRunnerFactory } from "../wallpaper-runner-factory";
import { DarwinWebWallpaperRunner } from "./web-wallpaper-runner";

export class DarwinWallpaperRunnerFactory extends WallpaperRunnerFactory {
    public createWallpaperRunner(display: Display, wallpaper: Wallpaper): WallpaperRunner {
        switch (wallpaper.project.type) {
            case "web":
                return new DarwinWebWallpaperRunner(display, wallpaper);
            case "video":
                throw new Error("not implemented");
            default:
                throw new Error("unsupported wallpaper type");
        }
    }
}