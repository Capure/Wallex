import { Settings } from '../interfaces/settings';
import fs from 'fs';
import path from 'path';

const DefaultSettings: Settings = {
    version: 1,
    restoreWallpapers: true,
    prevWallpapers: []
}

export const loadSettings = (pathToData: string): Settings => {
    try {
        return JSON.parse(fs.readFileSync(path.join(pathToData, 'settings.json'), { encoding: 'utf8' }));
    } catch {
        fs.writeFileSync(path.join(pathToData, 'settings.json'), JSON.stringify(DefaultSettings), { encoding: 'utf8' });
        return DefaultSettings;
    }
}