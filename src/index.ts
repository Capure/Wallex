import { app } from "electron";
import { WallexTray } from "./createTray";
import { WallpaperManager } from "./wallpaperManager";

const isOnMac = process.platform === "darwin";

app.whenReady().then(() => {
  if (isOnMac) app.dock.hide();

  const wallpaperManager = new WallpaperManager(app.getPath("userData"));

  const tray = new WallexTray(wallpaperManager);
});
