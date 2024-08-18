import type { Display } from "electron";
import type { WallpaperRunner } from "../interfaces/wallpaper-runner";
import type { Project } from "../../shared-types/project";
import { WallpaperRunnerFactory } from "../wallpaper-runner-factory";
import { DarwinWebWallpaperRunner } from "./web-wallpaper-runner";

export class DarwinWallpaperRunnerFactory extends WallpaperRunnerFactory {
    public createWallpaperRunner(display: Display, project: Project<any>): WallpaperRunner {
        switch (project.type) {
            case "web":
                return new DarwinWebWallpaperRunner(display, project);
            case "video":
                throw new Error("not implemented");
            default:
                throw new Error("unsupported wallpaper type");
        }
    }
}