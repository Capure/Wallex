const isWin32 = process.platform === "win32";
// @ts-ignore
const nativeAttachWallpaper = isWin32 ? require('../../../build/Release/attach_wallpaper.node') : null;
// @ts-ignore
const nativeAudio = isWin32 ? require('../../../build/Release/audio.node') : null;

export type AttachWallpaperFunction = (windowHandle: Buffer, offsetX: number, offsetY: number, width: number, height: number) => boolean;
export type captureAudioFunction = () => { left: Buffer, right: Buffer };

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
export const attachWallpaper: AttachWallpaperFunction = nativeAttachWallpaper ? nativeAttachWallpaper.attachWallpaper : noop;

/**
 * Starts audio capturing
 * @throws unsupported platform error if not on win32
 * @returns buffers representing result of running FFT for each channel (64 elements per channel)
 */
export const captureAudio: captureAudioFunction = nativeAudio ? nativeAudio.captureAudio : noop;