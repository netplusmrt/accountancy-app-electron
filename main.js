// Modules to control application life and create native browser window
const {app, BrowserWindow, dialog, ipcMain} = require('electron')
const path = require('path')
const fs = require('fs');
const { autoUpdater } = require('electron-updater')
const log = require("electron-log");
const url = require("url");
const server = 'https://www.accountancyapp.in'


let mainWindow

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.resolve(__dirname, "assets/icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true
    },
  });

  if (app.isPackaged) {
      mainWindow.loadURL(
      url.format({
          pathname: path.join(__dirname, `/accountancy-app/index.html`),
          protocol: "file:",
          slashes: true
        })
      );
  } else {
    log.info("Debug Mode: Running in development");
    mainWindow.loadURL("http://localhost:4200");
    // Open the DevTools.
    // mainWindow.webContents.openDevTools()
  }

  mainWindow.on('closed', function () {
    mainWindow = null
  })

  // Handle the call from Renderer
  ipcMain.handle("execute-main-function", async (event, data) => {
    log.info("Function called from Renderer:", data);
    // const feedURL = `${server}/update`
    // log.info(feedURL);
    mainWindow.maximize();
    autoUpdater.forceDevUpdateConfig = true;
    autoUpdater.disableWebInstaller = true;
    // autoUpdater.setFeedURL(feedURL);
    autoUpdater.checkForUpdates();
  });
}

app.on('ready', createWindow)

app.on('ready', function()  {
  autoUpdater.logger = log;
  autoUpdater.logger.transports.file.level = "info";

  const appPath = path.dirname(process.execPath);
  app.setLoginItemSettings({
    openAtLogin: true, // Ensures it runs on startup if needed
    path: appPath,
    args: [],
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
  if (mainWindow === null) createWindow()
})

global.downloadPath = path.join( app.getPath( "downloads" ), "accountancy-app" );
if ( !fs.existsSync( global.downloadPath ) ) fs.mkdirSync( global.downloadPath );

log.info(global.downloadPath);

function isNetworkError(errorObject) {
  return errorObject.message === "net::ERR_INTERNET_DISCONNECTED" ||
      errorObject.message === "net::ERR_PROXY_CONNECTION_FAILED" ||
      errorObject.message === "net::ERR_CONNECTION_RESET" ||
      errorObject.message === "net::ERR_CONNECTION_CLOSE" ||
      errorObject.message === "net::ERR_NAME_NOT_RESOLVED" ||
      errorObject.message === "net::ERR_CONNECTION_TIMED_OUT";
}

// Auto-updater events
autoUpdater.on('update-available', () => {
  mainWindow.webContents.send('update_available');
});

autoUpdater.on('update-not-available', () => {
  mainWindow.webContents.send('update_not_available');
})

autoUpdater.on('download-progress', (progressObj) => {
  let log_message = `Download speed: ${progressObj.bytesPerSecond}`;
  log_message += ` - Downloaded ${progressObj.percent.toFixed()}%`;
  log_message += ` (${progressObj.transferred}/${progressObj.total})`;

  log.info(log_message);

  // Send progress to renderer process
  mainWindow?.webContents.send('update-progress', progressObj.percent.toFixed());
});

autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox({
    title: 'Install Updates',
    message: 'Updates downloaded, application will be quit for update...'
  }, () => {
    setImmediate(() => autoUpdater.quitAndInstall())
  });
})

autoUpdater.on('error', (error) => {
  log.info("Updater Error:", error);
  if (isNetworkError(error)) {
      log.info('Network Error');
  } else {
    dialog.showErrorBox('Error: ', error == null ? "unknown" : (error.stack || error).toString())
  }
})