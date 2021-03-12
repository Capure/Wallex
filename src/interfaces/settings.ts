import { WallpaperSetting } from "./wallpaperSetting";

export interface Settings {
    version: number,
    restoreWallpapers: boolean,
    prevWallpapers: WallpaperSetting[]
}