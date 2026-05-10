export type SaleStatus = 'QUOTATION' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED'
export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'REFUNDED'

export interface SaleItem {
  id: string
  saleId: string
  productId: string
  quantity: number
  unitPrice: number
  discount: number
  tax: number
  total: number
  product?: {
    id: string
    name: string
    sku: string
    unit: string
  }
}

export interface Sale {
  id: string
  invoiceNumber: string
  customerId?: string | null
  customerName?: string | null
  customerPhone?: string | null
  customerEmail?: string | null
  status: SaleStatus
  paymentStatus: PaymentStatus
  subtotal: number
  discountAmount: number
  taxAmount: number
  total: number
  paidAmount: number
  dueAmount: number
  notes?: string | null
  saleDate: Date | string
  createdAt: Date | string
  updatedAt: Date | string
  items?: SaleItem[]
  payments?: SalePayment[]
  customer?: {
    id: string
    name: string
    phone?: string
    email?: string
  } | null
}

export interface SalePayment {
  id: string
  saleId: string
  amount: number
  method: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'CHECK' | 'DIGITAL_WALLET'
  reference?: string
  notes?: string
  paymentDate: Date | string
  createdAt: Date | string
}

export interface CreateSaleInput {
  customerId?: string
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  status?: SaleStatus
  items: {
    productId: string
    quantity: number
    unitPrice: number
    discount?: number
    tax?: number
  }[]
  discountAmount?: number
  taxAmount?: number
  total: number
  paidAmount?: number
  notes?: string
  saleDate?: Date
}

export interface UpdateSaleInput extends Partial<CreateSaleInput> {
  id: string
}

class SalesService {
  // Create a new sale
  async createSale(data: CreateSaleInput): Promise<Sale> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available')
    }
    return await window.electronAPI.database.execute('sales/create', data)
  }

  // Get all sales
  async getSales(filters?: {
    status?: SaleStatus
    paymentStatus?: PaymentStatus
    customerId?: string
    startDate?: Date
    endDate?: Date
  }): Promise<Sale[]> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available')
    }
    return await window.electronAPI.database.execute('sales/getAll', filters || {})
  }

  // Get a single sale by ID
  async getSaleById(id: string): Promise<Sale | null> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available')
    }
    return await window.electronAPI.database.execute('sales/getById', { id })
  }

  // Update a sale
  async updateSale(data: UpdateSaleInput): Promise<Sale> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available')
    }
    return await window.electronAPI.database.execute('sales/update', data)
  }

  // Update sale status
  async updateStatus(id: string, status: SaleStatus): Promise<Sale> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available')
    }
    return await window.electronAPI.database.execute('sales/updateStatus', { id, status })
  }

  // Add payment to sale
  async addPayment(
    saleId: string,
    data: {
      amount: number
      method: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'CHECK' | 'DIGITAL_WALLET'
      reference?: string
      notes?: string
      paymentDate?: Date
    }
  ): Promise<Sale> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available')
    }
    return await window.electronAPI.database.execute('sales/addPayment', {
      saleId,
      ...data,
    })
  }

  // Delete a sale
  async deleteSale(id: string): Promise<void> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available')
    }
    return await window.electronAPI.database.execute('sales/delete', { id })
  }

  // Get sales statistics
  async getStatistics(period?: { startDate: Date; endDate: Date }): Promise<{
    totalSales: number
    totalRevenue: number
    totalPaid: number
    totalDue: number
    byStatus: Record<SaleStatus, number>
    byPaymentStatus: Record<PaymentStatus, number>
  }> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available')
    }
    return await window.electronAPI.database.execute('sales/getStatistics', period || {})
  }
}

export const salesService = new SalesService()
