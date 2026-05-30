export interface ReportPeriod {
  startDate: Date
  endDate: Date
}

export interface ReportMetric {
  label: string
  value: number
  previousValue: number
  changePercent: number
}

export interface ReportsOverview {
  salesRevenue: ReportMetric
  repairRevenue: ReportMetric
  netCollected: ReportMetric
  completedRepairs: ReportMetric
  newCustomers: ReportMetric
  averageSale: ReportMetric
  totalClientBalance: number
  totalSupplierBalance: number
  inventoryCostValue: number
  inventoryRetailValue: number
  lowStockCount: number
}

export interface SalesTrendPoint {
  label: string
  sales: number
  repairs: number
}

export interface PaymentMethodPoint {
  method: string
  amount: number
  count: number
}

export interface TopProductReport {
  id: string
  name: string
  sku: string
  quantitySold: number
  revenue: number
}

export interface RecentSaleReport {
  id: string
  invoiceNumber: string
  customerName: string
  total: number
  paidAmount: number
  dueAmount: number
  paymentStatus: string
  saleDate: string
}

export interface RepairStatusPoint {
  name: string
  value: number
  color: string
}

export interface RecentRepairReport {
  id: string
  ticketNumber: string
  customerName: string
  device: string
  status: string
  repairCost: number
  profit: number
}

export interface LowStockProductReport {
  id: string
  name: string
  sku: string
  quantity: number
  minStockAlert: number
  categoryName: string
}

export interface ReportsData {
  period: {
    startDate: string
    endDate: string
  }
  overview: ReportsOverview
  salesTrend: SalesTrendPoint[]
  paymentMethods: PaymentMethodPoint[]
  topProducts: TopProductReport[]
  recentSales: RecentSaleReport[]
  repairStatuses: RepairStatusPoint[]
  recentRepairs: RecentRepairReport[]
  lowStockProducts: LowStockProductReport[]
}

type SaleRecord = {
  id: string
  invoiceNumber: string
  customerName?: string | null
  paymentMethod?: string | null
  paymentStatus: string
  total: number
  paidAmount: number
  dueAmount: number
  saleDate: Date | string
  createdAt?: Date | string
  items?: Array<{
    productId: string
    quantity: number
    total: number
    product?: {
      id: string
      name: string
      sku?: string | null
    } | null
  }>
  client?: {
    fullName?: string | null
  } | null
}

type RepairRecord = {
  id: string
  ticketNumber: string
  deviceBrand?: string | null
  deviceModel?: string | null
  repairCost: number
  status: string
  parts?: string | null
  createdAt: Date | string
  completedAt?: Date | string | null
  client?: {
    fullName?: string | null
  } | null
}

type ProductRecord = {
  id: string
  name: string
  sku?: string | null
  quantity: number
  minStockAlert?: number | null
  costPrice?: number | null
  salePrice?: number | null
  category?: {
    name?: string | null
  } | null
}

const statusColors: Record<string, string> = {
  PENDING: '#f59e0b',
  IN_PROGRESS: '#3b82f6',
  COMPLETED_WAITING_PAYMENT: '#8b5cf6',
  COMPLETED: '#10b981',
  FINISHED: '#10b981',
  DELIVERED: '#6366f1',
  CANCELLED: '#ef4444',
  REJECTED: '#ef4444',
}

const statusLabels: Record<string, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  COMPLETED_WAITING_PAYMENT: 'Waiting Payment',
  COMPLETED: 'Completed',
  FINISHED: 'Finished',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  REJECTED: 'Rejected',
}

const paymentMethodLabels: Record<string, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  BANK_TRANSFER: 'Transfer',
  DIGITAL_WALLET: 'Digital Wallet',
  CREDIT: 'Credit',
  CHECK: 'Check',
}

const getElectronAPI = () => {
  if (typeof window !== 'undefined' && window.electronAPI?.db) {
    return window.electronAPI
  }

  throw new Error('Electron API not available')
}

const dbQuery = async (params: { model: string; operation: string; args?: any }) => {
  const api = getElectronAPI()
  return api.db.query(params)
}

