import { Wallpaper } from "./wallpaper";

export interface Settings {
    version: number,
    restoreWallpapers: boolean,
    prevWallpapers: Wallpaper[]
}