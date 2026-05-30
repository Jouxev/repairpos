export {}

declare global {
  interface Window {
    electronAPI: {
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
            currency?: string
            language?: string
          }
        }) => Promise<{ success: boolean; error?: string }>
      }
      backup: {
        getDirectory: () => Promise<{ success: boolean; folderPath: string }>
        createDatabaseBackup: (customFilename?: string) => Promise<{
          success: boolean
          backupPath?: string
          folderPath?: string
          filename?: string
          error?: string
        }>
        listDatabaseBackups: () => Promise<{
          success: boolean
          folderPath?: string
          backups: Array<{
            filename: string
            filePath: string
            size: number
            createdAt: string
            updatedAt: string
          }>
          error?: string
        }>
        restoreDatabaseBackup: (backupPath?: string) => Promise<{
          success: boolean
          restoredFrom?: string
          error?: string
        }>
        resetDatabase: () => Promise<{
          success: boolean
          backupPath?: string
          error?: string
        }>
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
  }
}
