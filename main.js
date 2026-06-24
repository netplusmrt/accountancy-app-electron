// Modules to control application life and create native browser window
const {app, BrowserWindow, dialog, ipcMain, Menu} = require('electron')
const keytar = require('keytar')
const path = require('path')
const fs = require('fs');
const { autoUpdater } = require('electron-updater')
const log = require("electron-log");
const url = require("url");
const { pathToFileURL } = require("url");
const { updateUi } = require('./services/ui-updater');

const SERVICE_NAME = "AccountancyApp"

let mainWindow
let splashWindow
let previewWindow

function isPackagedMode() {
  const forceValue = String(process.env.FORCE_PACKAGED || '').toLowerCase();
  return app.isPackaged || forceValue === 'true' || forceValue === '1';
}

async function createSplashWindow() {
  const splash = new BrowserWindow({
    width: 700,
    height: 500,
    frame: false,
    transparent: false,
    resizable: false,
    alwaysOnTop: true,
    center: true,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true
    }
  });

  await splash.loadFile(path.join(__dirname, 'splash.html'));
  return splash;
}

async function createWindow () {

  const uiFolder = path.join(app.getPath('userData'), 'ui');
  const versionFile = path.join(app.getPath('userData'), 'ui-version.json');

  splashWindow = await createSplashWindow();

  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send('ui-update-status', 'Checking for UI updates...');
  }

  try {
    await updateUi(uiFolder, versionFile, (progress) => {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.webContents.send('ui-download-progress', progress);
      }
    });
  } catch (err) {
    console.error('Update failed:', err);
  }

  if (splashWindow && !splashWindow.isDestroyed()) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    icon: path.resolve(__dirname, "assets/icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true
    },
  });

  mainWindow.webContents.on('context-menu', (event, params) => {
    const template = [
      { role: 'undo', enabled: params.isEditable },
      { role: 'redo', enabled: params.isEditable },
      { type: 'separator' },
      { role: 'cut', enabled: params.isEditable },
      { role: 'copy', enabled: params.selectionText.length > 0 },
      { role: 'paste', enabled: params.isEditable },
      { role: 'selectAll' }
    ];

    if (!isPackagedMode()) {
      template.push(
        { type: 'separator' },
        {
          label: 'Inspect Element',
          click: () => mainWindow.webContents.inspectElement(params.x, params.y)
        }
      );
    }

    Menu.buildFromTemplate(template).popup({ window: mainWindow });
  });

  const downloadedIndex = path.join(uiFolder, 'index.html');

  console.log('Is Packed: ', isPackagedMode());

  if (isPackagedMode()) {
    if (fs.existsSync(downloadedIndex)) {
      console.log('Loading downloaded UI');
      mainWindow.loadURL(
        url.format({
          pathname: downloadedIndex,
          protocol: "file:",
          slashes: true
        })
      );
    } else {
      console.log('Loading bundled UI');
      mainWindow.loadURL(
        url.format({
          pathname: path.join(__dirname, `/accountancy-app/index.html`),
          protocol: "file:",
          slashes: true
        })
      );
    }
  } else {
    log.info("Debug Mode: Running in development");
    mainWindow.loadURL("http://localhost:4200");
    // Open the DevTools.
    // mainWindow.webContents.openDevTools()
  }

  mainWindow.webContents.once('did-finish-load', async () => {
    try {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
        splashWindow = null;
      }

      if (!mainWindow || mainWindow.isDestroyed()) {
        return;
      }

      mainWindow.show();

      await mainWindow.webContents.executeJavaScript(`
        (async () => {
          if (window.electron && typeof window.electron.invoke === 'function') {
            await window.electron.invoke('execute-main-function', 'data');
          }
        })();
      `);
    } catch (err) {
      log.error('Failed to initialize renderer logic:', err);
    }
  });

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

    if (app.isPackaged) {
      autoUpdater.checkForUpdates();
    }
  });
}

ipcMain.handle('get-app-version', async () => {
  return app.getVersion();
});

ipcMain.on('restart_app', () => {
  autoUpdater.quitAndInstall();
});

ipcMain.handle("keytar-save-password", async (_event, { account, password }) => {
  return keytar.setPassword(SERVICE_NAME, account, password)
})

ipcMain.handle("keytar-get-password", async (_event, account) => {
  return keytar.getPassword(SERVICE_NAME, account)
})

ipcMain.handle("keytar-delete-password", async (_event, account) => {
  return keytar.deletePassword(SERVICE_NAME, account)
})

ipcMain.handle("keytar-find-credentials", async () => {
  return keytar.findCredentials(SERVICE_NAME)
})

// Print Preview
let generatedPdfPath = null;
ipcMain.handle(
  'print-preview',
  async (event) => {
    const sourceWebContents = event.sender && !event.sender.isDestroyed()
      ? event.sender
      : mainWindow?.webContents;

    if (!sourceWebContents || sourceWebContents.isDestroyed()) {
      throw new Error('No active page available for print preview');
    }

    const pdfBuffer = await sourceWebContents.printToPDF({
      printBackground: true,
      landscape: false,
      pageSize: 'A4'
    });

    generatedPdfPath = path.join(
      app.getPath('temp'),
      `invoice-${Date.now()}.pdf`
    );

    fs.writeFileSync(generatedPdfPath, pdfBuffer);

    openPreviewWindow(generatedPdfPath);
  }
);

function openPreviewWindow(pdfPath) {
  if (previewWindow && !previewWindow.isDestroyed()) {
    previewWindow.show();
    previewWindow.focus();
    return;
  }

  previewWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    parent: mainWindow || undefined,
    autoHideMenuBar: true,
    show: true,
    title: 'Invoice Preview',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  previewWindow.on('closed', () => {
    previewWindow = null;
  });

  const previewUrl = pathToFileURL(pdfPath).toString();

  previewWindow.loadFile(path.join(__dirname, 'preview.html'), {
    query: {
      pdf: previewUrl
    }
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
  log.info('update_not_available');
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