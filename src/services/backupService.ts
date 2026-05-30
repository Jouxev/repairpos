export interface BackupMetadata {
  version: string
  timestamp: string
  databaseVersion: string
  size: number
  tables: string[]
  recordCounts: Record<string, number>
}

export interface BackupData {
  metadata: BackupMetadata
  data: Record<string, any[]>
}

export interface BackupOptions {
  includeAttachments?: boolean
  compressionLevel?: 'none' | 'low' | 'medium' | 'high'
  password?: string
  tables?: string[]
}

export interface DatabaseBackupFile {
  filename: string
  filePath: string
  size: number
  createdAt: string
  updatedAt: string
}

export interface RestoreOptions {
  mergeStrategy?: 'replace' | 'merge' | 'skip'
  password?: string
  validateOnly?: boolean
  tables?: string[]
}

class BackupService {
  private static instance: BackupService
  private readonly BACKUP_VERSION = '1.0'
  private readonly SUPPORTED_TABLES = {
    User: 'user',
    ShopSettings: 'shopSettings',
    Category: 'category',
    Product: 'product',
    Client: 'client',
    Supplier: 'supplier',
    Repair: 'repair',
    CashRegister: 'cashRegister',
    CashMovement: 'cashMovement',
    Sale: 'sale',
    SaleItem: 'saleItem',
    Purchase: 'purchase',
    PurchaseItem: 'purchaseItem',
    InventoryLog: 'inventoryLog',
    ActivityLog: 'activityLog',
    Notification: 'notification',
    Printer: 'printer',
    PrintTemplate: 'printTemplate',
    TemplateVersion: 'templateVersion',
    TemplateAssignment: 'templateAssignment',
    PrintHistory: 'printHistory',
  } as const

  private constructor() {}

  static getInstance(): BackupService {
    if (!BackupService.instance) {
      BackupService.instance = new BackupService()
    }
    return BackupService.instance
  }

  // Create a full database backup
  async createBackup(options: BackupOptions = {}): Promise<BackupData> {
    const timestamp = new Date().toISOString()
    const tablesToBackup = options.tables || Object.keys(this.SUPPORTED_TABLES)
    
    const data: Record<string, any[]> = {}
    const recordCounts: Record<string, number> = {}

    // Export data from each table
    for (const tableName of tablesToBackup) {
      try {
        const records = await this.exportTable(tableName)
        data[tableName] = records
        recordCounts[tableName] = records.length
      } catch (error) {
        console.error(`Error exporting table ${tableName}:`, error)
        data[tableName] = []
        recordCounts[tableName] = 0
      }
    }

    // Calculate total size
    const jsonData = JSON.stringify(data)
    const size = new Blob([jsonData]).size

    const metadata: BackupMetadata = {
      version: this.BACKUP_VERSION,
      timestamp,
      databaseVersion: await this.getDatabaseVersion(),
      size,
      tables: tablesToBackup,
      recordCounts,
    }

    return { metadata, data }
  }

  async getBackupDirectory(): Promise<string> {
    const result = await window.electronAPI.backup.getDirectory()
    if (!result.success) {
      throw new Error('Failed to get backup directory')
    }

    return result.folderPath
  }

  async createDatabaseBackup(customFilename?: string): Promise<{ backupPath: string; folderPath: string; filename: string }> {
    const result = await window.electronAPI.backup.createDatabaseBackup(customFilename)
    if (!result.success || !result.backupPath || !result.folderPath || !result.filename) {
      throw new Error(result.error || 'Failed to create database backup')
    }

    return {
      backupPath: result.backupPath,
      folderPath: result.folderPath,
      filename: result.filename,
    }
  }

  async listDatabaseBackups(): Promise<{ folderPath: string; backups: DatabaseBackupFile[] }> {
    const result = await window.electronAPI.backup.listDatabaseBackups()
    if (!result.success || !result.folderPath) {
      throw new Error(result.error || 'Failed to list database backups')
    }

    return {
      folderPath: result.folderPath,
      backups: result.backups || [],
    }
  }

  async restoreDatabaseBackup(backupPath?: string): Promise<string> {
    const result = await window.electronAPI.backup.restoreDatabaseBackup(backupPath)
    if (!result.success || !result.restoredFrom) {
      throw new Error(result.error || 'Failed to restore database backup')
    }

    return result.restoredFrom
  }

  async resetDatabase(): Promise<string | undefined> {
    const result = await window.electronAPI.backup.resetDatabase()
    if (!result.success) {
      throw new Error(result.error || 'Failed to reset database')
    }

    return result.backupPath
  }

  // Export a single table
  private async exportTable(tableName: string): Promise<any[]> {
    const model = this.SUPPORTED_TABLES[tableName as keyof typeof this.SUPPORTED_TABLES]
    if (!model) {
      throw new Error(`Model ${tableName} not found`)
    }

    const result = await window.electronAPI.db.query({
      model,
      operation: 'findMany',
      args: {},
    })

    if (!result.success) {
      throw new Error(result.error || `Failed to export ${tableName}`)
    }

    return Array.isArray(result.data) ? result.data : []
  }

