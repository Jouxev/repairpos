import { useAuthStore } from '@/stores/authStore'
import { cashRegisterService } from './cashRegisterService'
import { productService } from './productService'
import { clientService } from './clientService'

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
  refundedAmount?: number
  isRefunded?: boolean
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
  paymentStatusOverride?: PaymentStatus
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
  paymentMethod?: string
  notes?: string
  saleDate?: Date
  sellerId?: string
  cashRegisterId?: string
  skipRegisterRecord?: boolean
}

export interface UpdateSaleInput extends Partial<CreateSaleInput> {
  id: string
}

export interface ProcessReturnInput {
  sourceSaleId: string
  items: {
    productId: string
    quantity: number
    unitPrice: number
    discount?: number
    tax?: number
  }[]
  refundAmount: number
  taxAmount?: number
  discountAmount?: number
  paymentMethod?: string
  notes?: string
  customerId?: string
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  sellerId?: string
  cashRegisterId?: string
}

export interface AddSalePaymentInput {
  amount: number
  paymentMethod?: string
}


const electronAPI = window.electronAPI
const RETURN_SOURCE_TAG = '[RETURN_FOR_SALE_ID:'

const buildReturnSourceTag = (saleId: string) => `${RETURN_SOURCE_TAG}${saleId}]`

const extractRefundedQuantityMap = (sales: Sale[]) => {
  const refundedByProductId = new Map<string, number>()

  sales.forEach((sale) => {
    sale.items?.forEach((item) => {
      refundedByProductId.set(item.productId, (refundedByProductId.get(item.productId) || 0) + item.quantity)
    })
  })

  return refundedByProductId
}

const normalizePaymentMethod = (method?: string): string => {
  switch ((method || '').toLowerCase()) {
    case 'cash':
      return 'CASH'
    case 'card':
      return 'CARD'
    case 'bank_transfer':
    case 'bank transfer':
      return 'BANK_TRANSFER'
    case 'check':
      return 'CHECK'
    case 'mobile':
    case 'qr':
    case 'digital_wallet':
    case 'digital wallet':
      return 'DIGITAL_WALLET'
    case 'credit':
      return 'CREDIT'
    default:
      return 'CASH'
  }
}

const mapSale = (sale: any): Sale => ({
  ...sale,
  customerId: sale.clientId ?? sale.customerId ?? null,
  customerName: sale.client?.fullName ?? sale.customerName ?? null,
  customerPhone: sale.client?.phone ?? sale.customerPhone ?? null,
  customerEmail: sale.client?.email ?? sale.customerEmail ?? null,
  customer: sale.client
    ? {
        id: sale.client.id,
        name: sale.client.fullName,
        phone: sale.client.phone,
        email: sale.client.email,
      }
    : sale.customer || null,
})

class SalesService {
  private async syncClientBalanceForSaleChange(
    previousClientId?: string | null,
    previousDueAmount = 0,
    nextClientId?: string | null,
    nextDueAmount = 0,
  ) {
    if (previousClientId) {
      await clientService.updateBalance(previousClientId, previousDueAmount)
    }

    if (nextClientId) {
      await clientService.updateBalance(nextClientId, -nextDueAmount)
    }
  }

