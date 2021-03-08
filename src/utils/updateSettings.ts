import { Settings } from '../interfaces/settings';
import fs from 'fs';
import path from 'path';

export const updateSettings = (pathToData: string, update: Partial<Settings>): boolean => {
    try {
        const oldSettings = JSON.parse(fs.readFileSync(path.join(pathToData, 'settings.json'), { encoding: 'utf8' }));
        const newSettings = {...oldSettings, ...update};
        fs.writeFileSync(path.join(pathToData, 'settings.json'), JSON.stringify(newSettings), {encoding: 'utf8'});
        return true;
    } catch {
        return false;
    }
}