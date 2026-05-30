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
    openExternal: (url) => electron.ipcRenderer.invoke("app:openExternal", url),
    close: () => electron.ipcRenderer.invoke("app:close")
  },
  setup: {
    getStatus: () => electron.ipcRenderer.invoke("setup:getStatus"),
    completeInitialSetup: (payload) => electron.ipcRenderer.invoke("setup:completeInitialSetup", payload)
  },
  backup: {
    getDirectory: () => electron.ipcRenderer.invoke("backup:getDirectory"),
    createDatabaseBackup: (customFilename) => electron.ipcRenderer.invoke("backup:createDatabaseBackup", customFilename),
    listDatabaseBackups: () => electron.ipcRenderer.invoke("backup:listDatabaseBackups"),
    restoreDatabaseBackup: (backupPath) => electron.ipcRenderer.invoke("backup:restoreDatabaseBackup", backupPath),
    resetDatabase: () => electron.ipcRenderer.invoke("backup:resetDatabase")
  },
  image: {
    save: (data) => electron.ipcRenderer.invoke("image:save", data)
  },
  printingTemplate: {
    getAll: () => electron.ipcRenderer.invoke("printing-template:getAll"),
    getById: (id) => electron.ipcRenderer.invoke("printing-template:getById", id),
    getDefault: (type) => electron.ipcRenderer.invoke("printing-template:getDefault", type),
    create: (template) => electron.ipcRenderer.invoke("printing-template:create", template),
    update: (id, template) => electron.ipcRenderer.invoke("printing-template:update", { id, template }),
    delete: (id) => electron.ipcRenderer.invoke("printing-template:delete", id),
    deleteAll: () => electron.ipcRenderer.invoke("printing-template:deleteAll"),
    setDefault: (id, type) => electron.ipcRenderer.invoke("printing-template:setDefault", { id, type })
  },
  printing: {
    listPrinters: () => electron.ipcRenderer.invoke("printing:listPrinters"),
    printHtml: (params) => electron.ipcRenderer.invoke("printing:printHtml", params)
  }
};
electron.contextBridge.exposeInMainWorld("electronAPI", electronAPI);
//# sourceMappingURL=preload.js.map
