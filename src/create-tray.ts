import {
  app,
  shell,
  Menu,
  MenuItemConstructorOptions,
  nativeImage,
  Tray,
} from "electron";
import path from "path";
import { getAllDisplays } from "./screen-utils";
import { WallpaperManager } from "./wallpaper-manager";
import { DisplayManager } from "./display-manager";

const ICON_PATH = path.join(__dirname, "../public/trayTemplate.png");

const icon = nativeImage.createFromPath(ICON_PATH);

export interface WallexTrayHandlers {
  onOpenWallpaperFolder: () => void;
  onRefresh: () => void;
  onQuit: () => void;
}


export class WallexTray implements WallexTrayHandlers {
  private wallpaperManager: WallpaperManager;
  private tray: Tray;
  constructor(wallpaperManager: WallpaperManager) {
    this.wallpaperManager = wallpaperManager;
    this.tray = this.buildTray();
  }

  private buildTray() {
    const tray = new Tray(icon);
    const contextMenu = Menu.buildFromTemplate(this.createTemplate(this));
    tray.setToolTip("Wallex");
    tray.setContextMenu(contextMenu);
    return tray;
  }

  // template

  private buildDisplayMenuTemplate(
    displayManager: DisplayManager
  ): MenuItemConstructorOptions | Electron.MenuItem {
    const submenu = this.wallpaperManager.getWallpapers().map(wallpaper => ({ label: wallpaper.name, click: () => { } }) as MenuItemConstructorOptions);
    return { label: displayManager.getLabel(), type: "submenu", submenu };
  };

  private createTemplate(handlers: WallexTrayHandlers) {
    let template: (MenuItemConstructorOptions | Electron.MenuItem)[] = [];

    const wallexTrayInstance = this;
    template = [...getAllDisplays().map(this.buildDisplayMenuTemplate.bind(wallexTrayInstance))];

    template.push({ type: "separator" });
    template.push({
      label: "Open the wallpapers folder",
      click: () => handlers.onOpenWallpaperFolder(),
    });
    template.push({
      label: "Refresh wallpapers",
      click: () => handlers.onRefresh(),
    });
    template.push({ type: "separator" });
    template.push({ label: "Quit", click: () => handlers.onQuit() });
    return template;
  };

  // handlers

  public async onOpenWallpaperFolder() {
    shell.openPath(this.wallpaperManager.getWallpapersFolder());
  };
  public onRefresh() {
    this.wallpaperManager.reload();
    this.tray.destroy();
    this.tray = this.buildTray();
    console.log(this.wallpaperManager.getWallpapers());
  };
  public onQuit() {
    app.quit();
  };
}