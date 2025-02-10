const { app, BrowserWindow } = require('electron');
const path = require('path');
const log = require('electron-log');

process.on('unhandledRejection', (reason, promise) => {
  log.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Reference to the main window
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,        // Enabled for this example (review security considerations for production)
      contextIsolation: false
    }
  });

  // Load the inventory view directly
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Inventory Management</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
        <link href="styles/ag-grid.css" rel="stylesheet">
        <link href="styles/ag-theme-alpine.css" rel="stylesheet">
        <script src="https://unpkg.com/ag-grid-community/dist/ag-grid-community.min.noStyle.js"></script>
    </head>
    <body>
        <script type="module">
            ${require('fs').readFileSync(path.join(__dirname, 'public', 'inventoryView.js'), 'utf8')}
        </script>
    </body>
    </html>
  `)}`);

  // Optional: open DevTools for debugging
  // mainWindow.webContents.openDevTools();

  // Log that the window has been created
  log.info('BrowserWindow created');
}

// When Electron is ready, create the window
app.whenReady().then(() => {
  createWindow();
  log.info('App is ready');
});