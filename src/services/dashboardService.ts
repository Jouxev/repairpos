export interface DailySalesData {
  name: string
  sales: number
  repairs: number
}

export interface RepairStatusData {
  name: string
  value: number
  color: string
}

export interface TopProductData {
  name: string
  sales: number
  revenue: number
}

export interface RecentRepairData {
  id: string
  customer: string
  device: string
  status: string
  amount: number
}

export interface DashboardStats {
  todaySales: number
  todaySalesChange: number
  activeRepairs: number
  pendingRepairs: number
  newCustomers: number
  newCustomersChange: number
  lowStockItems: number
}

export interface DashboardData {
  stats: DashboardStats
  salesData: DailySalesData[]
  repairStatusData: RepairStatusData[]
  topProducts: TopProductData[]
  recentRepairs: RecentRepairData[]
}

// Access the electronAPI exposed by preload script
declare global {
  interface Window {
    electronAPI?: {
      db?: {
        query: (params: { model: string; operation: string; args?: any }) => Promise<any>
      }
    }
  }
}

const getElectronAPI = () => {
  if (typeof window !== 'undefined' && window.electronAPI?.db) {
    return window.electronAPI
  }
  throw new Error('Electron API not available')
}

// Helper to safely call electron API
const dbQuery = async (params: { model: string; operation: string; args?: any }) => {
  const api = getElectronAPI()
  return api.db!.query(params)
}

class DashboardService {
  private static instance: DashboardService

  private constructor() {}

  static getInstance(): DashboardService {
    if (!DashboardService.instance) {
      DashboardService.instance = new DashboardService()
    }
    return DashboardService.instance
  }

  // Get dashboard data
  async getDashboardData(): Promise<DashboardData> {
    const [
      stats,
      salesData,
      repairStatusData,
      topProducts,
      recentRepairs
    ] = await Promise.all([
      this.getStats(),
      this.getSalesData(),
      this.getRepairStatusData(),
      this.getTopProducts(),
      this.getRecentRepairs()
    ])

    return {
      stats,
      salesData,
      repairStatusData,
      topProducts,
      recentRepairs
    }
  }

  // Get dashboard stats
  private async getStats(): Promise<DashboardStats> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const lastWeek = new Date(today)
    lastWeek.setDate(lastWeek.getDate() - 7)

    // Get today's sales
    const todaySalesResult = await dbQuery({
      model: 'sale',
      operation: 'aggregate',
      args: {
        where: {
          saleDate: {
            gte: today.toISOString()
          }
        },
        _sum: {
          total: true
        }
      }
    })

    // Get yesterday's sales for comparison
    const yesterdaySalesResult = await dbQuery({
      model: 'sale',
      operation: 'aggregate',
      args: {
        where: {
          saleDate: {
            gte: yesterday.toISOString(),
            lt: today.toISOString()
          }
        },
        _sum: {
          total: true
        }
      }
    })

    const todaySales = todaySalesResult?.data?._sum?.total || 0
    const yesterdaySales = yesterdaySalesResult?.data?._sum?.total || 0
    const salesChange = yesterdaySales > 0 
      ? ((todaySales - yesterdaySales) / yesterdaySales) * 100 
      : 0

    // Get active repairs (not completed or delivered)
    const activeRepairsResult = await dbQuery({
      model: 'repair',
      operation: 'count',
      args: {
        where: {
          status: {
            in: ['PENDING', 'IN_PROGRESS', 'COMPLETED_WAITING_PAYMENT']
          }
        }
      }
    })

    // Get pending repairs
    const pendingRepairsResult = await dbQuery({
      model: 'repair',
      operation: 'count',
      args: {
        where: {
          status: 'PENDING'
        }
      }
    })

    // Get new customers this week
    const newCustomersResult = await dbQuery({
      model: 'client',
      operation: 'count',
      args: {
        where: {
          createdAt: {
            gte: lastWeek.toISOString()
          }
        }
      }
    })

    // Get customers from previous week for comparison
    const previousWeekStart = new Date(lastWeek)
    previousWeekStart.setDate(previousWeekStart.getDate() - 7)

    const previousWeekCustomersResult = await dbQuery({
      model: 'client',
      operation: 'count',
      args: {
        where: {
          createdAt: {
            gte: previousWeekStart.toISOString(),
            lt: lastWeek.toISOString()
          }
        }
      }
    })

    const newCustomers = newCustomersResult?.data || 0
    const previousWeekCustomers = previousWeekCustomersResult?.data || 0
    const customersChange = previousWeekCustomers > 0 
      ? ((newCustomers - previousWeekCustomers) / previousWeekCustomers) * 100 
      : 0

