import path from 'path';
import fs from 'fs';
import { Wallpaper } from './interfaces/wallpaper';
import { loadProject } from './utils/loadProject';

export class WallpaperManager {
  private pathsToWallpapers: string[] = [];
  private wallpapers: Wallpaper[] = [];
  private readonly pathToData: string;
  constructor(pathToData: string) {
    this.pathToData = pathToData;
    this.loadPaths();
    this.loadWallpapers();
  }
  private loadPaths() {
    try {
      const dirRaw = fs.readdirSync(path.join(this.pathToData, 'wallpapers'), { withFileTypes: true });
      dirRaw.forEach((dir: fs.Dirent) => {
        if (!dir.isDirectory()) { return }
        this.pathsToWallpapers.push(path.join(this.pathToData, 'wallpapers', dir.name));
      });
    } catch {
      fs.mkdirSync(path.join(this.pathToData, 'wallpapers'));
    }
  }
  private loadWallpapers() {
    this.wallpapers = this.pathsToWallpapers.map(path => {
      const project = loadProject(path);
      return {
        name: project ? project.title : "NO_NAME",
        path: path,
        project: project
      };
    });
  }
  public reload() {
    this.pathsToWallpapers.length = 0;
    this.wallpapers.length = 0;
    this.loadPaths();
    this.loadWallpapers();
  }
  public getWallpapers = () => this.wallpapers;
  public getWallpaperByIdx = (idx: number) => this.wallpapers[idx];
}