  // Create a new sale
  async createSale(data: CreateSaleInput): Promise<Sale> {
    try {
      const sellerId = data.sellerId || useAuthStore.getState().user?.id
      if (!sellerId) {
        throw new Error('No authenticated seller found')
      }

      const openRegister = data.cashRegisterId
        ? await cashRegisterService.getRegisterById(data.cashRegisterId)
        : await cashRegisterService.getOpenRegister()
      const cashRegisterId = data.cashRegisterId || openRegister?.id

      if (!cashRegisterId) {
        throw new Error('No open cash register found')
      }

      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber()
      const subtotal = data.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
      const paidAmount = Math.max(0, Math.min(data.paidAmount ?? data.total, data.total))
      const dueAmount = Math.max(0, data.total - paidAmount)
      const paymentStatus: PaymentStatus =
        data.paymentStatusOverride ||
        (data.status === 'REFUNDED'
          ? 'REFUNDED'
          : dueAmount <= 0
            ? 'PAID'
            : paidAmount > 0
              ? 'PARTIAL'
              : 'PENDING')
      
      const saleResult = await electronAPI.db.query({
        model: 'sale',
        operation: 'create',
        args: {
          data: {
            invoiceNumber,
            clientId: data.customerId || null,
            status: data.status || 'CONFIRMED',
            paymentStatus,
            subtotal,
            discount: data.discountAmount || 0,
            discountAmount: data.discountAmount || 0,
            taxRate: 0,
            taxAmount: data.taxAmount || 0,
            total: data.total,
            paidAmount,
            dueAmount,
            paymentMethod: normalizePaymentMethod(data.paymentMethod),
            notes: data.notes || null,
            saleDate: data.saleDate || new Date(),
            sellerId,
            cashRegisterId,
            items: {
              create: data.items.map((item) => ({
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discount: item.discount || 0,
                total: (item.unitPrice * item.quantity) - (item.discount || 0),
                productId: item.productId,
              })),
            },
          },
          include: {
            items: {
              include: {
                product: true,
              },
            },
            client: true,
          }
        }
      })

      if (!saleResult?.success || !saleResult?.data?.id) {
        throw new Error(`Failed to create sale - ${saleResult?.error || 'no sale ID returned'}`)
      }

      if (data.status !== 'REFUNDED') {
        const adjustedItems: typeof data.items = []
        try {
          for (const item of data.items) {
            await productService.adjustQuantity(item.productId, -item.quantity)
            adjustedItems.push(item)
          }
        } catch (stockError) {
          for (const adjustedItem of adjustedItems.reverse()) {
            try {
              await productService.adjustQuantity(adjustedItem.productId, adjustedItem.quantity)
            } catch (rollbackError) {
              console.error('Failed to rollback stock for sale item:', rollbackError)
            }
          }

          throw stockError
        }
      }

      if (paidAmount > 0 && !data.skipRegisterRecord) {
        await cashRegisterService.recordSale(cashRegisterId, paidAmount)
      }

      if (data.customerId) {
        await this.syncClientBalanceForSaleChange(null, 0, data.customerId, dueAmount)
      }

      return mapSale(saleResult.data)
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
            },
            client: true,
          }
        }
      })

      return Array.isArray(result?.data) ? result.data.map(mapSale) : []
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
            },
            client: true,
          }
        }
      })

      return result?.data ? mapSale(result.data) : null
    } catch (error) {
      console.error('Error fetching sale:', error)
      throw new Error('Failed to fetch sale')
    }
  }

  // Update a sale
  async updateSale(data: UpdateSaleInput): Promise<Sale> {
    try {
      const { id, ...updateData } = data
      const existingSale = await this.getSaleById(id)
      if (!existingSale) {
        throw new Error('Sale not found')
      }
      
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
            },
            client: true,
          }
        }
      })

      const updatedSale = mapSale(result?.data)
      await this.syncClientBalanceForSaleChange(
        existingSale.customerId,
        existingSale.dueAmount || 0,
        updatedSale.customerId,
        updatedSale.dueAmount || 0,
      )

      return updatedSale
    } catch (error) {
      console.error('Error updating sale:', error)
      throw new Error('Failed to update sale')
    }
  }

  async updateSaleWithItems(id: string, data: CreateSaleInput): Promise<Sale> {
    try {
      const existingSale = await this.getSaleById(id)
      if (!existingSale) {
        throw new Error('Sale not found')
      }

      const subtotal = data.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
      const paidAmount = Math.max(0, Math.min(existingSale.paidAmount ?? data.paidAmount ?? 0, data.total))
      const dueAmount = Math.max(0, data.total - paidAmount)
      const paymentStatus: PaymentStatus =
        data.paymentStatusOverride ||
        (existingSale.status === 'REFUNDED' || data.status === 'REFUNDED'
          ? 'REFUNDED'
          : dueAmount <= 0
            ? 'PAID'
            : paidAmount > 0
              ? 'PARTIAL'
              : 'PENDING')

      const saleUpdateResult = await electronAPI.db.query({
        model: 'sale',
        operation: 'update',
        args: {
          where: { id },
          data: {
            clientId: data.customerId || null,
            status: data.status || existingSale.status || 'CONFIRMED',
            paymentStatus,
            subtotal,
            discount: data.discountAmount || 0,
            discountAmount: data.discountAmount || 0,
            taxAmount: data.taxAmount || 0,
            total: data.total,
            paidAmount,
            dueAmount,
            notes: data.notes || null,
            saleDate: data.saleDate || existingSale.saleDate,
          },
        },
      })

      if (!saleUpdateResult?.success) {
        throw new Error(saleUpdateResult?.error || 'Failed to update sale')
      }

      const existingItems = existingSale.items || []
      const existingByProductId = new Map(existingItems.map((item) => [item.productId, item]))
      const nextProductIds = new Set(data.items.map((item) => item.productId))

      for (const existingItem of existingItems) {
        if (!nextProductIds.has(existingItem.productId)) {
          const deleteResult = await electronAPI.db.query({
            model: 'saleItem',
            operation: 'delete',
            args: {
              where: { id: existingItem.id },
            },
          })
          if (!deleteResult?.success) {
            throw new Error(deleteResult?.error || 'Failed to remove sale item')
          }
        }
      }

      for (const item of data.items) {
        const total = (item.unitPrice * item.quantity) - (item.discount || 0)
        const existingItem = existingByProductId.get(item.productId)

        if (existingItem) {
          const updateResult = await electronAPI.db.query({
            model: 'saleItem',
            operation: 'update',
            args: {
              where: { id: existingItem.id },
              data: {
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discount: item.discount || 0,
                total,
              },
            },
          })
          if (!updateResult?.success) {
            throw new Error(updateResult?.error || 'Failed to update sale item')
          }
        } else {
          const createResult = await electronAPI.db.query({
            model: 'saleItem',
            operation: 'create',
            args: {
              data: {
                saleId: id,
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discount: item.discount || 0,
                total,
              },
            },
          })
          if (!createResult?.success) {
            throw new Error(createResult?.error || 'Failed to add sale item')
          }
        }
      }

      const refreshedSale = await this.getSaleById(id)
      if (!refreshedSale) {
        throw new Error('Failed to reload updated sale')
      }

      await this.syncClientBalanceForSaleChange(
        existingSale.customerId,
        existingSale.dueAmount || 0,
        refreshedSale.customerId,
        refreshedSale.dueAmount || 0,
      )

      return refreshedSale
    } catch (error: any) {
      console.error('Error updating sale with items:', error)
      throw new Error(error?.message || 'Failed to update sale')
    }
  }

  async updateStatus(id: string, status: SaleStatus): Promise<Sale> {
    try {
      const existingSale = await this.getSaleById(id)
      if (!existingSale) {
        throw new Error('Sale not found')
      }

      const paymentStatus: PaymentStatus =
        status === 'REFUNDED'
          ? 'REFUNDED'
          : existingSale.paymentStatus

      const result = await electronAPI.db.query({
        model: 'sale',
        operation: 'update',
        args: {
          where: { id },
          data: {
            status,
            paymentStatus,
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

      if (!result?.data) {
        throw new Error(result?.error || 'Failed to update sale status')
      }

      return mapSale(result.data)
    } catch (error: any) {
      console.error('Error updating sale status:', error)
      throw new Error(error?.message || 'Failed to update sale status')
    }
  }

  async addPayment(id: string, payment: AddSalePaymentInput): Promise<Sale> {
    try {
      const existingSale = await this.getSaleById(id)
      if (!existingSale) {
        throw new Error('Sale not found')
      }

      const amount = Math.max(0, payment.amount || 0)
      if (amount <= 0) {
        throw new Error('Payment amount must be greater than zero')
      }

      const appliedAmount = Math.min(amount, existingSale.dueAmount || 0)
      if (appliedAmount <= 0) {
        throw new Error('This sale has no remaining due amount')
      }

      const nextPaidAmount = (existingSale.paidAmount || 0) + appliedAmount
      const nextDueAmount = Math.max(0, (existingSale.dueAmount || 0) - appliedAmount)
      const nextPaymentStatus: PaymentStatus =
        nextDueAmount <= 0 ? 'PAID' : nextPaidAmount > 0 ? 'PARTIAL' : 'PENDING'

      const result = await electronAPI.db.query({
        model: 'sale',
        operation: 'update',
        args: {
          where: { id },
          data: {
            paidAmount: nextPaidAmount,
            dueAmount: nextDueAmount,
            paymentStatus: nextPaymentStatus,
            paymentMethod: normalizePaymentMethod(payment.paymentMethod),
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

      if (!result?.data) {
        throw new Error(result?.error || 'Failed to add sale payment')
      }

      if (existingSale.customerId) {
        await clientService.updateBalance(existingSale.customerId, appliedAmount)
      }

      return mapSale(result.data)
    } catch (error: any) {
      console.error('Error adding sale payment:', error)
      throw new Error(error?.message || 'Failed to add sale payment')
    }
  }

  async getReturnsForSourceSale(sourceSaleId: string): Promise<Sale[]> {
    try {
      const result = await electronAPI.db.query({
        model: 'sale',
        operation: 'findMany',
        args: {
          where: {
            status: 'REFUNDED',
            notes: {
              contains: buildReturnSourceTag(sourceSaleId),
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
          orderBy: {
            createdAt: 'desc',
          },
        },
      })

      return Array.isArray(result?.data) ? result.data.map(mapSale) : []
    } catch (error) {
      console.error('Error fetching sale returns:', error)
      throw new Error('Failed to fetch sale returns')
    }
  }

  async processReturn(data: ProcessReturnInput): Promise<{ refundSale: Sale; sourceSale: Sale }> {
    try {
      const sourceSale = await this.getSaleById(data.sourceSaleId)
      if (!sourceSale) {
        throw new Error('Original sale not found')
      }

      if (sourceSale.status === 'REFUNDED') {
        throw new Error('This sale has already been fully refunded')
      }

      const previousReturns = await this.getReturnsForSourceSale(data.sourceSaleId)
      const refundedByProductId = extractRefundedQuantityMap(previousReturns)
      const sourceItems = new Map((sourceSale.items || []).map((item) => [item.productId, item]))

      for (const item of data.items) {
        const sourceItem = sourceItems.get(item.productId)
        if (!sourceItem) {
          throw new Error('Return contains an item not found in the original sale')
        }

        const remainingQuantity = sourceItem.quantity - (refundedByProductId.get(item.productId) || 0)
        if (item.quantity > remainingQuantity) {
          throw new Error(`Return quantity exceeds remaining quantity for ${sourceItem.product?.name || 'item'}`)
        }
      }

      const refundNotes = [
        buildReturnSourceTag(sourceSale.id),
        `Return for invoice ${sourceSale.invoiceNumber}`,
        data.notes || '',
      ]
        .filter(Boolean)
        .join(' | ')

      const refundSale = await this.createSale({
        customerId: data.customerId || sourceSale.customerId || undefined,
        customerName: data.customerName || sourceSale.customerName || undefined,
        customerPhone: data.customerPhone || sourceSale.customerPhone || undefined,
        customerEmail: data.customerEmail || sourceSale.customerEmail || undefined,
        status: 'REFUNDED',
        paymentStatusOverride: 'REFUNDED',
        items: data.items,
        discountAmount: data.discountAmount || 0,
        taxAmount: data.taxAmount || 0,
        total: data.refundAmount,
        paidAmount: data.refundAmount,
        paymentMethod: data.paymentMethod,
        notes: refundNotes,
        saleDate: new Date(),
        sellerId: data.sellerId,
        cashRegisterId: data.cashRegisterId,
        skipRegisterRecord: true,
      })

      const newRefundedAmount = (sourceSale.refundedAmount || 0) + data.refundAmount
      const fullyRefunded = newRefundedAmount >= sourceSale.total

      const updatedSourceResult = await electronAPI.db.query({
        model: 'sale',
        operation: 'update',
        args: {
          where: { id: sourceSale.id },
          data: {
            refundedAmount: newRefundedAmount,
            isRefunded: newRefundedAmount > 0,
            status: fullyRefunded ? 'REFUNDED' : sourceSale.status,
            paymentStatus: fullyRefunded ? 'REFUNDED' : sourceSale.paymentStatus,
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

      if (!updatedSourceResult?.data) {
        throw new Error('Failed to update original sale refund totals')
      }

      return {
        refundSale,
        sourceSale: mapSale(updatedSourceResult.data),
      }
    } catch (error: any) {
      console.error('Error processing return:', error)
      throw new Error(error?.message || 'Failed to process return')
    }
  }

  // Delete a sale
  async deleteSale(id: string): Promise<void> {
    try {
      const existingSale = await this.getSaleById(id)
      await electronAPI.db.query({
        model: 'sale',
        operation: 'delete',
        args: {
          where: { id }
        }
      })

      if (existingSale?.customerId) {
        await clientService.updateBalance(existingSale.customerId, existingSale.dueAmount || 0)
      }
    } catch (error) {
      console.error('Error deleting sale:', error)
      throw new Error('Failed to delete sale')
    }
  }
}

export const salesService = new SalesService()
