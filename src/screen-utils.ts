import { screen } from "electron";
import { DisplayManager } from "./display-manager";

export const getAllDisplays = () => screen.getAllDisplays().map(display => new DisplayManager(display));
