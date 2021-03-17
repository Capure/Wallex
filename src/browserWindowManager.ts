import {BrowserWindow, dialog} from 'electron';
import electronWallpaper from '../electronWallpaper';
import path from 'path';
import { Wallpaper } from './interfaces/wallpaper';
import mouseEventsNative from '../mouseEvents';
import { ScreenManager } from './screenManager';
import { loadProject } from './utils/loadProject';

export class BrowserWindowManager {
  private windows: Map<number, {window: BrowserWindow, wallpaperPath: string}> = new Map();
  private readonly screenManager: ScreenManager;
  constructor(screenManager: ScreenManager) {
    this.screenManager = screenManager;
  }
  private loadRuntimeSettingsFromProject(project: any) {
    const runtimeSettings = {
      disableMouseEvents: false,
      disableSound: false
    };
    return project && project.wallex ? {...runtimeSettings, ...project.wallex} : runtimeSettings;
  }
  public createNewWindow(screenId: number, wallpaper: Wallpaper) {
    const screen = this.screenManager.getScreenById(screenId);
    if (!screen) { throw Error("Screen not found!") }
    const project = loadProject(wallpaper.path);
    if (!project || (project.type.toLowerCase() !== "web" && project.type.toLowerCase() !== "video")) {
      const title = !project ? "Invalid wallpaper!" : "Not implemented";
      const description = !project ? "project.json not found!" : 'The wallpaper must be of type "web"!';
      dialog.showMessageBox({ title: title, message: description });
      return;
    }
    const projectIsVideo = (project.type.toLowerCase() === 'video');
    const newWindow = new BrowserWindow({
      width: 1000, // Initial value
      height: 1000, // Initial value
      autoHideMenuBar: true,
      frame: false,
      transparent: true,
      webPreferences: {
        preload: path.join(__dirname, '..', 'public', 'preload.js'), // Wallpaper Engine API
        contextIsolation: false,
      }
    });
    const runtimeSettings = projectIsVideo ? {
      disableMouseEvents: true,
      disableSound: true
    } : this.loadRuntimeSettingsFromProject(project);
    newWindow.loadFile(projectIsVideo ? path.join("..", "public", "video", "index.html") : path.join(wallpaper.path, project.file));
    if (projectIsVideo) {
      newWindow.webContents.send('video-src', path.join(wallpaper.path, project.file));
    }
    newWindow.webContents.send('load-project', project);
    if(project.wallex && project.wallex.injectLocalStorage) { // injecting key : value pairs into localStorage
      newWindow.webContents.once("did-navigate-in-page", () => {
        project.wallex.injectLocalStorage.forEach( (localStoragePair : {key : string, value : string}) => {
          newWindow.webContents.executeJavaScript(`localStorage.setItem("${localStoragePair.key}", '${localStoragePair.value}')`);
        }) 
      });
      newWindow.webContents.reload(); // reloading the page after injection to make the changes take effect
    }
    const {x: jsOffsetX, y: jsOffsetY, width, height} = screen.bounds;
    if (!runtimeSettings.disableMouseEvents) { mouseEventsNative.createMouseForwarder(newWindow, jsOffsetX, jsOffsetY) }
    newWindow.webContents.send('enable-sound', !runtimeSettings.disableSound);
    electronWallpaper.attachWindow(newWindow, this.screenManager.getOffsetX(screenId), jsOffsetY, width, height);
    this.windows.set(screenId, { window: newWindow, wallpaperPath: wallpaper.path });
  }

  public refreshAllProps() {
    this.screenManager.getScreens().forEach(screen => {
      const wallpaperWindow = this.windows.get(screen.id);
      if (wallpaperWindow) {
        const project = loadProject(wallpaperWindow.wallpaperPath);
        if (!project) { throw Error(`Project not found!\nScreen: ${screen.id}`) }
        wallpaperWindow.window.webContents.send('load-project', project);
        wallpaperWindow.window.webContents.send('update-props');
      }
    });
  }

  public destroyWindowByScreenId(id: number) {
    const screen = this.screenManager.getScreenById(id);
    if (!screen) { throw Error("Screen not found!") }
    const window = this.windows.get(id);
    if (!window) { throw Error("No BrowserWindow open for this screen!") }
    window.window.close();
    this.windows.delete(id);
  }
  public getWindowByScreenId(id: number) {
    return this.windows.get(id)?.window;
  }
  public destroyAll() {
    this.screenManager.getScreens().forEach(screen => {
      try {
        this.destroyWindowByScreenId(screen.id);
      } catch {}
    });
  }
}