export interface Supplier {
  id: string
  name: string
  phone?: string
  email?: string
  address?: string
  notes?: string
  balance: number
  totalPurchases: number
  totalPaid: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CreateSupplierData {
  name: string
  phone?: string
  email?: string
  address?: string
  notes?: string
  isActive?: boolean
}

export interface UpdateSupplierData {
  name?: string
  phone?: string
  email?: string
  address?: string
  notes?: string
  isActive?: boolean
}

export interface SupplierPaymentData {
  amount: number
  paymentMethod: string
  notes?: string
  date?: Date
}

export interface SupplierFilters {
  search?: string
  isActive?: boolean
  hasBalance?: boolean
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

class SupplierService {
  private static instance: SupplierService

  private constructor() {}

  static getInstance(): SupplierService {
    if (!SupplierService.instance) {
      SupplierService.instance = new SupplierService()
    }
    return SupplierService.instance
  }

  // Create new supplier
  async createSupplier(data: CreateSupplierData) {
    try {
      const result = await electronAPI.db.query({
        model: 'supplier',
        operation: 'create',
        args: {
          data: {
            name: data.name,
            phone: data.phone,
            email: data.email,
            address: data.address,
            notes: data.notes,
            balance: 0,
            isActive: data.isActive ?? true,
          }
        }
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      return { success: true, supplier: result.data }
    } catch (error) {
      console.error('Error creating supplier:', error)
      throw error
    }
  }

  // Get all suppliers with optional filters
  async getSuppliers(filters: SupplierFilters = {}) {
    try {
      const result = await electronAPI.db.query({
        model: 'supplier',
        operation: 'findMany',
        args: {
          orderBy: { createdAt: 'desc' }
        }
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      let suppliers = result.data

      // Apply filters in memory
      if (filters.search) {
        const query = filters.search.toLowerCase()
        suppliers = suppliers.filter(
          (s: any) =>
            s.name?.toLowerCase().includes(query) ||
            s.email?.toLowerCase().includes(query) ||
            s.phone?.toLowerCase().includes(query) ||
            s.address?.toLowerCase().includes(query)
        )
      }

      if (filters.isActive !== undefined) {
        suppliers = suppliers.filter((s: any) => s.isActive === filters.isActive)
      }

      if (filters.hasBalance) {
        suppliers = suppliers.filter((s: any) => s.balance > 0)
      }

      return suppliers
    } catch (error) {
      console.error('Error fetching suppliers:', error)
      throw error
    }
  }

  // Get supplier by ID
  async getSupplierById(id: string) {
    try {
      const result = await electronAPI.db.query({
        model: 'supplier',
        operation: 'findUnique',
        args: { where: { id } }
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      if (!result.data) {
        throw new Error('Supplier not found')
      }

      return result.data
    } catch (error) {
      console.error('Error fetching supplier:', error)
      throw error
    }
  }

  // Update supplier
  async updateSupplier(id: string, data: UpdateSupplierData) {
    try {
      const result = await electronAPI.db.query({
        model: 'supplier',
        operation: 'update',
        args: {
          where: { id },
          data
        }
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      return { success: true, supplier: result.data }
    } catch (error) {
      console.error('Error updating supplier:', error)
      throw error
    }
  }

  // Delete supplier
  async deleteSupplier(id: string) {
    try {
      const result = await electronAPI.db.query({
        model: 'supplier',
        operation: 'delete',
        args: { where: { id } }
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      return { success: true }
    } catch (error) {
      console.error('Error deleting supplier:', error)
      throw error
    }
  }

  // Add payment to supplier
  async addPayment(supplierId: string, paymentData: SupplierPaymentData) {
    try {
      // Get current supplier
      const supplier = await this.getSupplierById(supplierId)
      
      // Calculate new balance
      const newBalance = supplier.balance - paymentData.amount

      // Update supplier balance
      const result = await electronAPI.db.query({
        model: 'supplier',
        operation: 'update',
        args: {
          where: { id: supplierId },
          data: {
            balance: newBalance,
            totalPaid: { increment: paymentData.amount }
          }
        }
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      return { success: true, supplier: result.data }
    } catch (error) {
      console.error('Error adding payment:', error)
      throw error
    }
  }

  // Get supplier purchases
  async getSupplierPurchases(supplierId: string) {
    try {
      const result = await electronAPI.db.query({
        model: 'purchase',
        operation: 'findMany',
        args: {
          where: { supplierId },
          orderBy: { createdAt: 'desc' }
        }
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      return result.data
    } catch (error) {
      console.error('Error fetching supplier purchases:', error)
      throw error
    }
  }

  // Get supplier statement
  async getSupplierStatement(supplierId: string, startDate?: Date, endDate?: Date) {
    try {
      // Get supplier details
      const supplier = await this.getSupplierById(supplierId)
      
      // Get purchases
      const purchases = await this.getSupplierPurchases(supplierId)

      // Filter by date if provided
      let filteredPurchases = purchases
      if (startDate && endDate) {
        filteredPurchases = purchases.filter((p: any) => {
          const date = new Date(p.orderedAt)
          return date >= startDate && date <= endDate
        })
      }

      // Calculate totals
      const totalPurchases = filteredPurchases.reduce((sum: number, p: any) => sum + p.total, 0)
      const totalPaid = filteredPurchases.reduce((sum: number, p: any) => sum + p.paidAmount, 0)
      const totalDue = filteredPurchases.reduce((sum: number, p: any) => sum + p.dueAmount, 0)

      return {
        supplier,
        purchases: filteredPurchases,
        summary: {
          totalPurchases,
          totalPaid,
          totalDue,
          currentBalance: supplier.balance
        }
      }
    } catch (error) {
      console.error('Error generating supplier statement:', error)
      throw error
    }
  }
}

export const supplierService = SupplierService.getInstance()
export default supplierService
