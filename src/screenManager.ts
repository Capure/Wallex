export class ScreenManager {
  private screens: Electron.Display[] | null = null;
  public getScreens() {
    if (!this.screens) { throw Error("ScreenManager not initialized!") }
    return this.screens;
  }
  public getScreenById(id: number) {
    if (!this.screens) { throw Error("ScreenManager not initialized!") }
    const filteredScreens = this.screens.filter(screen => screen.id === id);
    return filteredScreens.length === 1 ? filteredScreens[0] : null;
  }
  public init(rawScreens: Electron.Display[]) {
    this.screens = rawScreens.sort((a, b) => a.bounds.x - b.bounds.x); // Electron doesn't care about the order of the displays
  }
  public getOffsetX(screenId: number) {
    if (!this.screens) { throw Error("ScreenManager not initialized!") }
    const screenIdx = this.screens.findIndex(screen => screen.id === screenId);
    if (screenIdx === -1) { throw Error("Screen not found!") }
    const screensToTheLeft = this.screens.slice(0, screenIdx);
    return screensToTheLeft.reduce((sum, item) => sum + item.bounds.width, 0);
  }
}