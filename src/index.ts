import { type Tray, app, dialog } from "electron";
import { createTray } from "./createTray";
import { WallpaperManager } from "./wallpaperManager";

const isOnMac = process.platform === "darwin";

const refreshWallpapers = (tray: Tray, wallpaperManager: WallpaperManager) => {
  wallpaperManager.reload();
  tray.destroy();
  buildTray(wallpaperManager);
};

const openWallpaperFolder = async (
  tray: Tray,
  wallpaperManager: WallpaperManager
) => {
  await dialog.showOpenDialog({
    title: "Add your wallpaper",
    defaultPath: wallpaperManager.getWallpapersFolder(),
    properties: ["createDirectory"],
  });
  //   refreshWallpapers(tray, wallpaperManager);
};

const buildTray = (wallpaperManager: WallpaperManager) => {
  const tray = createTray({
    onQuit: () => app.quit(),
    onRefresh: () => refreshWallpapers(tray, wallpaperManager),
    onOpenWallpaperFolder: () => openWallpaperFolder(tray, wallpaperManager),
  });
};

app.whenReady().then(() => {
  if (isOnMac) app.dock.hide();

  const wallpaperManager = new WallpaperManager(app.getPath("userData"));
  console.log(wallpaperManager.getWallpapers());

  buildTray(wallpaperManager);
});
