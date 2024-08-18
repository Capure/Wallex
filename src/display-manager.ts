import type { Display } from "electron";

export class DisplayManager {
    private readonly display: Display;
    constructor(display: Display) {
        this.display = display;
    }
    public getLabel() {
        return this.display.label;
    }
}