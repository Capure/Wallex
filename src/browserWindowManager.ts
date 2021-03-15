import {BrowserWindow, dialog} from 'electron';
import electronWallpaper from '../electronWallpaper';
import path from 'path';
import { Wallpaper } from './interfaces/wallpaper';
import mouseEventsNative from '../mouseEvents';
import { ScreenManager } from './screenManager';

export class BrowserWindowManager {
  private windows: Map<number, BrowserWindow> = new Map();
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
    const project = wallpaper.project;
    if (!project || project.type.toLowerCase() !== "web") {
      const title = !project ? "Invalid wallpaper!" : "Not implemented";
      const description = !project ? "project.json not found!" : 'The wallpaper must be of type "web"!';
      dialog.showMessageBox({ title: title, message: description });
      return;
    }
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
    const runtimeSettings = this.loadRuntimeSettingsFromProject(project);
    newWindow.loadFile(path.join(wallpaper.path, project.file));
    newWindow.webContents.executeJavaScript(`window.project = JSON.parse(${JSON.stringify(JSON.stringify(project))})`); // TODO: call merlin to figure out what happend
    if(project.wallex.injectLocalStorage) { //injecting key : value pairs into localStorage
      newWindow.webContents.once("did-navigate-in-page", () => {
        project.wallex.injectLocalStorage.forEach( (localStoragePair : {key : string, value : string}) => {
          newWindow.webContents.executeJavaScript(`localStorage.setItem("${localStoragePair.key}", '${localStoragePair.value}')`);
        }) 
      });
    }
    newWindow.webContents.executeJavaScript(`window.location.reload()`); // reloading the page after injection to make the changes take effect
    const {x: jsOffsetX, y: jsOffsetY, width, height} = screen.bounds;
    if (!runtimeSettings.disableMouseEvents) { mouseEventsNative.createMouseForwarder(newWindow, jsOffsetX, jsOffsetY) }
    newWindow.webContents.executeJavaScript(`window.enableSound = ${!runtimeSettings.disableSound}`);
    electronWallpaper.attachWindow(newWindow, this.screenManager.getOffsetX(screenId), jsOffsetY, width, height);
    this.windows.set(screenId, newWindow);
  }
  public destroyWindowByScreenId(id: number) {
    const screen = this.screenManager.getScreenById(id);
    if (!screen) { throw Error("Screen not found!") }
    const window = this.windows.get(id);
    if (!window) { throw Error("No BrowserWindow open for this screen!") }
    window.close();
    this.windows.delete(id);
  }
  public getWindowByScreenId(id: number) {
    return this.windows.get(id);
  }
  public destroyAll() {
    this.screenManager.getScreens().forEach(screen => {
      try {
        this.destroyWindowByScreenId(screen.id);
      } catch {}
    });
  }
}