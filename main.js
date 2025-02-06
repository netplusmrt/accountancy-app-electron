// Modules to control application life and create native browser window
const {app, BrowserWindow, dialog} = require('electron')
// const {download} = require('electron-dl');
const path = require('path')
const fs = require('fs');
const { autoUpdater } = require('electron-updater')
const log = require("electron-log");
const url = require("url");
const server = 'https://www.accountancyapp.in'

let mainWindow

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
  })

  mainWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, `/accountancy-app/index.html`),
      protocol: "file:",
      slashes: true
    })
  );

  // Open the DevTools.
  //   mainWindow.webContents.openDevTools()

  mainWindow.maximize()

  mainWindow.on('closed', function () {
    mainWindow = null
  })

  // e.g. for Windows and app version 1.2.3
  // https://your-deployment-url.com/update/win32/1.2.3
  // const feedURL = `${server}/update/${process.platform}/${app.getVersion()}`
  const feedURL = `${server}/update`

  console.log(feedURL);
  log.info(feedURL);

  autoUpdater.forceDevUpdateConfig = true;
  autoUpdater.setFeedURL(feedURL)
  autoUpdater.checkForUpdates();
}

app.on('ready', createWindow)

app.on('ready', function()  {
  // console.log(process);
  // DownloadSetup();
  autoUpdater.logger = log;
  autoUpdater.logger.transports.file.level = "info"
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
  if (mainWindow === null) createWindow()
})

    // In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

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

function DownloadSetup(version){

  // console.log(process);
  let packageUrl = `${server}/update/${process.arch}/accountancy-app-${version}-setup.zip`;
  download( mainWindow, packageUrl, {
    directory: global.downloadPath,
    onStarted: item => {
      console.log(item);
      console.log('download starts...');
      mainWindow.webContents.send('downloadStart', null);
    },
    onProgress: progress => {
      let log_message = progress.percent + "% | " + progress.transferredBytes + " bytes out of " + progress.totalBytes + " bytes.";
      log.info(log_message);
      setBar(progress.percent);
    },
    onCancel: item => {
      console.log('download canceled.');
      console.log(item);
    },
    openFolderWhenDone: true
  }).then(() => {
    onDownloadComplete();
  });

}

function setBar(percentage) {
  mainWindow.webContents.send('progress', percentage);
}

function onDownloadComplete() {
  mainWindow.webContents.send('downloadComplete', null);
  
  dialog.showMessageBox({
    title: 'Install Updates',
    message: 'Updates downloaded, application will be quit for update...'
  }).then(() => {
    setImmediate(() => {
      if (process.platform !== 'darwin') app.quit()
    });
  });
}

// setInterval(() => {
//   autoUpdater.checkForUpdates()
// }, 60000)


let updater
autoUpdater.autoDownload = true

// autoUpdater.checkForUpdates();


autoUpdater.on('error', (error) => {
  console.error("Updater Error:", error);
  if (isNetworkError(error)) {
      log.info('Network Error');
  } else {
    dialog.showErrorBox('Error: ', error == null ? "unknown" : (error.stack || error).toString())
  }
})

// autoUpdater.on('update-available', (updateInfo) => {
//   console.log('update-available');
//   dialog.showMessageBox({
//     type: 'info',
//     title: 'Found Updates',
//     message: 'Found updates, do you want update now?',
//     buttons: ['Sure', 'No']
//   }).then((res) => {
//     if (res.response === 0) {
//       DownloadSetup(updateInfo.version);
//     }
//     else {
//       updater = null
//     }
//   });
// })

// Auto-updater events
autoUpdater.on('update-available', () => {
  mainWindow.webContents.send('update_available');
});

autoUpdater.on('download-progress', (progressObj) => {
  let log_message = `Download speed: ${progressObj.bytesPerSecond}`;
  log_message += ` - Downloaded ${progressObj.percent.toFixed(2)}%`;
  log_message += ` (${progressObj.transferred}/${progressObj.total})`;

  console.log(log_message);

  // Send progress to renderer process
  mainWindow?.webContents.send('update-progress', progressObj.percent);
});

autoUpdater.on('update-downloaded', () => {
  mainWindow.webContents.send('update_downloaded');
});

autoUpdater.on('update-not-available', () => {
  dialog.showMessageBox({
    title: 'No Updates',
    message: 'Current version is up-to-date.'
  })
  // updater.enabled = true
  updater = null
})

autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox({
    title: 'Install Updates',
    message: 'Updates downloaded, application will be quit for update...'
  }, () => {
    setImmediate(() => autoUpdater.quitAndInstall())
  });
})
  
autoUpdater.on('download-progress', (progressObj) => {
    let log_message = "Download speed: " + progressObj.bytesPerSecond;
    log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
    log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
    sendStatusToWindow(log_message);
})

function sendStatusToWindow(text) {
    log.info(text);
    mainWindow.webContents.send( "message", text )
    // homePageWindow.webContents.send('message', text);
}