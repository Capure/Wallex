// @ts-ignore
import native from '../../../build/Release/attach_wallpaper.node';

/**
 * Attaches windows as wallpaper
 * @returns boolean value which represents if operation was a success
 */
export const attachWallpaper = native.attachWallpaper as (windowHandle: Buffer, offsetX: number, offsetY: number, width: number, height: number) => boolean