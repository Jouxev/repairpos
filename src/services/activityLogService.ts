export interface ActivityLogEntry {
  id: string
  userId: string
  username: string
  action: string
  module: string
  description?: string
  entityId?: string
  entityType?: string
  oldValue?: any
  newValue?: any
  ipAddress?: string
  userAgent?: string
  createdAt: Date
}

export type ActivityAction = 
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'VIEW'
  | 'LOGIN'
  | 'LOGOUT'
  | 'EXPORT'
  | 'PRINT'
  | 'SEND'
  | 'APPROVE'
  | 'REJECT'

export type ActivityModule =
  | 'AUTH'
  | 'USER'
  | 'CLIENT'
  | 'PRODUCT'
  | 'INVENTORY'
  | 'REPAIR'
  | 'SALE'
  | 'PURCHASE'
  | 'CASH_REGISTER'
  | 'REPORT'
  | 'SETTING'

class ActivityLogService {
  private static instance: ActivityLogService
  private listeners: Set<(logs: ActivityLogEntry[]) => void> = new Set()
  private logs: ActivityLogEntry[] = []

  static getInstance(): ActivityLogService {
    if (!ActivityLogService.instance) {
      ActivityLogService.instance = new ActivityLogService()
    }
    return ActivityLogService.instance
  }

  // Log an activity
  async logActivity(
    action: ActivityAction,
    module: ActivityModule,
    options: {
      description?: string
      entityId?: string
      entityType?: string
      oldValue?: any
      newValue?: any
      userId?: string
      username?: string
    } = {}
  ): Promise<ActivityLogEntry | null> {
    try {
      const entry: Omit<ActivityLogEntry, 'id' | 'createdAt'> = {
        userId: options.userId || 'system',
        username: options.username || 'System',
        action,
        module,
        description: options.description,
        entityId: options.entityId,
        entityType: options.entityType,
        oldValue: options.oldValue ? JSON.stringify(options.oldValue) : undefined,
        newValue: options.newValue ? JSON.stringify(options.newValue) : undefined,
        ipAddress: await this.getIPAddress(),
        userAgent: navigator.userAgent,
        createdAt: new Date(),
      }

      // Save to database
      const result = await window.electronAPI.db.query({
        model: 'activityLog',
        operation: 'create',
        args: {
          data: {
            ...entry,
            oldValue: entry.oldValue,
            newValue: entry.newValue,
          },
        },
      })

      if (result.success && result.data) {
        const logEntry: ActivityLogEntry = {
          ...result.data,
          oldValue: result.data.oldValue ? JSON.parse(result.data.oldValue) : undefined,
          newValue: result.data.newValue ? JSON.parse(result.data.newValue) : undefined,
        }

        this.logs.unshift(logEntry)
        this.notifyListeners()

        return logEntry
      }

      return null
    } catch (error) {
      console.error('Failed to log activity:', error)
      return null
    }
  }

  // Get activity logs with filters
  async getLogs(filters: {
    userId?: string
    action?: ActivityAction
    module?: ActivityModule
    entityId?: string
    entityType?: string
    startDate?: Date
    endDate?: Date
    limit?: number
    offset?: number
  } = {}): Promise<ActivityLogEntry[]> {
    try {
      const where: any = {}

      if (filters.userId) where.userId = filters.userId
      if (filters.action) where.action = filters.action
      if (filters.module) where.module = filters.module
      if (filters.entityId) where.entityId = filters.entityId
      if (filters.entityType) where.entityType = filters.entityType
      if (filters.startDate || filters.endDate) {
        where.createdAt = {}
        if (filters.startDate) where.createdAt.gte = filters.startDate
        if (filters.endDate) where.createdAt.lte = filters.endDate
      }

      const result = await window.electronAPI.db.query({
        model: 'activityLog',
        operation: 'findMany',
        args: {
          where,
          orderBy: { createdAt: 'desc' },
          take: filters.limit || 50,
          skip: filters.offset || 0,
        },
      })

      if (result.success && result.data) {
        return result.data.map((log: any) => ({
          ...log,
          oldValue: log.oldValue ? JSON.parse(log.oldValue) : undefined,
          newValue: log.newValue ? JSON.parse(log.newValue) : undefined,
        }))
      }

      return []
    } catch (error) {
      console.error('Failed to get activity logs:', error)
      return []
    }
  }

  // Get audit trail for an entity
  async getAuditTrail(entityId: string, entityType: string): Promise<ActivityLogEntry[]> {
    return this.getLogs({ entityId, entityType })
  }

  // Subscribe to real-time updates
  subscribe(callback: (logs: ActivityLogEntry[]) => void): () => void {
    this.listeners.add(callback)
    callback(this.logs)
    return () => this.listeners.delete(callback)
  }

  private notifyListeners(): void {
    this.listeners.forEach((callback) => callback([...this.logs]))
  }

  // Get IP address (placeholder - in real app, get from Electron main process)
  private async getIPAddress(): Promise<string> {
    try {
      // This would typically come from the Electron main process
      return '127.0.0.1'
    } catch {
      return 'unknown'
    }
  }
}

export const activityLogService = ActivityLogService.getInstance()

// React hook for activity logs
export function useActivityLogs(filters: Parameters<typeof activityLogService.getLogs>[0] = {}) {
  const [logs, setLogs] = React.useState<ActivityLogEntry[]>([])
  const [loading, setLoading] = React.useState(false)

  const fetchLogs = React.useCallback(async () => {
    setLoading(true)
    const data = await activityLogService.getLogs(filters)
    setLogs(data)
    setLoading(false)
  }, [filters])

  React.useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const refresh = React.useCallback(() => {
    fetchLogs()
  }, [fetchLogs])

  return { logs, loading, refresh }
}

export default ActivityLogService
