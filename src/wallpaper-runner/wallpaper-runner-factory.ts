import type { Screen } from "electron";
import type { Project } from "../shared-types/project";
import type { WallpaperRunner } from "./interfaces/wallpaper-runner";

export abstract class WallpaperRunnerFactory {
    public abstract createWallpaperRunner(screen: Screen, project: Project<any>): WallpaperRunner;
}