import fs from 'fs';
import path from 'path';

export const loadProject = (pathToWallpaper: string) => {
    try {
        return fs.readFileSync(path.join(pathToWallpaper.split("\\").slice(0, -1).join("\\"), 'project.json'), { encoding: 'utf8' });
    } catch {
        return null;
    }
}