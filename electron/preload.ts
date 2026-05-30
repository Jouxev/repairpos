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
    close: () => Promise<{ success: boolean }>
  }
  setup: {
    getStatus: () => Promise<{
      success: boolean
      hasAdmin: boolean
      hasShopSettings: boolean
      needsOnboarding: boolean
      error?: string
    }>
    completeInitialSetup: (payload: {
      admin: {
        username: string
        email: string
        password: string
        fullName: string
        phone?: string
      }
      shop: {
        shopName: string
        shopAddress?: string
        shopPhone?: string
        shopEmail?: string
        shopLogo?: string
      }
    }) => Promise<{ success: boolean; error?: string }>
  }
  backup: {
    getDirectory: () => Promise<{ success: boolean; folderPath: string }>
    createDatabaseBackup: (customFilename?: string) => Promise<{ success: boolean; backupPath?: string; folderPath?: string; filename?: string; error?: string }>
    listDatabaseBackups: () => Promise<{ success: boolean; folderPath?: string; backups: Array<{ filename: string; filePath: string; size: number; createdAt: string; updatedAt: string }>; error?: string }>
    restoreDatabaseBackup: (backupPath?: string) => Promise<{ success: boolean; restoredFrom?: string; error?: string }>
    resetDatabase: () => Promise<{ success: boolean; backupPath?: string; error?: string }>
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
  printing: {
    listPrinters: () => Promise<Array<{
      name: string
      displayName: string
      description?: string
      isDefault: boolean
      status?: number
    }>>
    printHtml: (params: {
      html: string
      title?: string
      printerName?: string
      silent?: boolean
    }) => Promise<{ success: boolean }>
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
    close: () => ipcRenderer.invoke('app:close'),
  },
  setup: {
    getStatus: () => ipcRenderer.invoke('setup:getStatus'),
    completeInitialSetup: (payload) => ipcRenderer.invoke('setup:completeInitialSetup', payload),
  },
  backup: {
    getDirectory: () => ipcRenderer.invoke('backup:getDirectory'),
    createDatabaseBackup: (customFilename?: string) => ipcRenderer.invoke('backup:createDatabaseBackup', customFilename),
    listDatabaseBackups: () => ipcRenderer.invoke('backup:listDatabaseBackups'),
    restoreDatabaseBackup: (backupPath?: string) => ipcRenderer.invoke('backup:restoreDatabaseBackup', backupPath),
    resetDatabase: () => ipcRenderer.invoke('backup:resetDatabase'),
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
  printing: {
    listPrinters: () => ipcRenderer.invoke('printing:listPrinters'),
    printHtml: (params) => ipcRenderer.invoke('printing:printHtml', params),
  },
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

declare global {
  interface Window {
    electronAPI: IElectronAPI
  }
}
