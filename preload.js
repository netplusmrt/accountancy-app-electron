// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  send: (channel, data) => ipcRenderer.send(channel, data),
  invoke: (channel, data) => ipcRenderer.invoke(channel, data),
  receive: (channel, callback) => {
    ipcRenderer.on(channel, (event, ...args) => callback(...args));
  },
  once: (channel, callback) => {
    ipcRenderer.once(channel, (event, ...args) => callback(...args));
  }
});

contextBridge.exposeInMainWorld("secureStore", {
  savePassword: (account, password) =>
    ipcRenderer.invoke("keytar-save-password", { account, password }),
  getPassword: (account) =>
    ipcRenderer.invoke("keytar-get-password", account),
  deletePassword: (account) =>
    ipcRenderer.invoke("keytar-delete-password", account),
  findCredentials: () =>
    ipcRenderer.invoke("keytar-find-credentials")
});
