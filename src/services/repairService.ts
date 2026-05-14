export interface Repair {
  id: string
  ticketNumber: string
  deviceName: string
  deviceBrand: string
  deviceModel: string
  deviceIMEI?: string
  deviceSerial?: string
  devicePassword?: string
  problemDescription: string
  repairCost: number
  prepayment: number
  dueAmount: number
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DELIVERED' | 'CANCELLED'
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  accessoriesReceived?: string
  technicianNotes?: string
  expectedDeliveryDate?: Date
  receivedAt: Date
  diagnosedAt?: Date
  startedAt?: Date
  completedAt?: Date
  deliveredAt?: Date
  cancelledAt?: Date
  cancellationReason?: string
  createdAt: Date
  updatedAt: Date
  clientId: string
  client?: {
    id: string
    fullName: string
    phone: string
    email?: string
  }
  technicianId?: string
  technician?: {
    id: string
    fullName: string
  }
  parts?: RepairPart[]
}

export interface RepairPart {
  id: string
  quantity: number
  unitPrice: number
  total: number
  repairId: string
  productId: string
  notes?: string
  product?: {
    id: string
    name: string
    sku?: string
  }
}

export interface CreateRepairData {
  deviceName: string
  deviceBrand: string
  deviceModel: string
  deviceIMEI?: string
  deviceSerial?: string
  devicePassword?: string
  problemDescription: string
  repairCost: number
  prepayment?: number
  accessoriesReceived?: string
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  expectedDeliveryDate?: Date
  clientId: string
  technicianId?: string
}

export interface UpdateRepairData {
  deviceName?: string
  deviceBrand?: string
  deviceModel?: string
  deviceIMEI?: string
  deviceSerial?: string
  devicePassword?: string
  problemDescription?: string
  repairCost?: number
  prepayment?: number
  accessoriesReceived?: string
  technicianNotes?: string
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DELIVERED' | 'CANCELLED'
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  expectedDeliveryDate?: Date
  technicianId?: string
  cancellationReason?: string
}

export interface RepairFilters {
  search?: string
  status?: string
  priority?: string
  clientId?: string
  technicianId?: string
  startDate?: Date
  endDate?: Date
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

class RepairService {
  private static instance: RepairService

  private constructor() {}

  static getInstance(): RepairService {
    if (!RepairService.instance) {
      RepairService.instance = new RepairService()
    }
    return RepairService.instance
  }

