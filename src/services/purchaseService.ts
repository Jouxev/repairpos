import { productService } from './productService'
import { supplierService } from './supplierService'

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
  orderedAt?: Date
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
    productId: string
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
      const paidAmount = Math.max(0, Math.min(data.paidAmount ?? 0, data.total))
      const dueAmount = Math.max(0, data.dueAmount ?? (data.total - paidAmount))
      const paymentStatus: PaymentStatus =
        dueAmount <= 0 ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'PENDING'

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
            paidAmount,
            dueAmount,
            paymentStatus,
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
            await productService.adjustQuantity(item.productId, item.quantity)
          }
        }
      }

      await supplierService.syncSupplierBalance(data.supplierId)

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
      const existingPurchase = await this.getPurchaseById(id)
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

      const nextSupplierId = data.supplierId || existingPurchase.supplierId
      await supplierService.syncSupplierBalance(nextSupplierId)

      if (existingPurchase.supplierId !== nextSupplierId) {
        await supplierService.syncSupplierBalance(existingPurchase.supplierId)
      }

      return { success: true, purchase: result.data }
    } catch (error) {
      console.error('Error updating purchase:', error)
      throw error
    }
  }

  async updatePurchaseWithItems(id: string, data: CreatePurchaseData) {
    try {
      const purchase = await this.getPurchaseById(id)
      const paidAmount = Math.max(0, Math.min(data.paidAmount ?? purchase.paidAmount ?? 0, data.total))
      const dueAmount = Math.max(data.total - paidAmount, 0)
      const paymentStatus: PaymentStatus =
        paidAmount <= 0 ? 'PENDING' : dueAmount <= 0 ? 'PAID' : 'PARTIAL'

      const existingItems = (purchase.items || []) as Purchase['items']
      const existingByProductId = new Map<string, Purchase['items'][number]>(
        existingItems.map((item) => [item.productId, item])
      )
      const nextProductIds = new Set(data.items.map((item) => item.productId))

      const preservedStatus: PurchaseStatus =
        purchase.status === 'CANCELLED'
          ? 'CANCELLED'
          : purchase.status === 'RECEIVED'
            ? 'RECEIVED'
            : purchase.status === 'PARTIAL'
              ? 'PARTIAL'
              : 'ORDERED'

      const purchaseUpdateResult = await electronAPI.db.query({
        model: 'purchase',
        operation: 'update',
        args: {
          where: { id },
          data: {
            invoiceNumber: data.invoiceNumber,
            supplierId: data.supplierId,
            orderedAt: data.orderedAt,
            expectedDeliveryDate: data.expectedDeliveryDate,
            notes: data.notes,
            subtotal: data.subtotal,
            taxAmount: data.taxAmount,
            total: data.total,
            paidAmount,
            dueAmount,
            paymentStatus,
            status: preservedStatus,
          },
        },
      })

      if (!purchaseUpdateResult.success) {
        throw new Error(purchaseUpdateResult.error)
      }

      for (const existingItem of existingItems) {
        if (!nextProductIds.has(existingItem.productId)) {
          const deleteResult = await electronAPI.db.query({
            model: 'purchaseItem',
            operation: 'delete',
            args: {
              where: { id: existingItem.id },
            },
          })
          if (!deleteResult.success) {
            throw new Error(deleteResult.error)
          }
        }
      }

      for (const item of data.items) {
        const existingItem = existingByProductId.get(item.productId)
        if (existingItem) {
          const updateResult = await electronAPI.db.query({
            model: 'purchaseItem',
            operation: 'update',
            args: {
              where: { id: existingItem.id },
              data: {
                productId: item.productId,
                quantity: item.quantity,
                unitCost: item.unitCost,
                total: item.total,
              },
            },
          })
          if (!updateResult.success) {
            throw new Error(updateResult.error)
          }
        } else {
          const createResult = await electronAPI.db.query({
            model: 'purchaseItem',
            operation: 'create',
            args: {
              data: {
                purchaseId: id,
                productId: item.productId,
                quantity: item.quantity,
                unitCost: item.unitCost,
                total: item.total,
              },
            },
          })
          if (!createResult.success) {
            throw new Error(createResult.error)
          }
        }
      }

      await supplierService.syncSupplierBalance(data.supplierId)

      if (purchase.supplierId !== data.supplierId) {
        await supplierService.syncSupplierBalance(purchase.supplierId)
      }

      return { success: true }
    } catch (error) {
      console.error('Error updating purchase with items:', error)
      throw error
    }
  }

  // Receive stock for purchase
  async receiveStock(id: string, items: { itemId: string; receivedQty: number }[]) {
    try {
      if (!items.length) {
        throw new Error('Please enter at least one received quantity')
      }

      // Get purchase details
      const purchase = await this.getPurchaseById(id)
      const purchaseItemsById = new Map<string, Purchase['items'][number]>(
        purchase.items.map((item) => [item.id, item])
      )

      for (const item of items) {
        const purchaseItem = purchaseItemsById.get(item.itemId)
        if (!purchaseItem) {
          throw new Error('Purchase item not found')
        }

        const receivedQty = Math.max(0, Math.min(item.receivedQty, purchaseItem.quantity))
        if (receivedQty <= 0) {
          continue
        }

        await productService.adjustQuantity(purchaseItem.productId, receivedQty)
      }

      const receivedByItemId = new Map<string, number>(
        items.map((item) => [item.itemId, item.receivedQty])
      )
      const allReceived = purchase.items.every((item) => {
        const received = receivedByItemId.get(item.id) || 0
        return received >= item.quantity
      })

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
      const purchase = await this.getPurchaseById(id)
      const result = await electronAPI.db.query({
        model: 'purchase',
        operation: 'delete',
        args: { where: { id } }
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      await supplierService.syncSupplierBalance(purchase.supplierId)

      return { success: true }
    } catch (error) {
      console.error('Error deleting purchase:', error)
      throw error
    }
  }
}

export const purchaseService = PurchaseService.getInstance()
export default purchaseService
