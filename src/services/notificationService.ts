import { useEffect, useCallback } from 'react'
import { toast } from '@/hooks/use-toast'

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

  // Show toast notification
  showToast(options: NotificationOptions): void {
    const { title, message, type = 'info', duration = 5000, action } = options

    toast({
      title,
      description: message,
      variant: type === 'error' ? 'destructive' : 'default',
      duration,
      action: action
        ? {
            label: action.label,
            onClick: action.onClick,
          }
        : undefined,
    })

    // Also save to persistent notifications
    this.addNotification({
      title,
      message,
      type,
      data: options.data,
    })
  }

  // Add notification to the list
  addNotification(options: Omit<NotificationOptions, 'duration' | 'action'>): Notification {
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
    this.saveToDatabase(notification)

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
  markAsRead(id: string): void {
    const notification = this.notifications.find((n) => n.id === id)
    if (notification) {
      notification.read = true
      this.notifyListeners()
      this.updateInDatabase(notification)
    }
  }

  // Mark all as read
  markAllAsRead(): void {
    this.notifications.forEach((n) => (n.read = true))
    this.notifyListeners()
    this.bulkUpdateInDatabase()
  }

  // Delete notification
  deleteNotification(id: string): void {
    this.notifications = this.notifications.filter((n) => n.id !== id)
    this.notifyListeners()
    this.deleteFromDatabase(id)
  }

  // Clear all notifications
  clearAll(): void {
    this.notifications = []
    this.notifyListeners()
    this.clearDatabase()
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
  private async saveToDatabase(notification: Notification): Promise<void> {
    try {
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
            userId: 'current-user-id', // Get from auth context
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
    // Implement bulk update
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
  const [notifications, setNotifications] = React.useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = React.useState(0)

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
    (options: Omit<NotificationOptions, 'duration' | 'action'>) => {
      return notificationService.addNotification(options)
    },
    []
  )

  const markAsRead = useCallback((id: string) => {
    notificationService.markAsRead(id)
  }, [])

  const markAllAsRead = useCallback(() => {
    notificationService.markAllAsRead()
  }, [])

  const deleteNotification = useCallback((id: string) => {
    notificationService.deleteNotification(id)
  }, [])

  const clearAll = useCallback(() => {
    notificationService.clearAll()
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
