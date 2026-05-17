import { contextBridge, ipcRenderer } from 'electron'

export interface IElectronAPI {
  db: {
    query: (params: { model: string; operation: string; args?: any }) => Promise<any>
  }
  auth: {
    hashPassword: (password: string) => Promise<string>
    comparePassword: (password: string, hash: string) => Promise<boolean>
  }
  app: {
    getVersion: () => Promise<string>
    openExternal: (url: string) => Promise<void>
  }
  image: {
    save: (data: { base64Data: string; filename: string; folder: string }) => Promise<string>
  }
  printingTemplate: {
    getAll: () => Promise<any[]>
    getById: (id: string) => Promise<any>
    getDefault: (type: string) => Promise<any>
    create: (template: any) => Promise<any>
    update: (id: string, template: any) => Promise<any>
    delete: (id: string) => Promise<void>
    deleteAll: () => Promise<void>
    setDefault: (id: string, type: string) => Promise<void>
  }
}

const electronAPI: IElectronAPI = {
  db: {
    query: (params) => ipcRenderer.invoke('db:query', params),
  },
  auth: {
    hashPassword: (password) => ipcRenderer.invoke('auth:hashPassword', password),
    comparePassword: (password, hash) => ipcRenderer.invoke('auth:comparePassword', password, hash),
  },
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    openExternal: (url) => ipcRenderer.invoke('app:openExternal', url),
  },
  image: {
    save: (data) => ipcRenderer.invoke('image:save', data),
  },
  printingTemplate: {
    getAll: () => ipcRenderer.invoke('printing-template:getAll'),
    getById: (id: string) => ipcRenderer.invoke('printing-template:getById', id),
    getDefault: (type: string) => ipcRenderer.invoke('printing-template:getDefault', type),
    create: (template: any) => ipcRenderer.invoke('printing-template:create', template),
    update: (id: string, template: any) => ipcRenderer.invoke('printing-template:update', { id, template }),
    delete: (id: string) => ipcRenderer.invoke('printing-template:delete', id),
    deleteAll: () => ipcRenderer.invoke('printing-template:deleteAll'),
    setDefault: (id: string, type: string) => ipcRenderer.invoke('printing-template:setDefault', { id, type }),
  },
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

declare global {
  interface Window {
    electronAPI: IElectronAPI
  }
}
