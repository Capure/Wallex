import fs from 'fs';
import path from 'path';

export const saveProject = (pathToWallpaper: string, newProject: any) => {
    try {
        fs.writeFileSync(path.join(pathToWallpaper, 'project.json'), JSON.stringify(newProject, null, 2), { encoding: 'utf8' });
    } catch (e) {
        console.error(e);
    }
}