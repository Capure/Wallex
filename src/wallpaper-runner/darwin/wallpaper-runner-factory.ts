import type { Screen } from "electron";
import type { WallpaperRunner } from "../interfaces/wallpaper-runner";
import type { Project } from "../../shared-types/project";
import { WallpaperRunnerFactory } from "../wallpaper-runner-factory";
import { DarwinWebWallpaperRunner } from "./web-wallpaper-runner";

export class DarwinWallpaperRunnerFactory extends WallpaperRunnerFactory {
    public createWallpaperRunner(screen: Screen, project: Project<any>): WallpaperRunner {
        switch (project.type) {
            case "web":
                return new DarwinWebWallpaperRunner(screen, project);
            case "video":
                throw new Error("not implemented");
            default:
                throw new Error("unsupported wallpaper type");
        }
    }
}