import type { Screen } from "electron";
import type { Project } from "../shared-types/project";
import type { WallpaperRunner } from "./interfaces/wallpaper-runner";
import { DarwinWallpaperRunnerFactory } from "./darwin/wallpaper-runner-factory";

export const createWallpaperRunner = (screen: Screen, project: Project<any>): WallpaperRunner => {
    switch (process.platform) {
        case "darwin":
            const factory = new DarwinWallpaperRunnerFactory();
            return factory.createWallpaperRunner(screen, project);
        default:
            throw new Error("unsupported operating system");
    }
};