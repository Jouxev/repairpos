import { PrismaClient, Prisma } from '@prisma/client'
import { notificationService } from './notificationService'

const prisma = new PrismaClient()

export type AlertType = 'LOW_STOCK' | 'OUT_OF_STOCK' | 'OVERSTOCK' | 'EXPIRED' | 'SLOW_MOVING'

export interface InventoryAlert {
  id: string
  productId: string
  productName: string
  sku: string
  alertType: AlertType
  currentStock: number
  threshold?: number
  message: string
  isResolved: boolean
  createdAt: Date
  updatedAt: Date
  resolvedAt?: Date
  resolvedBy?: string
}

export interface StockAlertConfig {
  lowStockThreshold: number
  outOfStockThreshold: number
  overstockThreshold: number
  slowMovingDays: number
  expiryWarningDays: number
}

export const defaultAlertConfig: StockAlertConfig = {
  lowStockThreshold: 10,
  outOfStockThreshold: 0,
  overstockThreshold: 100,
  slowMovingDays: 90,
  expiryWarningDays: 30,
}

class InventoryAlertService {
  private static instance: InventoryAlertService
  private checkInterval: NodeJS.Timeout | null = null

  private constructor() {}

  static getInstance(): InventoryAlertService {
    if (!InventoryAlertService.instance) {
      InventoryAlertService.instance = new InventoryAlertService()
    }
    return InventoryAlertService.instance
  }

  // Check all products and create alerts
  async checkAllProducts(config: StockAlertConfig = defaultAlertConfig): Promise<InventoryAlert[]> {
    const alerts: InventoryAlert[] = []
    
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        category: true,
        inventoryLogs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    for (const product of products) {
      // Check for out of stock
      if (product.stock <= config.outOfStockThreshold) {
        const alert = await this.createAlert({
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          alertType: 'OUT_OF_STOCK',
          currentStock: product.stock,
          threshold: config.outOfStockThreshold,
          message: `${product.name} is out of stock. Immediate reorder required.`,
        })
        if (alert) alerts.push(alert)
      }
      // Check for low stock
      else if (product.stock <= config.lowStockThreshold) {
        const alert = await this.createAlert({
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          alertType: 'LOW_STOCK',
          currentStock: product.stock,
          threshold: config.lowStockThreshold,
          message: `${product.name} is running low on stock (${product.stock} remaining).`,
        })
        if (alert) alerts.push(alert)
      }
      // Check for overstock
      else if (product.stock >= config.overstockThreshold) {
        const alert = await this.createAlert({
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          alertType: 'OVERSTOCK',
          currentStock: product.stock,
          threshold: config.overstockThreshold,
          message: `${product.name} is overstocked (${product.stock} units). Consider promotions.`,
        })
        if (alert) alerts.push(alert)
      }
    }

    return alerts
  }

  // Create a new alert
  private async createAlert(alertData: Omit<InventoryAlert, 'id' | 'isResolved' | 'createdAt' | 'updatedAt'>): Promise<InventoryAlert | null> {
    // Check if alert already exists for this product and type
    const existingAlert = await prisma.notification.findFirst({
      where: {
        data: {
          path: ['productId'],
          equals: alertData.productId,
        },
        type: alertData.alertType.toLowerCase() as any,
      },
    })

    if (existingAlert) {
      return null // Alert already exists
    }

    // Create notification for the alert
    await notificationService.createNotification({
      title: `Inventory Alert: ${alertData.alertType}`,
      message: alertData.message,
      type: alertData.alertType === 'OUT_OF_STOCK' ? 'error' : 
            alertData.alertType === 'LOW_STOCK' ? 'warning' : 'info',
      data: {
        productId: alertData.productId,
        productName: alertData.productName,
        sku: alertData.sku,
        alertType: alertData.alertType,
        currentStock: alertData.currentStock,
        threshold: alertData.threshold,
      },
    })

    // Return alert object
    return {
      id: Date.now().toString(),
      ...alertData,
      isResolved: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  // Get all active alerts
  async getActiveAlerts(): Promise<InventoryAlert[]> {
    const notifications = await prisma.notification.findMany({
      where: {
        data: {
          path: ['alertType'],
          not: Prisma.DbNull,
        },
        read: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return notifications.map((n: any) => ({
      id: n.id,
      productId: n.data?.productId || '',
      productName: n.data?.productName || '',
      sku: n.data?.sku || '',
      alertType: n.data?.alertType || 'LOW_STOCK',
      currentStock: n.data?.currentStock || 0,
      threshold: n.data?.threshold || 0,
      message: n.message,
      isResolved: n.read,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
    }))
  }

  // Resolve an alert
  async resolveAlert(alertId: string, userId: string): Promise<void> {
    await notificationService.markAsRead(alertId)
    
    // Log the resolution
    await ActivityLogService.log({
      action: 'UPDATE',
      module: 'INVENTORY',
      description: `Inventory alert ${alertId} resolved`,
    })
  }

  // Start automatic checking
  startAutoCheck(intervalMinutes: number = 60, config: StockAlertConfig = defaultAlertConfig): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
    }

    // Check immediately on start
    this.checkAllProducts(config)

    // Schedule periodic checks
    this.checkInterval = setInterval(() => {
      this.checkAllProducts(config)
    }, intervalMinutes * 60 * 1000)
  }

  // Stop automatic checking
  stopAutoCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
  }
}

// Import ActivityLogService for logging
import { ActivityLogService } from './activityLogService'

export const inventoryAlertService = InventoryAlertService.getInstance()
export default inventoryAlertService
