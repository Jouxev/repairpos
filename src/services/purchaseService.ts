export type PurchaseStatus = 'ORDERED' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED'
export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID'

export interface PurchaseItem {
  productId: string
  quantity: number
  unitCost: number
  total: number
}

export interface CreatePurchaseData {
  invoiceNumber: string
  supplierId: string
  items: PurchaseItem[]
  subtotal: number
  taxAmount: number
  total: number
  paidAmount?: number
  dueAmount?: number
  notes?: string
  orderedAt?: Date
  expectedDeliveryDate?: Date
  updateStock?: boolean
}

export interface UpdatePurchaseData {
  invoiceNumber?: string
  supplierId?: string
  subtotal?: number
  taxAmount?: number
  total?: number
  paidAmount?: number
  dueAmount?: number
  paymentStatus?: PaymentStatus
  status?: PurchaseStatus
  notes?: string
  expectedDeliveryDate?: Date
  receivedAt?: Date
}

export interface Purchase {
  id: string
  invoiceNumber: string
  subtotal: number
  taxAmount: number
  total: number
  paidAmount: number
  dueAmount: number
  paymentStatus: PaymentStatus
  status: PurchaseStatus
  notes?: string
  orderedAt: Date
  expectedDeliveryDate?: Date
  receivedAt?: Date
  createdAt: Date
  updatedAt: Date
  supplierId: string
  supplier: {
    id: string
    name: string
    phone?: string
    email?: string
  }
  items: {
    id: string
    quantity: number
    unitCost: number
    total: number
    product: {
      id: string
      name: string
      sku?: string
    }
  }[]
}

export interface PurchaseFilters {
  search?: string
  status?: PurchaseStatus
  paymentStatus?: PaymentStatus
  supplierId?: string
  dateFrom?: Date
  dateTo?: Date
}

// Access the electronAPI exposed by preload script
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

class PurchaseService {
  private static instance: PurchaseService

  private constructor() {}

  static getInstance(): PurchaseService {
    if (!PurchaseService.instance) {
      PurchaseService.instance = new PurchaseService()
    }
    return PurchaseService.instance
  }

  // Create new purchase
  async createPurchase(data: CreatePurchaseData) {
    try {
      const result = await electronAPI.db.query({
        model: 'purchase',
        operation: 'create',
        args: {
          data: {
            invoiceNumber: data.invoiceNumber,
            supplierId: data.supplierId,
            subtotal: data.subtotal,
            taxAmount: data.taxAmount,
            total: data.total,
            paidAmount: data.paidAmount || 0,
            dueAmount: data.dueAmount || data.total,
            paymentStatus: data.paidAmount && data.paidAmount > 0 ? 'PARTIAL' : 'PENDING',
            status: 'ORDERED',
            notes: data.notes,
            orderedAt: data.orderedAt || new Date(),
            expectedDeliveryDate: data.expectedDeliveryDate,
          }
        }
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      // Create purchase items if provided
      if (data.items && data.items.length > 0) {
        for (const item of data.items) {
          await electronAPI.db.query({
            model: 'purchaseItem',
            operation: 'create',
            args: {
              data: {
                purchaseId: result.data.id,
                productId: item.productId,
                quantity: item.quantity,
                unitCost: item.unitCost,
                total: item.total,
              }
            }
          })

          // Update product stock quantity if updateStock is true
          if (data.updateStock) {
            await electronAPI.db.query({
              model: 'product',
              operation: 'update',
              args: {
                where: { id: item.productId },
                data: {
                  quantity: { increment: item.quantity }
                }
              }
            })
          }
        }
      }

      return { success: true, purchase: result.data }
    } catch (error) {
      console.error('Error creating purchase:', error)
      throw error
    }
  }

  // Get all purchases with optional filters
  async getPurchases(filters: PurchaseFilters = {}) {
    try {
      const result = await electronAPI.db.query({
        model: 'purchase',
        operation: 'findMany',
        args: {
          include: {
            supplier: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
              }
            },
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    sku: true,
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      let purchases = result.data

      // Apply filters in memory
      if (filters.search) {
        const query = filters.search.toLowerCase()
        purchases = purchases.filter(
          (p: any) =>
            p.invoiceNumber?.toLowerCase().includes(query) ||
            p.supplier?.name?.toLowerCase().includes(query)
        )
      }

      if (filters.status) {
        purchases = purchases.filter((p: any) => p.status === filters.status)
      }

      if (filters.paymentStatus) {
        purchases = purchases.filter((p: any) => p.paymentStatus === filters.paymentStatus)
      }

      if (filters.supplierId) {
        purchases = purchases.filter((p: any) => p.supplierId === filters.supplierId)
      }

      return purchases
    } catch (error) {
      console.error('Error fetching purchases:', error)
      throw error
    }
  }

  // Get purchase by ID
  async getPurchaseById(id: string) {
    try {
      const result = await electronAPI.db.query({
        model: 'purchase',
        operation: 'findUnique',
        args: {
          where: { id },
          include: {
            supplier: true,
            items: {
              include: {
                product: true
              }
            }
          }
        }
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      if (!result.data) {
        throw new Error('Purchase not found')
      }

      return result.data
    } catch (error) {
      console.error('Error fetching purchase:', error)
      throw error
    }
  }

  // Update purchase
  async updatePurchase(id: string, data: UpdatePurchaseData) {
    try {
      const result = await electronAPI.db.query({
        model: 'purchase',
        operation: 'update',
        args: {
          where: { id },
          data
        }
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      return { success: true, purchase: result.data }
    } catch (error) {
      console.error('Error updating purchase:', error)
      throw error
    }
  }

  // Receive stock for purchase
  async receiveStock(id: string, items: { itemId: string; receivedQty: number }[]) {
    try {
      // Get purchase details
      const purchase = await this.getPurchaseById(id)

      // Update each item's received quantity
      for (const item of items) {
        await electronAPI.db.query({
          model: 'purchaseItem',
          operation: 'update',
          args: {
            where: { id: item.itemId },
            data: {
              receivedQty: { increment: item.receivedQty }
            }
          }
        })

        // Update product quantity
        const purchaseItem = purchase.items.find((i: any) => i.id === item.itemId)
        if (purchaseItem) {
          await electronAPI.db.query({
            model: 'product',
            operation: 'update',
            args: {
              where: { id: purchaseItem.productId },
              data: {
                quantity: { increment: item.receivedQty }
              }
            }
          })
        }
      }

      // Check if fully received
      const allReceived = purchase.items.every((item: any) => {
        const received = item.receivedQty || 0
        return received >= item.quantity
      })

      // Update purchase status
      const newStatus = allReceived ? 'RECEIVED' : 'PARTIAL'
      await this.updatePurchase(id, {
        status: newStatus,
        receivedAt: new Date()
      })

      return { success: true, status: newStatus }
    } catch (error) {
      console.error('Error receiving stock:', error)
      throw error
    }
  }

  // Delete purchase
  async deletePurchase(id: string) {
    try {
      const result = await electronAPI.db.query({
        model: 'purchase',
        operation: 'delete',
        args: { where: { id } }
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      return { success: true }
    } catch (error) {
      console.error('Error deleting purchase:', error)
      throw error
    }
  }
}

export const purchaseService = PurchaseService.getInstance()
export default purchaseService
