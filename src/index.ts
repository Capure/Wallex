import {app, BrowserWindow} from 'electron';
import path from 'path';


app.allowRendererProcessReuse = true;

let mainWindow: null | BrowserWindow;

const createWindow = function() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 300,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }, // 3 fucking lines cuz electron is "SECURE" now
    //icon: path.join(__dirname, 'logo.png')
  });
  mainWindow.loadFile('../public/index.html');

  mainWindow.on('closed', function() {
    mainWindow = null;
  });
};

app.on('ready', createWindow);

app.on('window-all-closed', function() {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function() {
  if (mainWindow === null) {
    createWindow();
  }
});