const startOfDay = (date: Date) => {
  const normalized = new Date(date)
  normalized.setHours(0, 0, 0, 0)
  return normalized
}

const endOfDay = (date: Date) => {
  const normalized = new Date(date)
  normalized.setHours(23, 59, 59, 999)
  return normalized
}

const addDays = (date: Date, days: number) => {
  const normalized = new Date(date)
  normalized.setDate(normalized.getDate() + days)
  return normalized
}

const formatDayLabel = (date: Date) =>
  date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

const toSafeNumber = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const parsePartsCost = (parts: string | null | undefined) => {
  if (!parts) {
    return 0
  }

  try {
    const parsed = JSON.parse(parts) as Array<{ total?: number }>
    return parsed.reduce((sum, part) => sum + toSafeNumber(part.total), 0)
  } catch {
    return 0
  }
}

const calculateChangePercent = (currentValue: number, previousValue: number) => {
  if (previousValue === 0) {
    return currentValue > 0 ? 100 : 0
  }

  return Math.round(((currentValue - previousValue) / previousValue) * 100)
}

const buildMetric = (label: string, currentValue: number, previousValue: number): ReportMetric => ({
  label,
  value: currentValue,
  previousValue,
  changePercent: calculateChangePercent(currentValue, previousValue),
})

class ReportsService {
  private static instance: ReportsService

  static getInstance() {
    if (!ReportsService.instance) {
      ReportsService.instance = new ReportsService()
    }

    return ReportsService.instance
  }

