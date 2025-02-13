// src/index.js
const { app, BrowserWindow } = require('electron');
const path = require('path');

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1440,
    height: 1020,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Carga la build de React
  const indexPath = path.join(__dirname, '..', '..', 'Frontend', 'build', 'index.html');  console.log('Cargando:', indexPath);
  win.loadFile(indexPath);

  // Abre DevTools para depuración
  win.webContents.openDevTools();
};

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});