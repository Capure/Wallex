const isWin32 = process.platform === "win32";
// @ts-ignore
const native = isWin32 ? require('../../../build/Release/attach_wallpaper.node') : null;

export type AttachWallpaperFunction = (windowHandle: Buffer, offsetX: number, offsetY: number, width: number, height: number) => boolean;

/**
 * Noop to return on unsupported platforms
 * @throws unsupported platform error
 */
const noop = () => {
    throw new Error("Platform must be win32.")
}

/**
 * Attaches windows as wallpaper
 * @throws unsupported platform error if not on win32
 * @returns boolean value which represents if operation was a success
 */
export const attachWallpaper: AttachWallpaperFunction = native ? native.attachWallpaper : noop;