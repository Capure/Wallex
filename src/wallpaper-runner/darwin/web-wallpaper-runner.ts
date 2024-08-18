import type { Screen } from "electron";
import type { Project } from "../../shared-types/project";
import type { WallpaperRunner } from "../interfaces/wallpaper-runner";

export class DarwinWebWallpaperRunner implements WallpaperRunner {
    private readonly screen: Screen;
    private readonly project: Project<any>;
    constructor(screen: Screen, project: Project<any>) {
        this.screen = screen;
        this.project = project;
    };
    createWallpaper() {

    };
    destroyWallpaper() {

    };
}