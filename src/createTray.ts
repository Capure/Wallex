import {
  Display,
  Menu,
  MenuItemConstructorOptions,
  nativeImage,
  Tray,
} from "electron";
import path from "path";
import { getAllDisplays } from "./screenUtils";

const ICON_PATH = path.join(__dirname, "../public/trayTemplate.png");

const icon = nativeImage.createFromPath(ICON_PATH);

export interface WallexTrayHandlers {
  onRefresh: () => void;
  onQuit: () => void;
}

const buildDisplayMenuTemplate: (
  display: Display
) => MenuItemConstructorOptions | Electron.MenuItem = (display: Display) => {
  return { label: display.label, type: "submenu", submenu: [] };
};

const createTemplate = (handlers: WallexTrayHandlers) => {
  let template: (MenuItemConstructorOptions | Electron.MenuItem)[] = [];
  template = [...getAllDisplays().map(buildDisplayMenuTemplate)];
  template.push({ type: "separator" });
  template.push({
    label: "Open the wallpaper folder",
    click: () => console.log("not implemeted"),
  });
  template.push({
    label: "Refresh wallpapers",
    click: () => handlers.onRefresh(),
  });
  template.push({ type: "separator" });
  template.push({ label: "Quit", click: () => handlers.onQuit() });
  return template;
};

export const createTray = (handlers: WallexTrayHandlers) => {
  const tray = new Tray(icon);
  const contextMenu = Menu.buildFromTemplate(createTemplate(handlers));
  tray.setToolTip("Wallex");
  tray.setContextMenu(contextMenu);
  return tray;
};
