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
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

declare global {
  interface Window {
    electronAPI: IElectronAPI
  }
}
