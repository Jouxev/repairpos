import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow: BrowserWindow | null
let prisma: PrismaClient

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
  try {
    prisma = new PrismaClient()
    
    // Create default admin user if none exists
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN' }
    })
    
    if (adminCount === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10)
      await prisma.user.create({
        data: {
          username: 'admin',
          email: 'admin@repairpro.com',
          password: hashedPassword,
          fullName: 'System Administrator',
          role: 'ADMIN',
          isActive: true,
        }
      })
      console.log('Default admin user created')
    }
    
    // Create default shop settings
    const settingsCount = await prisma.shopSettings.count()
    if (settingsCount === 0) {
      await prisma.shopSettings.create({
        data: {
          shopName: 'RepairPro',
          currency: 'USD',
          currencySymbol: '$',
          taxRate: 0,
          language: 'en',
        }
      })
      console.log('Default shop settings created')
    }
    
    console.log('Database initialized successfully')
  } catch (error) {
    console.error('Database initialization error:', error)
  }
}

// IPC Handlers
// Generic database query handler
ipcMain.handle('db:query', async (_, { model, operation, args = {} }) => {
  try {
    if (!prisma[model] || typeof prisma[model][operation] !== 'function') {
      throw new Error(`Invalid model or operation: ${model}.${operation}`)
    }
    
    const result = await prisma[model][operation](args)
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

// App event handlers
app.whenReady().then(async () => {
  await initDatabase()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
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