  // Get all repairs
  async getRepairs(filters?: RepairFilters): Promise<Repair[]> {
    try {
      const result = await electronAPI.db.query({
        model: 'repair',
        operation: 'findMany',
        args: {
          where: this.buildFilters(filters),
          include: {
            client: true,
            technician: true,
            parts: {
              include: {
                product: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      })
      return result?.data || []
    } catch (error) {
      console.error('Error fetching repairs:', error)
      throw new Error('Failed to fetch repairs')
    }
  }

  // Get a single repair by ID
  async getRepairById(id: string): Promise<Repair | null> {
    try {
      const result = await electronAPI.db.query({
        model: 'repair',
        operation: 'findUnique',
        args: {
          where: { id },
          include: {
            client: true,
            technician: true,
            parts: {
              include: {
                product: true
              }
            }
          }
        }
      })
      return result?.data
    } catch (error) {
      console.error('Error fetching repair:', error)
      throw new Error('Failed to fetch repair')
    }
  }

  // Create a new repair
  async createRepair(data: CreateRepairData): Promise<Repair> {
    try {
      // Generate ticket number
      const ticketNumber = await this.generateTicketNumber()

      const result = await electronAPI.db.query({
        model: 'repair',
        operation: 'create',
        args: {
          data: {
            ticketNumber,
            deviceName: data.deviceName,
            deviceBrand: data.deviceBrand,
            deviceModel: data.deviceModel,
            deviceIMEI: data.deviceIMEI,
            deviceSerial: data.deviceSerial,
            devicePassword: data.devicePassword,
            problemDescription: data.problemDescription,
            repairCost: data.repairCost,
            prepayment: data.prepayment || 0,
            dueAmount: data.repairCost - (data.prepayment || 0),
            status: 'PENDING',
            priority: data.priority || 'NORMAL',
            accessoriesReceived: data.accessoriesReceived,
            expectedDeliveryDate: data.expectedDeliveryDate,
            clientId: data.clientId,
            technicianId: data.technicianId,
          },
          include: {
            client: true,
            technician: true,
          }
        }
      })
      return result?.data
    } catch (error) {
      console.error('Error creating repair:', error)
      throw new Error('Failed to create repair')
    }
  }

  // Update a repair
  async updateRepair(id: string, data: UpdateRepairData): Promise<Repair> {
    try {
      const updateData: any = { ...data }
      
      // Calculate due amount if repairCost or prepayment changed
      if (data.repairCost !== undefined || data.prepayment !== undefined) {
        const currentRepair = await this.getRepairById(id)
        if (currentRepair) {
          const newCost = data.repairCost !== undefined ? data.repairCost : currentRepair.repairCost
          const newPrepayment = data.prepayment !== undefined ? data.prepayment : currentRepair.prepayment
          updateData.dueAmount = newCost - newPrepayment
        }
      }

      // Update status timestamps
      if (data.status) {
        const now = new Date()
        switch (data.status) {
          case 'IN_PROGRESS':
            updateData.startedAt = now
            break
          case 'COMPLETED':
            updateData.completedAt = now
            break
          case 'DELIVERED':
            updateData.deliveredAt = now
            break
          case 'CANCELLED':
            updateData.cancelledAt = now
            break
        }
      }

      const result = await electronAPI.db.query({
        model: 'repair',
        operation: 'update',
        args: {
          where: { id },
          data: updateData,
          include: {
            client: true,
            technician: true,
          }
        }
      })
      return result?.data
    } catch (error) {
      console.error('Error updating repair:', error)
      throw new Error('Failed to update repair')
    }
  }

  // Delete a repair
  async deleteRepair(id: string): Promise<void> {
    try {
      await electronAPI.db.query({
        model: 'repair',
        operation: 'delete',
        args: {
          where: { id }
        }
      })
    } catch (error) {
      console.error('Error deleting repair:', error)
      throw new Error('Failed to delete repair')
    }
  }

  // Add a part to a repair
  async addPart(repairId: string, data: { productId: string; quantity: number; unitPrice: number; notes?: string }): Promise<void> {
    try {
      await electronAPI.db.query({
        model: 'repairPart',
        operation: 'create',
        args: {
          data: {
            repairId,
            productId: data.productId || null,
            quantity: data.quantity,
            unitPrice: data.unitPrice,
            total: data.quantity * data.unitPrice,
            notes: data.notes || null
          }
        }
      })

      // Update inventory if product exists
      if (data.productId) {
        await electronAPI.db.query({
          model: 'product',
          operation: 'update',
          args: {
            where: { id: data.productId },
            data: {
              quantity: { decrement: data.quantity }
            }
          }
        })
      }
    } catch (error) {
      console.error('Error adding part:', error)
      throw new Error('Failed to add part')
    }
  }

  // Remove a part from a repair
  async removePart(repairId: string, partId: string): Promise<void> {
    try {
      // First get the part to restore inventory
      const partResult = await electronAPI.db.query({
        model: 'repairPart',
        operation: 'findUnique',
        args: {
          where: { id: partId }
        }
      })
      
      const part = partResult?.data

      // Delete the part
      await electronAPI.db.query({
        model: 'repairPart',
        operation: 'delete',
        args: {
          where: { id: partId }
        }
      })

      // Restore inventory if product exists
      if (part?.productId) {
        await electronAPI.db.query({
          model: 'product',
          operation: 'update',
          args: {
            where: { id: part.productId },
            data: {
              quantity: { increment: part.quantity }
            }
          }
        })
      }
    } catch (error) {
      console.error('Error removing part:', error)
      throw new Error('Failed to remove part')
    }
  }

  // Generate unique ticket number
  private async generateTicketNumber(): Promise<string> {
    const prefix = 'REP'
    const date = new Date()
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
    
    // Get count of repairs created today
    const startOfDay = new Date(date.setHours(0, 0, 0, 0))
    const endOfDay = new Date(date.setHours(23, 59, 59, 999))
    
    try {
      const result = await electronAPI.db.query({
        model: 'repair',
        operation: 'count',
        args: {
          where: {
            createdAt: {
              gte: startOfDay,
              lte: endOfDay
            }
          }
        }
      })
      const count = result?.data || 0
      const sequence = String(count + 1).padStart(3, '0')
      return `${prefix}-${dateStr}-${sequence}`
    } catch (error) {
      // Fallback to random number if count fails
      const random = Math.floor(Math.random() * 900) + 100
      return `${prefix}-${dateStr}-${random}`
    }
  }

  // Build Prisma where clause from filters
  private buildFilters(filters?: RepairFilters): any {
    const where: any = {}

    if (filters?.search) {
      where.OR = [
        { ticketNumber: { contains: filters.search, mode: 'insensitive' } },
        { deviceName: { contains: filters.search, mode: 'insensitive' } },
        { deviceBrand: { contains: filters.search, mode: 'insensitive' } },
        { deviceModel: { contains: filters.search, mode: 'insensitive' } },
        { problemDescription: { contains: filters.search, mode: 'insensitive' } },
        { client: { fullName: { contains: filters.search, mode: 'insensitive' } } },
      ]
    }

    if (filters?.status) {
      where.status = filters.status
    }

    if (filters?.priority) {
      where.priority = filters.priority
    }

    if (filters?.clientId) {
      where.clientId = filters.clientId
    }

    if (filters?.technicianId) {
      where.technicianId = filters.technicianId
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {}
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate
      }
    }

    return where
  }
}

export const repairService = RepairService.getInstance()
