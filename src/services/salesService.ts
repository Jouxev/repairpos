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
  sellerId: string
  cashRegisterId: string
}

export interface UpdateSaleInput extends Partial<CreateSaleInput> {
  id: string
}

declare global {
  interface Window {
    electronAPI: {
      db: {
        query: (params: { model: string; operation: string; args?: any }) => Promise<any>
      }
    }
  }
}

const electronAPI = window.electronAPI

class SalesService {
  // Create a new sale
  async createSale(data: CreateSaleInput): Promise<Sale> {
    try {
      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber()
      
      console.log('Creating sale with data:', { 
        invoiceNumber, 
        clientId: data.customerId || null,
        sellerId: data.sellerId,
        cashRegisterId: data.cashRegisterId
      })
      
      // Create the sale without items first
      const saleResult = await electronAPI.db.query({
        model: 'sale',
        operation: 'create',
        args: {
          data: {
            invoiceNumber,
            clientId: data.customerId || null,
            status: data.status || 'CONFIRMED',
            paymentStatus: 'PAID',
            subtotal: data.total + (data.discountAmount || 0) - (data.taxAmount || 0),
            discountAmount: data.discountAmount || 0,
            taxAmount: data.taxAmount || 0,
            total: data.total,
            paidAmount: data.paidAmount || data.total,
            dueAmount: 0,
            notes: data.notes || null,
            saleDate: data.saleDate || new Date(),
            sellerId: data.sellerId,
            cashRegisterId: data.cashRegisterId,
          }
        }
      })

      console.log('Sale creation result:', saleResult)

      if (!saleResult?.data?.id) {
        console.error('Create sale returned no data:', saleResult)
        throw new Error(`Failed to create sale - ${saleResult?.error || 'no sale ID returned'}`)
      }

      const saleId = saleResult.data.id

      // Create sale items separately
      for (const item of data.items) {
        try {
          await electronAPI.db.query({
            model: 'saleItem',
            operation: 'create',
            args: {
              data: {
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discount: item.discount || 0,
                total: (item.unitPrice * item.quantity) - (item.discount || 0),
                productId: item.productId,
                saleId: saleId,
              }
            }
          })
        } catch (itemError) {
          console.error(`Failed to create sale item for product ${item.productId}:`, itemError)
          // Continue with other items
        }
      }

      // Fetch the complete sale with items
      const completeSaleResult = await electronAPI.db.query({
        model: 'sale',
        operation: 'findUnique',
        args: {
          where: { id: saleId },
          include: {
            items: {
              include: {
                product: true
              }
            }
          }
        }
      })

      if (!completeSaleResult?.data) {
        console.error('Failed to fetch complete sale:', completeSaleResult)
        // Return the basic sale data we have
        return saleResult.data
      }
      
      return completeSaleResult.data
    } catch (error: any) {
      console.error('Error creating sale:', error)
      console.error('Error details:', error?.message, error?.stack)
      throw new Error(`Failed to create sale: ${error?.message || 'Unknown error'}`)
    }
  }

  // Generate unique invoice number
  private async generateInvoiceNumber(): Promise<string> {
    const prefix = 'INV'
    const date = new Date()
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
    const timestamp = Date.now().toString().slice(-6)
    return `${prefix}-${dateStr}-${timestamp}`
  }

  // Get all sales
  async getSales(filters?: {
    status?: SaleStatus
    paymentStatus?: PaymentStatus
    customerId?: string
    startDate?: Date
    endDate?: Date
  }): Promise<Sale[]> {
    try {
      const where: any = {}
      
      if (filters?.status) where.status = filters.status
      if (filters?.paymentStatus) where.paymentStatus = filters.paymentStatus
      if (filters?.customerId) where.clientId = filters.customerId
      if (filters?.startDate || filters?.endDate) {
        where.createdAt = {}
        if (filters.startDate) where.createdAt.gte = filters.startDate
        if (filters.endDate) where.createdAt.lte = filters.endDate
      }

      const result = await electronAPI.db.query({
        model: 'sale',
        operation: 'findMany',
        args: {
          where,
          orderBy: { createdAt: 'desc' },
          include: {
            items: {
              include: {
                product: true
              }
            }
          }
        }
      })

      return result?.data || []
    } catch (error) {
      console.error('Error fetching sales:', error)
      throw new Error('Failed to fetch sales')
    }
  }

  // Get a single sale by ID
  async getSaleById(id: string): Promise<Sale | null> {
    try {
      const result = await electronAPI.db.query({
        model: 'sale',
        operation: 'findUnique',
        args: {
          where: { id },
          include: {
            items: {
              include: {
                product: true
              }
            }
          }
        }
      })

      return result?.data
    } catch (error) {
      console.error('Error fetching sale:', error)
      throw new Error('Failed to fetch sale')
    }
  }

  // Update a sale
  async updateSale(data: UpdateSaleInput): Promise<Sale> {
    try {
      const { id, ...updateData } = data
      
      const result = await electronAPI.db.query({
        model: 'sale',
        operation: 'update',
        args: {
          where: { id },
          data: updateData,
          include: {
            items: {
              include: {
                product: true
              }
            }
          }
        }
      })

      return result?.data
    } catch (error) {
      console.error('Error updating sale:', error)
      throw new Error('Failed to update sale')
    }
  }

  // Delete a sale
  async deleteSale(id: string): Promise<void> {
    try {
      await electronAPI.db.query({
        model: 'sale',
        operation: 'delete',
        args: {
          where: { id }
        }
      })
    } catch (error) {
      console.error('Error deleting sale:', error)
      throw new Error('Failed to delete sale')
    }
  }
}

export const salesService = new SalesService()