import fs from 'fs';
import path from 'path';

export const loadProject = (pathToWallpaper: string) => {
    try {
        return JSON.parse(fs.readFileSync(path.join(pathToWallpaper, 'project.json'), { encoding: 'utf8' }));
    } catch {
        return null;
    }
}