  async getReportsData(period: ReportPeriod): Promise<ReportsData> {
    const currentStart = startOfDay(period.startDate)
    const currentEnd = endOfDay(period.endDate)
    const rangeDays = Math.max(1, Math.round((currentEnd.getTime() - currentStart.getTime()) / 86400000) + 1)
    const previousEnd = addDays(currentStart, -1)
    const previousStart = addDays(previousEnd, -(rangeDays - 1))

    const [
      currentSales,
      previousSales,
      currentRepairs,
      previousRepairs,
      products,
      clients,
      suppliers,
      currentNewCustomers,
      previousNewCustomers,
    ] = await Promise.all([
      this.getSales(currentStart, currentEnd),
      this.getSales(previousStart, previousEnd),
      this.getRepairs(currentStart, currentEnd),
      this.getRepairs(previousStart, previousEnd),
      this.getProducts(),
      this.getClients(),
      this.getSuppliers(),
      this.getCustomerCount(currentStart, currentEnd),
      this.getCustomerCount(previousStart, previousEnd),
    ])

    const currentSalesRevenue = currentSales.reduce((sum, sale) => sum + toSafeNumber(sale.total), 0)
    const previousSalesRevenue = previousSales.reduce((sum, sale) => sum + toSafeNumber(sale.total), 0)
    const currentRepairRevenue = currentRepairs.reduce((sum, repair) => sum + toSafeNumber(repair.repairCost), 0)
    const previousRepairRevenue = previousRepairs.reduce((sum, repair) => sum + toSafeNumber(repair.repairCost), 0)
    const currentCollected = currentSales.reduce((sum, sale) => sum + toSafeNumber(sale.paidAmount), 0)
    const previousCollected = previousSales.reduce((sum, sale) => sum + toSafeNumber(sale.paidAmount), 0)
    const currentCompletedRepairs = currentRepairs.filter((repair) =>
      ['COMPLETED', 'FINISHED', 'DELIVERED'].includes(repair.status),
    ).length
    const previousCompletedRepairs = previousRepairs.filter((repair) =>
      ['COMPLETED', 'FINISHED', 'DELIVERED'].includes(repair.status),
    ).length
    const currentAverageSale = currentSales.length > 0 ? currentSalesRevenue / currentSales.length : 0
    const previousAverageSale = previousSales.length > 0 ? previousSalesRevenue / previousSales.length : 0

    const inventoryCostValue = products.reduce(
      (sum, product) => sum + toSafeNumber(product.quantity) * toSafeNumber(product.costPrice),
      0,
    )
    const inventoryRetailValue = products.reduce(
      (sum, product) => sum + toSafeNumber(product.quantity) * toSafeNumber(product.salePrice),
      0,
    )
    const totalClientBalance = clients.reduce((sum, client) => sum + toSafeNumber(client.balance), 0)
    const totalSupplierBalance = suppliers.reduce((sum, supplier) => sum + toSafeNumber(supplier.balance), 0)

    const lowStockProducts = products
      .filter((product) => toSafeNumber(product.quantity) <= Math.max(1, toSafeNumber(product.minStockAlert) || 5))
      .sort((a, b) => toSafeNumber(a.quantity) - toSafeNumber(b.quantity))
      .slice(0, 10)
      .map((product) => ({
        id: product.id,
        name: product.name,
        sku: product.sku || 'No SKU',
        quantity: toSafeNumber(product.quantity),
        minStockAlert: Math.max(1, toSafeNumber(product.minStockAlert) || 5),
        categoryName: product.category?.name || 'Uncategorized',
      }))

    return {
      period: {
        startDate: currentStart.toISOString(),
        endDate: currentEnd.toISOString(),
      },
      overview: {
        salesRevenue: buildMetric('Sales Revenue', currentSalesRevenue, previousSalesRevenue),
        repairRevenue: buildMetric('Repair Revenue', currentRepairRevenue, previousRepairRevenue),
        netCollected: buildMetric('Net Collected', currentCollected, previousCollected),
        completedRepairs: buildMetric('Completed Repairs', currentCompletedRepairs, previousCompletedRepairs),
        newCustomers: buildMetric('New Customers', currentNewCustomers, previousNewCustomers),
        averageSale: buildMetric('Average Sale', currentAverageSale, previousAverageSale),
        totalClientBalance,
        totalSupplierBalance,
        inventoryCostValue,
        inventoryRetailValue,
        lowStockCount: lowStockProducts.length,
      },
      salesTrend: this.buildSalesTrend(currentStart, currentEnd, currentSales, currentRepairs),
      paymentMethods: this.buildPaymentMethods(currentSales),
      topProducts: this.buildTopProducts(currentSales),
      recentSales: currentSales
        .sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime())
        .slice(0, 8)
        .map((sale) => ({
          id: sale.id,
          invoiceNumber: sale.invoiceNumber,
          customerName: sale.customerName || sale.client?.fullName || 'Walk-in Customer',
          total: toSafeNumber(sale.total),
          paidAmount: toSafeNumber(sale.paidAmount),
          dueAmount: toSafeNumber(sale.dueAmount),
          paymentStatus: sale.paymentStatus,
          saleDate: new Date(sale.saleDate).toISOString(),
        })),
      repairStatuses: this.buildRepairStatuses(currentRepairs),
      recentRepairs: currentRepairs
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 8)
        .map((repair) => ({
          id: repair.id,
          ticketNumber: repair.ticketNumber,
          customerName: repair.client?.fullName || 'Unknown Customer',
          device: [repair.deviceBrand, repair.deviceModel].filter(Boolean).join(' ') || 'Unknown Device',
          status: statusLabels[repair.status] || repair.status,
          repairCost: toSafeNumber(repair.repairCost),
          profit: toSafeNumber(repair.repairCost) - parsePartsCost(repair.parts),
        })),
      lowStockProducts,
    }
  }

  private async getSales(startDate: Date, endDate: Date): Promise<SaleRecord[]> {
    const result = await dbQuery({
      model: 'sale',
      operation: 'findMany',
      args: {
        where: {
          saleDate: {
            gte: startDate.toISOString(),
            lte: endDate.toISOString(),
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          client: true,
        },
      },
    })

    return result?.data || []
  }

  private async getRepairs(startDate: Date, endDate: Date): Promise<RepairRecord[]> {
    const result = await dbQuery({
      model: 'repair',
      operation: 'findMany',
      args: {
        where: {
          createdAt: {
            gte: startDate.toISOString(),
            lte: endDate.toISOString(),
          },
        },
        include: {
          client: true,
        },
      },
    })

    return result?.data || []
  }

  private async getProducts(): Promise<ProductRecord[]> {
    const result = await dbQuery({
      model: 'product',
      operation: 'findMany',
      args: {
        where: {
          isActive: true,
        },
        include: {
          category: true,
        },
      },
    })

    return result?.data || []
  }

  private async getCustomerCount(startDate: Date, endDate: Date): Promise<number> {
    const result = await dbQuery({
      model: 'client',
      operation: 'count',
      args: {
        where: {
          createdAt: {
            gte: startDate.toISOString(),
            lte: endDate.toISOString(),
          },
        },
      },
    })

    return result?.data || 0
  }

  private async getClients(): Promise<Array<{ balance: number }>> {
    const result = await dbQuery({
      model: 'client',
      operation: 'findMany',
      args: {
        select: {
          balance: true,
        },
      },
    })

    return result?.data || []
  }

  private async getSuppliers(): Promise<Array<{ balance: number }>> {
    const result = await dbQuery({
      model: 'supplier',
      operation: 'findMany',
      args: {
        select: {
          balance: true,
        },
      },
    })

    return result?.data || []
  }

  private buildSalesTrend(
    startDate: Date,
    endDate: Date,
    sales: SaleRecord[],
    repairs: RepairRecord[],
  ): SalesTrendPoint[] {
    const points: SalesTrendPoint[] = []

    for (let cursor = new Date(startDate); cursor <= endDate; cursor = addDays(cursor, 1)) {
      const dayStart = startOfDay(cursor)
      const dayEnd = endOfDay(cursor)
      const salesTotal = sales
        .filter((sale) => {
          const date = new Date(sale.saleDate)
          return date >= dayStart && date <= dayEnd
        })
        .reduce((sum, sale) => sum + toSafeNumber(sale.total), 0)

      const repairsTotal = repairs
        .filter((repair) => {
          const date = new Date(repair.createdAt)
          return date >= dayStart && date <= dayEnd
        })
        .reduce((sum, repair) => sum + toSafeNumber(repair.repairCost), 0)

      points.push({
        label: formatDayLabel(cursor),
        sales: Math.round(salesTotal * 100) / 100,
        repairs: Math.round(repairsTotal * 100) / 100,
      })
    }

    return points
  }

  private buildPaymentMethods(sales: SaleRecord[]): PaymentMethodPoint[] {
    const methodMap = new Map<string, PaymentMethodPoint>()

    sales.forEach((sale) => {
      const methodKey = (sale.paymentMethod || 'CASH').toUpperCase()
      const current = methodMap.get(methodKey) || {
        method: paymentMethodLabels[methodKey] || methodKey,
        amount: 0,
        count: 0,
      }

      current.amount += toSafeNumber(sale.paidAmount || sale.total)
      current.count += 1
      methodMap.set(methodKey, current)
    })

    return Array.from(methodMap.values()).sort((a, b) => b.amount - a.amount)
  }

  private buildTopProducts(sales: SaleRecord[]): TopProductReport[] {
    const productMap = new Map<string, TopProductReport>()

    sales.forEach((sale) => {
      sale.items?.forEach((item) => {
        const productId = item.product?.id || item.productId
        const existing = productMap.get(productId) || {
          id: productId,
          name: item.product?.name || 'Unknown Product',
          sku: item.product?.sku || 'No SKU',
          quantitySold: 0,
          revenue: 0,
        }

        existing.quantitySold += toSafeNumber(item.quantity)
        existing.revenue += toSafeNumber(item.total)
        productMap.set(productId, existing)
      })
    })

    return Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8)
  }

  private buildRepairStatuses(repairs: RepairRecord[]): RepairStatusPoint[] {
    const statusMap = new Map<string, number>()

    repairs.forEach((repair) => {
      statusMap.set(repair.status, (statusMap.get(repair.status) || 0) + 1)
    })

    return Array.from(statusMap.entries())
      .map(([status, value]) => ({
        name: statusLabels[status] || status,
        value,
        color: statusColors[status] || '#6b7280',
      }))
      .sort((a, b) => b.value - a.value)
  }
}

export const reportsService = ReportsService.getInstance()