  // Get database version
  private async getDatabaseVersion(): Promise<string> {
    return 'sqlite'
  }

  // Save backup to file
  async saveBackupToFile(backupData: BackupData, filePath?: string): Promise<string> {
    const jsonData = JSON.stringify(backupData, null, 2)
    const filename = filePath || `repairpro-backup-${new Date().toISOString().split('T')[0]}.json`

    const blob = new Blob([jsonData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)

    return filename
  }

  // Load backup from file
  async loadBackupFromFile(filePath?: string): Promise<BackupData> {
    throw new Error(
      filePath
        ? 'Direct file path restore is not supported in the renderer. Move restore to Electron IPC.'
        : 'Use loadBackupFromJson() with uploaded file contents until restore IPC is implemented.',
    )
  }

  loadBackupFromJson(jsonData: string): BackupData {
    const backupData = JSON.parse(jsonData) as BackupData
    if (!backupData.metadata || !backupData.data) {
      throw new Error('Invalid backup file format')
    }

    return backupData
  }

  // Restore backup to database
  async restoreBackup(backupData: BackupData, options: RestoreOptions = {}): Promise<void> {
    const { tables, mergeStrategy = 'replace' } = options
    const tablesToRestore = tables || Object.keys(backupData.data)

    // Validate backup version
    if (backupData.metadata.version !== this.BACKUP_VERSION) {
      console.warn(`Backup version mismatch: ${backupData.metadata.version} vs ${this.BACKUP_VERSION}`)
    }

    // Begin restoration
    for (const tableName of tablesToRestore) {
      const records = backupData.data[tableName]
      if (!records || records.length === 0) continue

      try {
        switch (mergeStrategy) {
          case 'replace':
            await this.replaceTableData(tableName, records)
            break
          case 'merge':
            await this.mergeTableData(tableName, records)
            break
          case 'skip':
            // Skip if table has data
            const existingCount = await this.getTableCount(tableName)
            if (existingCount === 0) {
              await this.replaceTableData(tableName, records)
            }
            break
        }
      } catch (error) {
        console.error(`Error restoring table ${tableName}:`, error)
        throw error
      }
    }
  }

  // Replace all data in a table
  private async replaceTableData(tableName: string, records: any[]): Promise<void> {
    const model = this.SUPPORTED_TABLES[tableName as keyof typeof this.SUPPORTED_TABLES]
    if (!model) {
      throw new Error(`Model ${tableName} not found`)
    }

    await window.electronAPI.db.query({
      model,
      operation: 'deleteMany',
      args: {},
    })

    for (const record of records) {
      await window.electronAPI.db.query({
        model,
        operation: 'create',
        args: {
          data: record,
        },
      })
    }
  }

  // Merge records with existing data (upsert)
  private async mergeTableData(tableName: string, records: any[]): Promise<void> {
    const model = this.SUPPORTED_TABLES[tableName as keyof typeof this.SUPPORTED_TABLES]
    if (!model) {
      throw new Error(`Model ${tableName} not found`)
    }

    for (const record of records) {
      const { id, ...data } = record
      
      try {
        const existing = await window.electronAPI.db.query({
          model,
          operation: 'findUnique',
          args: {
            where: { id },
          },
        })

        if (existing.success && existing.data) {
          await window.electronAPI.db.query({
            model,
            operation: 'update',
            args: {
              where: { id },
              data,
            },
          })
        } else {
          await window.electronAPI.db.query({
            model,
            operation: 'create',
            args: {
              data: record,
            },
          })
        }
      } catch (error) {
        console.warn(`Failed to upsert record ${id} in ${tableName}:`, error)
      }
    }
  }

  // Get count of records in a table
  private async getTableCount(tableName: string): Promise<number> {
    const model = this.SUPPORTED_TABLES[tableName as keyof typeof this.SUPPORTED_TABLES]
    if (!model) return 0

    const result = await window.electronAPI.db.query({
      model,
      operation: 'count',
      args: {},
    })

    return result.success ? Number(result.data || 0) : 0
  }

  // Get backup statistics
  async getBackupStats(): Promise<{
    totalProducts: number
    totalSales: number
    totalRepairs: number
    totalCustomers: number
    databaseSize: string
    lastBackupDate?: Date
  }> {
    const [
      totalProducts,
      totalSales,
      totalRepairs,
      totalCustomers,
    ] = await Promise.all([
      this.getTableCount('Product'),
      this.getTableCount('Sale'),
      this.getTableCount('Repair'),
      this.getTableCount('Client'),
    ])

    // Get database file size
    const dbSize = 'Unknown' // Would need to check file system

    return {
      totalProducts,
      totalSales,
      totalRepairs,
      totalCustomers,
      databaseSize: dbSize,
    }
  }
}

export const backupService = BackupService.getInstance()
export default backupService
