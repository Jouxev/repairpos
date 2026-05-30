import { useCallback, useEffect, useState } from 'react'
import { toast } from '@/hooks/use-toast'
import { useAuthStore } from '@/stores/authStore'

export type NotificationType = 'info' | 'success' | 'warning' | 'error'

export interface Notification {
  id: string
  title: string
  message: string
  type: NotificationType
  data?: any
  createdAt: Date
  read: boolean
}

export interface NotificationOptions {
  title: string
  message: string
  type?: NotificationType
  data?: any
  userId?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

class NotificationService {
  private static instance: NotificationService
  private listeners: Set<(notifications: Notification[]) => void> = new Set()
  private notifications: Notification[] = []

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  private getCurrentUserId(explicitUserId?: string): string | null {
    return explicitUserId || useAuthStore.getState().user?.id || null
  }

  // Show toast notification
  showToast(options: NotificationOptions): void {
    const { title, message, type = 'info', duration = 5000, action } = options

    const toastOptions: any = {
      title,
      description: message,
      variant: type === 'error' ? 'destructive' : 'default',
      duration,
      action:
        action
        ? {
            label: action.label,
            onClick: action.onClick,
          }
        : undefined,
    }

    toast(toastOptions)

    // Also save to persistent notifications
    this.addNotification({
      title,
      message,
      type,
      data: options.data,
    })
  }

  async createNotification(options: Omit<NotificationOptions, 'duration' | 'action'>): Promise<Notification> {
    return this.addNotification(options)
  }

  // Add notification to the list
  async addNotification(options: Omit<NotificationOptions, 'duration' | 'action'>): Promise<Notification> {
    const notification: Notification = {
      id: this.generateId(),
      title: options.title,
      message: options.message,
      type: options.type || 'info',
      data: options.data,
      createdAt: new Date(),
      read: false,
    }

    this.notifications.unshift(notification)
    this.notifyListeners()

    // Save to database
    await this.saveToDatabase(notification, options.userId)

    return notification
  }

  // Get all notifications
  getNotifications(): Notification[] {
    return [...this.notifications]
  }

  // Get unread notifications count
  getUnreadCount(): number {
    return this.notifications.filter((n) => !n.read).length
  }

  // Mark notification as read
  async markAsRead(id: string): Promise<void> {
    const notification = this.notifications.find((n) => n.id === id)
    if (notification) {
      notification.read = true
      this.notifyListeners()
      await this.updateInDatabase(notification)
    }
  }

  // Mark all as read
  async markAllAsRead(): Promise<void> {
    this.notifications.forEach((n) => (n.read = true))
    this.notifyListeners()
    await this.bulkUpdateInDatabase()
  }

  // Delete notification
  async deleteNotification(id: string): Promise<void> {
    this.notifications = this.notifications.filter((n) => n.id !== id)
    this.notifyListeners()
    await this.deleteFromDatabase(id)
  }

  // Clear all notifications
  async clearAll(): Promise<void> {
    this.notifications = []
    this.notifyListeners()
    await this.clearDatabase()
  }

  // Subscribe to notifications
  subscribe(callback: (notifications: Notification[]) => void): () => void {
    this.listeners.add(callback)
    callback(this.notifications)

    return () => {
      this.listeners.delete(callback)
    }
  }

  // Notify all listeners
  private notifyListeners(): void {
    this.listeners.forEach((callback) => callback([...this.notifications]))
  }

  // Generate unique ID
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // Database operations (using Prisma)
  private async saveToDatabase(notification: Notification, explicitUserId?: string): Promise<void> {
    try {
      const userId = this.getCurrentUserId(explicitUserId)
      if (!userId) {
        console.warn('Notification persistence skipped: No authenticated user available')
        return
      }

      await window.electronAPI.db.query({
        model: 'notification',
        operation: 'create',
        args: {
          data: {
            id: notification.id,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            data: notification.data ? JSON.stringify(notification.data) : null,
            isRead: notification.read,
            userId,
          },
        },
      })
    } catch (error) {
      console.error('Failed to save notification:', error)
    }
  }

  private async updateInDatabase(notification: Notification): Promise<void> {
    try {
      await window.electronAPI.db.query({
        model: 'notification',
        operation: 'update',
        args: {
          where: { id: notification.id },
          data: { isRead: notification.read },
        },
      })
    } catch (error) {
      console.error('Failed to update notification:', error)
    }
  }

  private async bulkUpdateInDatabase(): Promise<void> {
    const ids = this.notifications.map((notification) => notification.id)
    if (ids.length === 0) {
      return
    }

    try {
      await window.electronAPI.db.query({
        model: 'notification',
        operation: 'updateMany',
        args: {
          where: { id: { in: ids } },
          data: { isRead: true },
        },
      })
    } catch (error) {
      console.error('Failed to bulk update notifications:', error)
    }
  }

  private async deleteFromDatabase(id: string): Promise<void> {
    try {
      await window.electronAPI.db.query({
        model: 'notification',
        operation: 'delete',
        args: { where: { id } },
      })
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  }

  private async clearDatabase(): Promise<void> {
    try {
      await window.electronAPI.db.query({
        model: 'notification',
        operation: 'deleteMany',
        args: {},
      })
    } catch (error) {
      console.error('Failed to clear notifications:', error)
    }
  }

  // Load notifications from database
  async loadFromDatabase(): Promise<void> {
    try {
      const result = await window.electronAPI.db.query({
        model: 'notification',
        operation: 'findMany',
        args: {
          orderBy: { createdAt: 'desc' },
        },
      })

      if (result.success && result.data) {
        this.notifications = result.data.map((n: any) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type,
          data: n.data ? JSON.parse(n.data) : undefined,
          createdAt: new Date(n.createdAt),
          read: n.isRead,
        }))
        this.notifyListeners()
      }
    } catch (error) {
      console.error('Failed to load notifications:', error)
    }
  }
}

export const notificationService = NotificationService.getInstance()

// React hook for notifications
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    // Load initial notifications
    notificationService.loadFromDatabase()

    // Subscribe to changes
    const unsubscribe = notificationService.subscribe((newNotifications) => {
      setNotifications(newNotifications)
      setUnreadCount(newNotifications.filter((n) => !n.read).length)
    })

    return unsubscribe
  }, [])

  const showToast = useCallback((options: NotificationOptions) => {
    notificationService.showToast(options)
  }, [])

  const addNotification = useCallback(
    async (options: Omit<NotificationOptions, 'duration' | 'action'>) => {
      return notificationService.addNotification(options)
    },
    []
  )

  const markAsRead = useCallback(async (id: string) => {
    await notificationService.markAsRead(id)
  }, [])

  const markAllAsRead = useCallback(async () => {
    await notificationService.markAllAsRead()
  }, [])

  const deleteNotification = useCallback(async (id: string) => {
    await notificationService.deleteNotification(id)
  }, [])

  const clearAll = useCallback(async () => {
    await notificationService.clearAll()
  }, [])

  return {
    notifications,
    unreadCount,
    showToast,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  }
}

export default NotificationService
