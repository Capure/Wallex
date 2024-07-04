import { app } from "electron/main";
import { createTray } from "./createTray";

app.whenReady().then(() => {
  app.dock.hide();

  createTray({
    onQuit: () => app.quit(),
    onRefresh: () => {},
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
