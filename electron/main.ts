import { app, BrowserWindow, dialog, ipcMain, net, protocol, shell } from 'electron'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import fs from 'fs'
import { execFileSync } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow: BrowserWindow | null
let prisma: PrismaClient
const databaseFilePath = path.join(process.cwd(), 'prisma', 'repairpro.db')
let databaseInitPromise: Promise<void> | null = null

const ensureBackupDirectory = () => {
  const backupDir = path.join(process.cwd(), 'backups', 'database')
  fs.mkdirSync(backupDir, { recursive: true })
  return backupDir
}

const formatTimestampForFile = (date = new Date()) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hours = `${date.getHours()}`.padStart(2, '0')
  const minutes = `${date.getMinutes()}`.padStart(2, '0')
  const seconds = `${date.getSeconds()}`.padStart(2, '0')
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`
}

const runPrismaDbPush = () => {
  const prismaCliEntry = path.join(process.cwd(), 'node_modules', 'prisma', 'build', 'index.js')

  if (!fs.existsSync(prismaCliEntry)) {
    throw new Error(`Prisma CLI not found at ${prismaCliEntry}`)
  }

  if (process.platform === 'win32') {
    const command = process.env.ComSpec || 'cmd.exe'
    const prismaCommand = `"${path.join(process.cwd(), 'node_modules', '.bin', 'prisma.cmd')}" db push --accept-data-loss --skip-generate`

    try {
      execFileSync(command, ['/d', '/s', '/c', prismaCommand], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          DATABASE_URL: process.env.DATABASE_URL || 'file:./repairpro.db',
        },
        stdio: 'pipe',
        windowsHide: true,
      })
      return
    } catch (error: any) {
      const stderr = error?.stderr ? String(error.stderr) : ''
      const stdout = error?.stdout ? String(error.stdout) : ''
      throw new Error(stderr || stdout || error?.message || 'Prisma db push failed')
    }
  }

  try {
    execFileSync(path.join(process.cwd(), 'node_modules', '.bin', 'prisma'), ['db', 'push', '--accept-data-loss', '--skip-generate'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL || 'file:./repairpro.db',
      },
      stdio: 'pipe',
    })
  } catch (error: any) {
    const stderr = error?.stderr ? String(error.stderr) : ''
    const stdout = error?.stdout ? String(error.stdout) : ''
    throw new Error(stderr || stdout || error?.message || 'Prisma db push failed')
  }
}

const ensureDatabaseSchema = async () => {
  fs.mkdirSync(path.dirname(databaseFilePath), { recursive: true })

  let probe: PrismaClient | null = null
  let needsSchemaRebuild = false

  try {
    probe = new PrismaClient()
    await probe.user.count()
  } catch (error) {
    console.warn('Database schema missing or invalid. Rebuilding SQLite schema.')
    needsSchemaRebuild = true
  } finally {
    if (probe) {
      await probe.$disconnect()
    }
  }

  if (needsSchemaRebuild) {
    runPrismaDbPush()
  }
}

const resolveWritablePublicPath = (...segments: string[]) => {
  const candidates = [
    path.join(process.cwd(), 'repairpro', 'public', ...segments),
    path.join(process.cwd(), 'public', ...segments),
    path.join(path.dirname(app.getAppPath()), 'public', ...segments),
    path.join(path.dirname(app.getPath('exe')), 'public', ...segments),
    path.join(app.getPath('userData'), 'public', ...segments),
    path.join(app.getAppPath(), 'public', ...segments),
  ]

  const writableCandidate = candidates.find((candidate) => {
    const baseDir = path.dirname(candidate)

    if (baseDir.includes('.asar')) {
      return false
    }

    try {
      fs.mkdirSync(baseDir, { recursive: true })
      fs.accessSync(baseDir, fs.constants.W_OK)
      return true
    } catch {
      return false
    }
  })

  return writableCandidate || candidates[candidates.length - 1]
}

const resolveWritablePublicFilePath = (relativePath: string) => {
  const safeSegments = relativePath
    .split(/[\\/]+/)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .filter((segment) => segment !== '.' && segment !== '..')

  return resolveWritablePublicPath(...safeSegments)
}

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    show: false,
    titleBarStyle: 'default',
    webPreferences: {
      preload: path.join(__dirname, '../dist-electron/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

const initDatabase = async () => {
  if (databaseInitPromise) {
    return databaseInitPromise
  }

  databaseInitPromise = (async () => {
    try {
      await ensureDatabaseSchema()
      prisma = new PrismaClient()

      console.log('Database initialized successfully')
    } catch (error) {
      console.error('Database initialization error:', error)
      throw error
    } finally {
      databaseInitPromise = null
    }
  })()

  try {
    await databaseInitPromise
  } catch (error) {
    throw error
  }
}

const ensurePrismaClient = async () => {
  if (!prisma) {
    await initDatabase()
  }

  if (!prisma) {
    throw new Error('Database not initialized')
  }

  return prisma
}

// IPC Handlers
// Generic database query handler
ipcMain.handle('db:query', async (_, { model, operation, args = {} }) => {
  try {
    const client = await ensurePrismaClient()

    if (!client[model] || typeof client[model][operation] !== 'function') {
      throw new Error(`Invalid model or operation: ${model}.${operation}`)
    }
    
    const result = await client[model][operation](args)
    return { success: true, data: result }
  } catch (error) {
    console.error(`Database error (${model}.${operation}):`, error)
    return { success: false, error: error.message }
  }
})

// User-specific handlers with password hashing
ipcMain.handle('user:create', async (_, userData) => {
  try {
    // Check if username or email already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: userData.username },
          { email: userData.email }
        ]
      }
    })

    if (existingUser) {
      throw new Error('Username or email already exists')
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        username: userData.username,
        email: userData.email,
        password: hashedPassword,
        fullName: userData.fullName,
        phone: userData.phone,
        role: userData.role,
        isActive: userData.isActive ?? true,
        avatar: userData.avatar,
      }
    })

    // Remove password from response
    const { password, ...userWithoutPassword } = user
    return { success: true, user: userWithoutPassword }
  } catch (error) {
    console.error('Error creating user:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('user:update', async (_, { id, data }) => {
  try {
    const updateData: any = { ...data }
    
    // Handle password update separately
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10)
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData
    })

    // Remove password from response
    const { password, ...userWithoutPassword } = user
    return { success: true, user: userWithoutPassword }
  } catch (error) {
    console.error('Error updating user:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('user:delete', async (_, id) => {
  try {
    await prisma.user.delete({ where: { id } })
    return { success: true }
  } catch (error) {
    console.error('Error deleting user:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('auth:hashPassword', async (_, password: string) => {
  return bcrypt.hash(password, 10)
})

ipcMain.handle('auth:comparePassword', async (_, password: string, hash: string) => {
  return bcrypt.compare(password, hash)
})

ipcMain.handle('app:getVersion', () => {
  return app.getVersion()
})

ipcMain.handle('app:openExternal', async (_, url: string) => {
  await shell.openExternal(url)
})

ipcMain.handle('setup:getStatus', async () => {
  try {
    const client = await ensurePrismaClient()
    const [adminCount, shopSettingsCount] = await Promise.all([
      client.user.count({ where: { role: 'ADMIN' } }),
      client.shopSettings.count(),
    ])

    return {
      success: true,
      hasAdmin: adminCount > 0,
      hasShopSettings: shopSettingsCount > 0,
      needsOnboarding: adminCount === 0 || shopSettingsCount === 0,
    }
  } catch (error: any) {
    console.error('Failed to get setup status:', error)
    return {
      success: false,
      error: error.message || 'Failed to get setup status',
      hasAdmin: false,
      hasShopSettings: false,
      needsOnboarding: true,
    }
  }
})

ipcMain.handle('setup:completeInitialSetup', async (_, payload: {
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
}) => {
  try {
    const client = await ensurePrismaClient()
    const adminCount = await client.user.count({ where: { role: 'ADMIN' } })
    const existingUser = await client.user.findFirst({
      where: {
        OR: [
          { username: payload.admin.username },
          { email: payload.admin.email },
        ],
      },
    })

    if (existingUser && adminCount === 0) {
      throw new Error('Username or email already exists')
    }

    if (adminCount === 0) {
      const hashedPassword = await bcrypt.hash(payload.admin.password, 10)
      await client.user.create({
        data: {
          username: payload.admin.username.trim(),
          email: payload.admin.email.trim(),
          password: hashedPassword,
          fullName: payload.admin.fullName.trim(),
          phone: payload.admin.phone?.trim() || null,
          role: 'ADMIN',
          isActive: true,
        },
      })
    }

    const shopData = {
      shopName: payload.shop.shopName.trim(),
      shopAddress: payload.shop.shopAddress?.trim() || null,
      shopPhone: payload.shop.shopPhone?.trim() || null,
      shopEmail: payload.shop.shopEmail?.trim() || null,
      shopLogo: payload.shop.shopLogo?.trim() || null,
      currency: 'USD',
      currencySymbol: '$',
      taxRate: 0,
      language: 'en',
      timezone: 'UTC',
      receiptFooter: 'Thank you for your business!',
      thermalPrinterWidth: 80,
    }

    const existingSettings = await client.shopSettings.findFirst()

    if (existingSettings) {
      await client.shopSettings.update({
        where: { id: existingSettings.id },
        data: shopData,
      })
    } else {
      await client.shopSettings.create({
        data: shopData,
      })
    }

    return { success: true }
  } catch (error: any) {
    console.error('Failed to complete initial setup:', error)
    return {
      success: false,
      error: error.message || 'Failed to complete setup',
    }
  }
})

ipcMain.handle('app:close', async () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close()
  } else {
    app.quit()
  }

  return { success: true }
})

ipcMain.handle('backup:getDirectory', async () => {
  const folderPath = ensureBackupDirectory()
  return {
    success: true,
    folderPath,
  }
})

ipcMain.handle('backup:createDatabaseBackup', async (_, customFilename?: string) => {
  try {
    if (prisma) {
      await prisma.$disconnect()
    }

    const backupDir = ensureBackupDirectory()
    const filename = customFilename?.trim() || `repairpro-backup-${formatTimestampForFile()}.db`
    const backupPath = path.join(backupDir, filename)
    fs.copyFileSync(databaseFilePath, backupPath)

    prisma = new PrismaClient()

    return {
      success: true,
      backupPath,
      folderPath: backupDir,
      filename,
    }
  } catch (error: any) {
    prisma = new PrismaClient()
    console.error('Failed to create database backup:', error)
    return {
      success: false,
      error: error.message || 'Failed to create backup',
    }
  }
})

ipcMain.handle('backup:listDatabaseBackups', async () => {
  try {
    const backupDir = ensureBackupDirectory()
    const backups = fs
      .readdirSync(backupDir)
      .filter((file) => file.toLowerCase().endsWith('.db'))
      .map((file) => {
        const filePath = path.join(backupDir, file)
        const stats = fs.statSync(filePath)
        return {
          filename: file,
          filePath,
          size: stats.size,
          createdAt: stats.birthtime.toISOString(),
          updatedAt: stats.mtime.toISOString(),
        }
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

    return {
      success: true,
      folderPath: backupDir,
      backups,
    }
  } catch (error: any) {
    console.error('Failed to list database backups:', error)
    return {
      success: false,
      error: error.message || 'Failed to list backups',
      backups: [],
    }
  }
})

ipcMain.handle('backup:restoreDatabaseBackup', async (_, backupPath?: string) => {
  try {
    let sourcePath = backupPath

    if (!sourcePath) {
      const result = await dialog.showOpenDialog(mainWindow || undefined, {
        title: 'Select Database Backup',
        properties: ['openFile'],
        filters: [{ name: 'Database Backup', extensions: ['db'] }],
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: 'Restore cancelled' }
      }

      sourcePath = result.filePaths[0]
    }

    if (!sourcePath || !fs.existsSync(sourcePath)) {
      return { success: false, error: 'Backup file not found' }
    }

    if (prisma) {
      await prisma.$disconnect()
    }

    fs.copyFileSync(sourcePath, databaseFilePath)
    prisma = new PrismaClient()

    return {
      success: true,
      restoredFrom: sourcePath,
    }
  } catch (error: any) {
    prisma = new PrismaClient()
    console.error('Failed to restore database backup:', error)
    return {
      success: false,
      error: error.message || 'Failed to restore backup',
    }
  }
})

ipcMain.handle('backup:resetDatabase', async () => {
  try {
    const backupDir = ensureBackupDirectory()
    const resetBackupPath = path.join(backupDir, `repairpro-pre-reset-${formatTimestampForFile()}.db`)

    if (fs.existsSync(databaseFilePath)) {
      fs.copyFileSync(databaseFilePath, resetBackupPath)
    }

    await prisma.$transaction([
      prisma.notification.deleteMany(),
      prisma.activityLog.deleteMany(),
      prisma.technicianEarning.deleteMany(),
      prisma.cashMovement.deleteMany(),
      prisma.saleItem.deleteMany(),
      prisma.sale.deleteMany(),
      prisma.inventoryLog.deleteMany(),
      prisma.purchaseItem.deleteMany(),
      prisma.purchase.deleteMany(),
      prisma.repair.deleteMany(),
      prisma.product.deleteMany(),
      prisma.category.deleteMany(),
      prisma.client.deleteMany(),
      prisma.supplier.deleteMany(),
      prisma.cashRegister.deleteMany(),
      prisma.templateAssignment.deleteMany(),
      prisma.templateVersion.deleteMany(),
      prisma.printHistory.deleteMany(),
      prisma.printTemplate.deleteMany(),
      prisma.printer.deleteMany(),
      prisma.user.deleteMany({
        where: {
          role: {
            not: 'ADMIN',
          },
        },
      }),
    ])

    return {
      success: true,
      backupPath: resetBackupPath,
    }
  } catch (error: any) {
    prisma = new PrismaClient()
    console.error('Failed to reset database:', error)
    return {
      success: false,
      error: error.message || 'Failed to reset database',
    }
  }
})

// Image upload handler - saves images to media folder
ipcMain.handle('image:save', async (_, { base64Data, filename, folder }: { base64Data: string; filename: string; folder: string }) => {
  try {
    const mediaFolder = resolveWritablePublicPath('media', folder)

    if (!fs.existsSync(mediaFolder)) {
      fs.mkdirSync(mediaFolder, { recursive: true })
    }

    const filePath = path.join(mediaFolder, filename)
    const buffer = Buffer.from(base64Data, 'base64')
    fs.writeFileSync(filePath, buffer)

    return `/media/${folder}/${filename}`
  } catch (error) {
    console.error('Error saving image:', error)
    throw error
  }
})

ipcMain.handle('printing:listPrinters', async () => {
  if (!mainWindow) {
    return []
  }

  const printers = await mainWindow.webContents.getPrintersAsync()
  return printers.map((printer) => ({
    name: printer.name,
    displayName: printer.displayName,
    description: printer.description,
    isDefault: printer.isDefault,
    status: printer.status,
  }))
})

ipcMain.handle('printing:printHtml', async (_, { html, title, printerName, silent }: { html: string; title?: string; printerName?: string; silent?: boolean }) => {
  const printWindow = new BrowserWindow({
    width: 900,
    height: 1200,
    show: false,
    title: title || 'Print',
    webPreferences: {
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  try {
    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)

    const result = await new Promise<{ success: boolean }>((resolve, reject) => {
      const executePrint = () => {
        printWindow.webContents.print(
          {
            silent: Boolean(silent),
            deviceName: printerName || undefined,
            printBackground: true,
          },
          (success, failureReason) => {
            if (!success) {
              reject(new Error(failureReason || 'Print failed'))
              return
            }

            resolve({ success: true })
          },
        )
      }

      if (printWindow.webContents.isLoading()) {
        printWindow.webContents.once('did-finish-load', () => setTimeout(executePrint, 150))
      } else {
        setTimeout(executePrint, 150)
      }
    })

    return result
  } finally {
    if (!printWindow.isDestroyed()) {
      printWindow.close()
    }
  }
})

// Printing Template IPC Handlers
ipcMain.handle('printing-template:getAll', async () => {
  try {
    const templates = await prisma.printTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return templates.map(t => ({
      ...t,
      headerFields: JSON.parse(t.headerFields),
      bodyFields: JSON.parse(t.bodyFields),
      footerFields: JSON.parse(t.footerFields),
    }))
  } catch (error) {
    console.error('Error getting all templates:', error)
    throw error
  }
})

ipcMain.handle('printing-template:getById', async (_, id: string) => {
  try {
    const template = await prisma.printTemplate.findUnique({ where: { id } })
    if (!template) return null
    return {
      ...template,
      headerFields: JSON.parse(template.headerFields),
      bodyFields: JSON.parse(template.bodyFields),
      footerFields: JSON.parse(template.footerFields),
    }
  } catch (error) {
    console.error('Error getting template by ID:', error)
    throw error
  }
})

ipcMain.handle('printing-template:create', async (_, template: any) => {
  try {
    const created = await prisma.printTemplate.create({
      data: {
        ...template,
        headerFields: JSON.stringify(template.headerFields || []),
        bodyFields: JSON.stringify(template.bodyFields || []),
        footerFields: JSON.stringify(template.footerFields || []),
      },
    })
    return {
      ...created,
      headerFields: JSON.parse(created.headerFields),
      bodyFields: JSON.parse(created.bodyFields),
      footerFields: JSON.parse(created.footerFields),
    }
  } catch (error) {
    console.error('Error creating template:', error)
    throw error
  }
})

ipcMain.handle('printing-template:update', async (_, { id, template }: { id: string, template: any }) => {
  try {
    const updated = await prisma.printTemplate.update({
      where: { id },
      data: {
        ...template,
        headerFields: JSON.stringify(template.headerFields || []),
        bodyFields: JSON.stringify(template.bodyFields || []),
        footerFields: JSON.stringify(template.footerFields || []),
      },
    })
    return {
      ...updated,
      headerFields: JSON.parse(updated.headerFields),
      bodyFields: JSON.parse(updated.bodyFields),
      footerFields: JSON.parse(updated.footerFields),
    }
  } catch (error) {
    console.error('Error updating template:', error)
    throw error
  }
})

ipcMain.handle('printing-template:delete', async (_, id: string) => {
  try {
    await prisma.printTemplate.delete({ where: { id } })
    return true
  } catch (error) {
    console.error('Error deleting template:', error)
    throw error
  }
})

ipcMain.handle('printing-template:deleteAll', async () => {
  try {
    await prisma.printTemplate.deleteMany({})
    return true
  } catch (error) {
    console.error('Error deleting all templates:', error)
    throw error
  }
})

// App event handlers
app.whenReady().then(async () => {
  try {
    protocol.handle('local-media', async (request) => {
      const requestUrl = new URL(request.url)
      const relativePath = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, '')
      const filePath = resolveWritablePublicFilePath(relativePath)

      if (!fs.existsSync(filePath)) {
        return new Response('Not found', { status: 404 })
      }

      return net.fetch(pathToFileURL(filePath).toString())
    })

    await initDatabase()
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
      }
    })
  } catch (error: any) {
    console.error('Application startup failed:', error)
    dialog.showErrorBox(
      'Startup Error',
      error?.message || 'Failed to initialize the application database.',
    )
    app.quit()
  }
})

app.on('window-all-closed', async () => {
  if (prisma) {
    await prisma.$disconnect()
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', async () => {
  if (prisma) {
    await prisma.$disconnect()
  }
})
