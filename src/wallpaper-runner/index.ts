import type { Display } from "electron";
import type { Project } from "../shared-types/project";
import type { WallpaperRunner } from "./interfaces/wallpaper-runner";
import { DarwinWallpaperRunnerFactory } from "./darwin/wallpaper-runner-factory";

export const createWallpaperRunner = (display: Display, project: Project<any>): WallpaperRunner => {
    switch (process.platform) {
        case "darwin":
            const factory = new DarwinWallpaperRunnerFactory();
            return factory.createWallpaperRunner(display, project);
        default:
            throw new Error("unsupported operating system");
    }
};