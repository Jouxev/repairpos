"use strict";
const electron = require("electron");
const electronAPI = {
  db: {
    query: (params) => electron.ipcRenderer.invoke("db:query", params)
  },
  auth: {
    hashPassword: (password) => electron.ipcRenderer.invoke("auth:hashPassword", password),
    comparePassword: (password, hash) => electron.ipcRenderer.invoke("auth:comparePassword", password, hash)
  },
  app: {
    getVersion: () => electron.ipcRenderer.invoke("app:getVersion"),
    openExternal: (url) => electron.ipcRenderer.invoke("app:openExternal", url)
  }
};
electron.contextBridge.exposeInMainWorld("electronAPI", electronAPI);
//# sourceMappingURL=preload.js.map
