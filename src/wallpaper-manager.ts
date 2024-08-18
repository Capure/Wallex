import path from "path";
import fs from "fs";

export interface Wallpaper {
  path: string;
  name: string;
  project: any;
}

const loadProject = (pathToWallpaper: string) => {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(pathToWallpaper, "project.json"), {
        encoding: "utf8",
      })
    );
  } catch {
    return null;
  }
};

export class WallpaperManager {
  private pathsToWallpapers: string[] = [];
  private wallpapers: Wallpaper[] = [];
  private readonly basePath: string;
  constructor(pathToData: string) {
    this.basePath = pathToData;
    this.loadPaths();
    this.loadWallpapers();
  }
  private loadPaths() {
    try {
      const dirRaw = fs.readdirSync(this.getWallpapersFolder(), {
        withFileTypes: true,
      });
      dirRaw.forEach((dir: fs.Dirent) => {
        if (!dir.isDirectory()) {
          return;
        }
        this.pathsToWallpapers.push(
          path.join(this.getWallpapersFolder(), dir.name)
        );
      });
    } catch {
      fs.mkdirSync(this.getWallpapersFolder());
    }
  }
  private loadWallpapers() {
    this.wallpapers = this.pathsToWallpapers
      .map((path) => {
        const project = loadProject(path);
        if (!project || !project.title) return null;
        return {
          name: project.title,
          path: path,
          project: project,
        };
      })
      .filter((i) => i !== null) as Wallpaper[];
  }
  public reload() {
    this.pathsToWallpapers.length = 0;
    this.wallpapers.length = 0;
    this.loadPaths();
    this.loadWallpapers();
  }
  public getWallpapers = () => this.wallpapers;
  public getWallpaperByIdx = (idx: number) => this.wallpapers[idx];
  public getWallpapersFolder = () => path.join(this.basePath, "wallpapers");
}
