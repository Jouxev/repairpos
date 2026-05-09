import { PrismaClient } from '@prisma/client'
import { dialog } from '@electron/remote'
import { writeFile, readFile } from 'fs/promises'
import { join } from 'path'

const prisma = new PrismaClient()

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

export interface RestoreOptions {
  mergeStrategy?: 'replace' | 'merge' | 'skip'
  password?: string
  validateOnly?: boolean
  tables?: string[]
}

class BackupService {
  private static instance: BackupService
  private readonly BACKUP_VERSION = '1.0'
  private readonly SUPPORTED_TABLES = [
    'User',
    'ShopSettings',
    'Category',
    'Product',
    'Client',
    'Supplier',
    'Repair',
    'RepairPart',
    'CashRegister',
    'CashMovement',
    'Sale',
    'SaleItem',
    'Purchase',
    'PurchaseItem',
    'InventoryLog',
    'ActivityLog',
    'Notification',
  ]

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
    const tablesToBackup = options.tables || this.SUPPORTED_TABLES
    
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

  // Export a single table
  private async exportTable(tableName: string): Promise<any[]> {
    const model = (prisma as any)[tableName.toLowerCase()]
    if (!model) {
      throw new Error(`Model ${tableName} not found`)
    }

    return await model.findMany()
  }

  // Get database version
  private async getDatabaseVersion(): Promise<string> {
    try {
      const result = await prisma.$queryRaw`SELECT sqlite_version()`
      return (result as any)[0]['sqlite_version()']
    } catch {
      return 'unknown'
    }
  }

  // Save backup to file
  async saveBackupToFile(backupData: BackupData, filePath?: string): Promise<string> {
    const jsonData = JSON.stringify(backupData, null, 2)
    
    let targetPath = filePath
    if (!targetPath) {
      // Show save dialog
      const result = await dialog.showSaveDialog({
        defaultPath: `repairpro-backup-${new Date().toISOString().split('T')[0]}.json`,
        filters: [
          { name: 'JSON Backup', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      })
      
      if (result.canceled || !result.filePath) {
        throw new Error('Save cancelled')
      }
      targetPath = result.filePath
    }

    await writeFile(targetPath, jsonData, 'utf-8')
    return targetPath
  }

  // Load backup from file
  async loadBackupFromFile(filePath?: string): Promise<BackupData> {
    let targetPath = filePath
    
    if (!targetPath) {
      // Show open dialog
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
          { name: 'JSON Backup', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      })
      
      if (result.canceled || result.filePaths.length === 0) {
        throw new Error('Open cancelled')
      }
      targetPath = result.filePaths[0]
    }

    const jsonData = await readFile(targetPath, 'utf-8')
    const backupData = JSON.parse(jsonData) as BackupData
    
    // Validate backup
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
    const model = (prisma as any)[tableName.toLowerCase()]
    if (!model) {
      throw new Error(`Model ${tableName} not found`)
    }

    // Delete all existing records
    await model.deleteMany({})

    // Insert new records in batches
    const batchSize = 100
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize)
      await model.createMany({
        data: batch,
        skipDuplicates: true,
      })
    }
  }

  // Merge records with existing data (upsert)
  private async mergeTableData(tableName: string, records: any[]): Promise<void> {
    const model = (prisma as any)[tableName.toLowerCase()]
    if (!model) {
      throw new Error(`Model ${tableName} not found`)
    }

    // Process records one by one
    for (const record of records) {
      const { id, ...data } = record
      
      try {
        await model.upsert({
          where: { id },
          update: data,
          create: record,
        })
      } catch (error) {
        console.warn(`Failed to upsert record ${id} in ${tableName}:`, error)
      }
    }
  }

  // Get count of records in a table
  private async getTableCount(tableName: string): Promise<number> {
    const model = (prisma as any)[tableName.toLowerCase()]
    if (!model) return 0

    const count = await model.count()
    return count
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
      prisma.product.count(),
      prisma.sale.count(),
      prisma.repair.count(),
      prisma.client.count(),
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
