import type { Display } from "electron";
import type { Project } from "../../shared-types/project";
import type { WallpaperRunner } from "../interfaces/wallpaper-runner";

export class DarwinWebWallpaperRunner implements WallpaperRunner {
    private readonly display: Display;
    private readonly project: Project<any>;
    constructor(display: Display, project: Project<any>) {
        this.display = display;
        this.project = project;
    };
    createWallpaper() {

    };
    destroyWallpaper() {

    };
}