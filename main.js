const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const iconPath = path.join(__dirname, 'assets', 'icons', 'win', 'icon.ico');
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Planner',
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});


