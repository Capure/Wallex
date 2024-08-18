import type { Display } from "electron";
import type { Project } from "../shared-types/project";
import type { WallpaperRunner } from "./interfaces/wallpaper-runner";

export abstract class WallpaperRunnerFactory {
    public abstract createWallpaperRunner(display: Display, project: Project<any>): WallpaperRunner;
}