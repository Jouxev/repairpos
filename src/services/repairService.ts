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
  status: 'PENDING' | 'IN_PROGRESS' | 'REJECTED' | 'COMPLETED_WAITING_PAYMENT' | 'COMPLETED' | 'FINISHED' | 'DELIVERED' | 'CANCELLED'
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
    address?: string
  }
  technicianId?: string
  technician?: {
    id: string
    fullName: string
  }
  parts?: RepairPart[]
  partsCost?: number
}

export interface RepairPart {
  id: string
  partName: string
  quantity: number
  unitCost: number
  total: number
  notes?: string
  productId?: string // optional reference to product
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
  parts?: RepairPart[]
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
  status?: 'PENDING' | 'IN_PROGRESS' | 'REJECTED' | 'COMPLETED_WAITING_PAYMENT' | 'COMPLETED' | 'FINISHED' | 'DELIVERED' | 'CANCELLED'
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  expectedDeliveryDate?: Date
  technicianId?: string
  cancellationReason?: string
  parts?: RepairPart[]
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


const electronAPI = window.electronAPI

// Helper to parse parts from JSON
const parseParts = (parts: string | null | undefined): RepairPart[] => {
  if (!parts) return []
  try {
    return JSON.parse(parts)
  } catch {
    return []
  }
}

// Helper to calculate parts cost
const calculatePartsCost = (parts: RepairPart[]): number => {
  return parts.reduce((sum, part) => sum + (part.total || 0), 0)
}

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
            technician: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      })
      
      const repairs = result?.data || []
      // Parse parts JSON and calculate partsCost
      return repairs.map((repair: Repair) => {
        const parsedParts = parseParts(repair.parts as unknown as string)
        return {
          ...repair,
          parts: parsedParts,
          partsCost: calculatePartsCost(parsedParts)
        }
      })
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
            technician: true
          }
        }
      })
      
      const repair = result?.data
      if (!repair) return null
      
      // Parse parts JSON and calculate partsCost
      const parsedParts = parseParts(repair.parts as unknown as string)
      return {
        ...repair,
        parts: parsedParts,
        partsCost: calculatePartsCost(parsedParts)
      }
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
      
      // Convert parts array to JSON string
      const parts = data.parts && data.parts.length > 0 ? JSON.stringify(data.parts) : null

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
            parts
          },
          include: {
            client: true,
            technician: true
          }
        }
      })
      
      const repair = result?.data
      if (!repair) {
        throw new Error('Failed to create repair')
      }
      
      // Parse parts JSON for return
      const parsedParts = parseParts(repair.parts as unknown as string)
      return {
        ...repair,
        parts: parsedParts,
        partsCost: calculatePartsCost(parsedParts)
      }
    } catch (error) {
      console.error('Error creating repair:', error)
      throw new Error('Failed to create repair')
    }
  }

  // Update a repair
  async updateRepair(id: string, data: UpdateRepairData): Promise<Repair> {
    try {
      const updateData: any = { ...data }
      
      // Handle parts update
      if (data.parts !== undefined) {
        updateData.parts = data.parts && data.parts.length > 0 ? JSON.stringify(data.parts) : null
      }
      
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
          case 'COMPLETED_WAITING_PAYMENT':
            // No specific timestamp, waiting for payment
            break
          case 'COMPLETED':
            updateData.completedAt = now
            break
          case 'FINISHED':
            // Mark as finished (fully processed)
            break
          case 'DELIVERED':
            updateData.deliveredAt = now
            break
          case 'CANCELLED':
            updateData.cancelledAt = now
            break
          case 'REJECTED':
            // Can be moved back to PENDING
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
            technician: true
          }
        }
      })
      
      const repair = result?.data
      if (!repair) {
        throw new Error('Failed to update repair')
      }
      
      // Parse parts JSON for return
      const parsedParts = parseParts(repair.parts as unknown as string)
      return {
        ...repair,
        parts: parsedParts,
        partsCost: calculatePartsCost(parsedParts)
      }
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
  async addPart(repairId: string, data: { partName: string; quantity: number; unitCost: number; notes?: string; productId?: string }): Promise<Repair> {
    try {
      // Get current repair
      const repair = await this.getRepairById(repairId)
      if (!repair) {
        throw new Error('Repair not found')
      }
      
      // Create new part
      const newPart: RepairPart = {
        id: crypto.randomUUID(),
        partName: data.partName,
        quantity: data.quantity,
        unitCost: data.unitCost,
        total: data.quantity * data.unitCost,
        notes: data.notes
      }
      
      // Add to existing parts
      const currentParts = repair.parts || []
      const updatedParts = [...currentParts, newPart]
      
      // Update repair with new parts
      return await this.updateRepair(repairId, { parts: updatedParts })
    } catch (error) {
      console.error('Error adding part:', error)
      throw new Error('Failed to add part')
    }
  }

  // Remove a part from a repair
  async removePart(repairId: string, partId: string): Promise<Repair> {
    try {
      // Get current repair
      const repair = await this.getRepairById(repairId)
      if (!repair) {
        throw new Error('Repair not found')
      }
      
      // Remove part from list
      const currentParts = repair.parts || []
      const updatedParts = currentParts.filter(part => part.id !== partId)
      
      // Update repair with new parts
      return await this.updateRepair(repairId, { parts: updatedParts })
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

  // Calculate and distribute technician commission for a completed repair
  async calculateTechnicianCommission(repairId: string): Promise<{
    profit: number;
    technicianCommission: number;
    storeProfit: number;
    technicianId: string;
  }> {
    try {
      // Import userService here to avoid circular dependency
      const { userService } = await import('./userService');
      
      // Get the repair details
      const repair = await this.getRepairById(repairId);
      if (!repair) {
        throw new Error('Repair not found');
      }

      if (!repair.technicianId) {
        throw new Error('No technician assigned to this repair');
      }

      // Get technician details
      const technician = await userService.getUserById(repair.technicianId);
      if (!technician) {
        throw new Error('Technician not found');
      }

      // Calculate profit/loss
      const partsCost = repair.partsCost || 0;
      const revenue = repair.repairCost || 0;
      const profit = revenue - partsCost;

      // Get technician's commission rate (default to 50%)
      const commissionRate = technician.commissionRate ?? 50;

      // Calculate commission
      let technicianCommission: number;
      let storeProfit: number;

      if (profit > 0) {
        // Profit scenario: technician gets commission % of profit
        technicianCommission = profit * (commissionRate / 100);
        storeProfit = profit - technicianCommission;
        
        // Record the commission earning
        await userService.addTechnicianEarning(
          technician.id,
          technicianCommission,
          'COMMISSION',
          `Commission for repair ${repair.ticketNumber} (${commissionRate}% of $${profit.toFixed(2)} profit)`,
          repairId
        );
      } else if (profit < 0) {
        // Loss scenario: technician shares the loss according to commission rate
        const loss = Math.abs(profit);
        const technicianShare = loss * (commissionRate / 100);
        
        // Technician loses money (negative commission)
        technicianCommission = -technicianShare;
        storeProfit = -(loss - technicianShare);
        
        // Record the penalty
        await userService.addTechnicianEarning(
          technician.id,
          technicianCommission, // Negative amount
          'PENALTY',
          `Loss share for repair ${repair.ticketNumber} (${commissionRate}% of $${loss.toFixed(2)} loss)`,
          repairId
        );
      } else {
        // Break-even scenario
        technicianCommission = 0;
        storeProfit = 0;
      }

      return {
        profit,
        technicianCommission,
        storeProfit,
        technicianId: technician.id
      };
    } catch (error) {
      console.error('Error calculating technician commission:', error);
      throw error;
    }
  }
}

export const repairService = RepairService.getInstance()
