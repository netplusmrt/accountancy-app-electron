// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.

const ipcRenderer = require('electron').ipcRenderer

// ipcRenderer.on('downloadStart', function (event) {
//     // document.getElementById("bar").style.display = "block";
// });



// ipcRenderer.on('downloadComplete', function (event) {
//     // document.getElementById("bar").style.display = "none";
// });

// ipcRenderer.on('store-data', function (event,store) {
//     // console.log(store);
// });

ipcRenderer.on('update_available', () => {
    console.log('Update available. Downloading...');
    // Notify the user
    document.getElementById("bar").style.display = "flex";
});

ipcRenderer.on('update_downloaded', () => {
    console.log('Update downloaded. Restart to apply.');
    // Prompt the user to restart
    const result = confirm('A new update is ready. Restart the app to apply it?');
    if (result) {
        ipcRenderer.send('restart_app');
    }
});

ipcRenderer.on('update-progress', function (percentage) {
    console.log(percentage);
    document.getElementById("bar").style.width = (percentage * 100) + "%";
    document.getElementById("bar").innerHTML = "Downloading " + parseInt(percentage * 100) + "%";
});

ipcMain.on('restart_app', () => {
    autoUpdater.quitAndInstall();
});


function isOnline() {
    return navigator.onLine;
}