    // Get low stock items
    // For now, get all products and filter in memory
    const allProductsResult = await dbQuery({
      model: 'product',
      operation: 'findMany',
      args: {
        where: {
          isActive: true
        }
      }
    })

    const lowStockItems = (allProductsResult?.data || []).filter(
      (p: any) => p.quantity <= (p.minStockAlert || 5)
    ).length

    return {
      todaySales,
      todaySalesChange: Math.round(salesChange),
      activeRepairs: activeRepairsResult?.data || 0,
      pendingRepairs: pendingRepairsResult?.data || 0,
      newCustomers,
      newCustomersChange: Math.round(customersChange),
      lowStockItems
    }
  }

  // Get daily sales data for the past week
  private async getSalesData(): Promise<DailySalesData[]> {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const data: DailySalesData[] = []

    // Get data for the past 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)

      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)

      // Get sales for this day
      const salesResult = await dbQuery({
        model: 'sale',
        operation: 'aggregate',
        args: {
          where: {
            saleDate: {
              gte: date.toISOString(),
              lt: nextDate.toISOString()
            }
          },
          _sum: {
            total: true
          }
        }
      })

      // Get repairs revenue for this day (completed repairs)
      const repairsResult = await dbQuery({
        model: 'repair',
        operation: 'aggregate',
        args: {
          where: {
            completedAt: {
              gte: date.toISOString(),
              lt: nextDate.toISOString()
            }
          },
          _sum: {
            repairCost: true
          }
        }
      })

      data.push({
        name: days[date.getDay()],
        sales: salesResult?.data?._sum?.total || 0,
        repairs: repairsResult?.data?._sum?.repairCost || 0
      })
    }

    return data
  }

  // Get repair status distribution
  private async getRepairStatusData(): Promise<RepairStatusData[]> {
    const statusColors: Record<string, string> = {
      'PENDING': '#f59e0b',
      'IN_PROGRESS': '#3b82f6',
      'COMPLETED_WAITING_PAYMENT': '#8b5cf6',
      'COMPLETED': '#10b981',
      'FINISHED': '#10b981',
      'DELIVERED': '#6366f1',
      'CANCELLED': '#ef4444'
    }

    const statusLabels: Record<string, string> = {
      'PENDING': 'Pending',
      'IN_PROGRESS': 'In Progress',
      'COMPLETED_WAITING_PAYMENT': 'Waiting Payment',
      'COMPLETED': 'Completed',
      'FINISHED': 'Finished',
      'DELIVERED': 'Delivered',
      'CANCELLED': 'Cancelled'
    }

    // Get count for each status
    const statuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED_WAITING_PAYMENT', 'COMPLETED', 'DELIVERED', 'CANCELLED']
    const data: RepairStatusData[] = []

    for (const status of statuses) {
      const result = await dbQuery({
        model: 'repair',
        operation: 'count',
        args: {
          where: { status }
        }
      })

      const count = result?.data || 0
      if (count > 0) {
        data.push({
          name: statusLabels[status] || status,
          value: count,
          color: statusColors[status] || '#6b7280'
        })
      }
    }

    return data
  }

  // Get top selling products
  private async getTopProducts(): Promise<TopProductData[]> {
    // Get all sales from the past 30 days with items
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const salesResult = await dbQuery({
      model: 'sale',
      operation: 'findMany',
      args: {
        where: {
          saleDate: {
            gte: thirtyDaysAgo.toISOString()
          }
        },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      }
    })

    // Aggregate product sales
    const productMap = new Map<string, { name: string; quantity: number; revenue: number }>()

    const sales = salesResult?.data || []
    for (const sale of sales) {
      for (const item of sale.items || []) {
        if (!item.product) continue

        const existing = productMap.get(item.product.id)
        if (existing) {
          existing.quantity += item.quantity
          existing.revenue += item.total
        } else {
          productMap.set(item.product.id, {
            name: item.product.name,
            quantity: item.quantity,
            revenue: item.total
          })
        }
      }
    }

    // Convert to array and sort by sales quantity
    const products = Array.from(productMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)

    return products.map(p => ({
      name: p.name,
      sales: p.quantity,
      revenue: Math.round(p.revenue)
    }))
  }

  // Get recent repairs
  private async getRecentRepairs(): Promise<RecentRepairData[]> {
    const result = await dbQuery({
      model: 'repair',
      operation: 'findMany',
      args: {
        take: 5,
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          client: true
        }
      }
    })

    const repairs = result?.data || []
    return repairs.map((repair: any) => ({
      id: repair.ticketNumber,
      customer: repair.client?.fullName || 'Unknown',
      device: `${repair.deviceBrand} ${repair.deviceModel}`,
      status: repair.status.replace(/_/g, ' '),
      amount: repair.repairCost
    }))
  }
}

export const dashboardService = DashboardService.getInstance()
