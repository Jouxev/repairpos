import { activityLogService } from './activityLogService'
import { notificationService } from './notificationService'

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

    const result = await window.electronAPI.db.query({
      model: 'product',
      operation: 'findMany',
      args: {
        where: { isActive: true },
        orderBy: { updatedAt: 'desc' },
      },
    })

    if (!result.success || !Array.isArray(result.data)) {
      return alerts
    }

    const products = result.data as Array<{
      id: string
      name: string
      sku?: string | null
      quantity: number
    }>

    for (const product of products) {
      // Check for out of stock
      if (product.quantity <= config.outOfStockThreshold) {
        const alert = await this.createAlert({
          productId: product.id,
          productName: product.name,
          sku: product.sku || '',
          alertType: 'OUT_OF_STOCK',
          currentStock: product.quantity,
          threshold: config.outOfStockThreshold,
          message: `${product.name} is out of stock. Immediate reorder required.`,
        })
        if (alert) alerts.push(alert)
      }
      // Check for low stock
      else if (product.quantity <= config.lowStockThreshold) {
        const alert = await this.createAlert({
          productId: product.id,
          productName: product.name,
          sku: product.sku || '',
          alertType: 'LOW_STOCK',
          currentStock: product.quantity,
          threshold: config.lowStockThreshold,
          message: `${product.name} is running low on stock (${product.quantity} remaining).`,
        })
        if (alert) alerts.push(alert)
      }
      // Check for overstock
      else if (product.quantity >= config.overstockThreshold) {
        const alert = await this.createAlert({
          productId: product.id,
          productName: product.name,
          sku: product.sku || '',
          alertType: 'OVERSTOCK',
          currentStock: product.quantity,
          threshold: config.overstockThreshold,
          message: `${product.name} is overstocked (${product.quantity} units). Consider promotions.`,
        })
        if (alert) alerts.push(alert)
      }
    }

    return alerts
  }

  // Create a new alert
  private async createAlert(alertData: Omit<InventoryAlert, 'id' | 'isResolved' | 'createdAt' | 'updatedAt'>): Promise<InventoryAlert | null> {
    const existingAlerts = await this.getActiveAlerts()
    const existingAlert = existingAlerts.find(
      (alert) => alert.productId === alertData.productId && alert.alertType === alertData.alertType,
    )

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
    const result = await window.electronAPI.db.query({
      model: 'notification',
      operation: 'findMany',
      args: {
        where: { isRead: false },
        orderBy: { createdAt: 'desc' },
      },
    })

    if (!result.success || !Array.isArray(result.data)) {
      return []
    }

    return result.data
      .map((notification: any) => {
        const data = notification.data ? JSON.parse(notification.data) : null
        if (!data?.alertType || !data?.productId) {
          return null
        }

        return {
          id: notification.id,
          productId: data.productId || '',
          productName: data.productName || '',
          sku: data.sku || '',
          alertType: data.alertType || 'LOW_STOCK',
          currentStock: data.currentStock || 0,
          threshold: data.threshold || 0,
          message: notification.message,
          isResolved: notification.isRead,
          createdAt: new Date(notification.createdAt),
          updatedAt: new Date(notification.createdAt),
        } as InventoryAlert
      })
      .filter((alert): alert is InventoryAlert => Boolean(alert))
  }

  // Resolve an alert
  async resolveAlert(alertId: string, userId: string): Promise<void> {
    await notificationService.markAsRead(alertId)
    
    // Log the resolution
    await activityLogService.logActivity('UPDATE', 'INVENTORY', {
      description: `Inventory alert ${alertId} resolved`,
      entityId: alertId,
      entityType: 'inventory-alert',
      userId,
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

export const inventoryAlertService = InventoryAlertService.getInstance()
export default inventoryAlertService
