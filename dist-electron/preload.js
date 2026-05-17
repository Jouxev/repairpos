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
  }
};
electron.contextBridge.exposeInMainWorld("electronAPI", electronAPI);
//# sourceMappingURL=preload.js.map
