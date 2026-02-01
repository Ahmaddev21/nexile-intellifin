const { app, BrowserWindow } = require('electron');
const path = require('path');
const url = require('url');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false, // For simplicity in this setup; consider 'true' + preload for security
        },
        title: "Nexile Intellifin"
    });

    // Check if we are in development mode
    const isDev = !app.isPackaged;

    if (isDev) {
        // In dev, load from the Vite dev server (make sure 'npm run dev' is running)
        // Or load the file directly if you prefer to test the built version
        mainWindow.loadURL('http://localhost:3000');
        mainWindow.webContents.openDevTools();
    } else {
        // In production, load the built index.html
        const startUrl = url.format({
            pathname: path.join(__dirname, '../dist/index.html'),
            protocol: 'file:',
            slashes: true,
        });
        mainWindow.loadURL(startUrl);
    }

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function () {
    if (mainWindow === null) {
        createWindow();
    }
});
