export interface CashRegister {
  id: string
  openingAmount: number
  closingAmount?: number
  currentBalance: number
  totalSales: number
  totalRefunds: number
  cashIn: number
  cashOut: number
  difference?: number
  notes?: string
  status: 'OPEN' | 'CLOSED'
  openedAt: Date
  closedAt?: Date
  openedById: string
  openedBy?: {
    id: string
    fullName: string
  }
  closedById?: string
  closedBy?: {
    id: string
    fullName: string
  }
  cashMovements: CashMovement[]
}

export interface CashMovement {
  id: string
  type: 'CASH_IN' | 'CASH_OUT'
  amount: number
  reason: string
  createdAt: Date
  cashRegisterId: string
}

export interface OpenRegisterData {
  openingAmount: number
  openedById: string
  notes?: string
}

export interface CloseRegisterData {
  closingAmount: number
  closedById: string
  notes?: string
}

export interface CashMovementData {
  type: 'CASH_IN' | 'CASH_OUT'
  amount: number
  reason: string
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

class CashRegisterService {
  private static instance: CashRegisterService

  private constructor() {}

  static getInstance(): CashRegisterService {
    if (!CashRegisterService.instance) {
      CashRegisterService.instance = new CashRegisterService()
    }
    return CashRegisterService.instance
  }

  // Get the currently open register
  async getOpenRegister(): Promise<CashRegister | null> {
    try {
      const result = await electronAPI.db.query({
        model: 'cashRegister',
        operation: 'findFirst',
        args: {
          where: { status: 'OPEN' },
          include: {
            openedBy: true,
            cashMovements: {
              orderBy: { createdAt: 'desc' }
            }
          }
        }
      })
      return result?.data
    } catch (error) {
      console.error('Error fetching open register:', error)
      throw new Error('Failed to fetch open register')
    }
  }

  // Get register by ID
  async getRegisterById(id: string): Promise<CashRegister | null> {
    try {
      const result = await electronAPI.db.query({
        model: 'cashRegister',
        operation: 'findUnique',
        args: {
          where: { id },
          include: {
            openedBy: true,
            closedBy: true,
            cashMovements: {
              orderBy: { createdAt: 'desc' }
            }
          }
        }
      })
      return result?.data
    } catch (error) {
      console.error('Error fetching register:', error)
      throw new Error('Failed to fetch register')
    }
  }

  // Get all registers
  async getAllRegisters(): Promise<CashRegister[]> {
    try {
      const result = await electronAPI.db.query({
        model: 'cashRegister',
        operation: 'findMany',
        args: {
          include: {
            openedBy: true,
            closedBy: true,
          },
          orderBy: { openedAt: 'desc' }
        }
      })
      return result?.data || []
    } catch (error) {
      console.error('Error fetching registers:', error)
      throw new Error('Failed to fetch registers')
    }
  }

  // Open a new register
  async openRegister(data: OpenRegisterData): Promise<CashRegister> {
    try {
      // Check if there's already an open register
      const existingOpen = await this.getOpenRegister()
      if (existingOpen) {
        throw new Error('There is already an open register. Please close it first.')
      }

      const result = await electronAPI.db.query({
        model: 'cashRegister',
        operation: 'create',
        args: {
          data: {
            openingAmount: data.openingAmount,
            currentBalance: data.openingAmount,
            totalSales: 0,
            totalRefunds: 0,
            cashIn: 0,
            cashOut: 0,
            status: 'OPEN',
            openedById: data.openedById,
            notes: data.notes,
          },
          include: {
            openedBy: true,
          }
        }
      })
      return result?.data
    } catch (error) {
      console.error('Error opening register:', error)
      throw new Error('Failed to open register')
    }
  }

  // Close a register
  async closeRegister(id: string, data: CloseRegisterData): Promise<CashRegister> {
    try {
      const register = await this.getRegisterById(id)
      if (!register) {
        throw new Error('Register not found')
      }
      if (register.status !== 'OPEN') {
        throw new Error('Register is already closed')
      }

      const difference = data.closingAmount - register.currentBalance

      const result = await electronAPI.db.query({
        model: 'cashRegister',
        operation: 'update',
        args: {
          where: { id },
          data: {
            closingAmount: data.closingAmount,
            difference,
            status: 'CLOSED',
            closedAt: new Date(),
            closedById: data.closedById,
            notes: data.notes || register.notes,
          },
          include: {
            openedBy: true,
            closedBy: true,
          }
        }
      })
      return result?.data
    } catch (error) {
      console.error('Error closing register:', error)
      throw new Error('Failed to close register')
    }
  }

  // Add cash movement (in/out)
  async addCashMovement(registerId: string, data: CashMovementData): Promise<CashMovement> {
    try {
      const register = await this.getRegisterById(registerId)
      if (!register) {
        throw new Error('Register not found')
      }
      if (register.status !== 'OPEN') {
        throw new Error('Cannot modify a closed register')
      }

      // Calculate new balance
      const amountChange = data.type === 'CASH_IN' ? data.amount : -data.amount
      const newBalance = register.currentBalance + amountChange
      const cashInChange = data.type === 'CASH_IN' ? data.amount : 0
      const cashOutChange = data.type === 'CASH_OUT' ? data.amount : 0

      // Create cash movement
      const result = await electronAPI.db.query({
        model: 'cashMovement',
        operation: 'create',
        args: {
          data: {
            type: data.type,
            amount: data.amount,
            reason: data.reason,
            cashRegisterId: registerId,
          }
        }
      })

      // Update register balance
      await electronAPI.db.query({
        model: 'cashRegister',
        operation: 'update',
        args: {
          where: { id: registerId },
          data: {
            currentBalance: newBalance,
            cashIn: { increment: cashInChange },
            cashOut: { increment: cashOutChange },
          }
        }
      })

      return result?.data
    } catch (error) {
      console.error('Error adding cash movement:', error)
      throw new Error('Failed to add cash movement')
    }
  }

  // Update register for sale
  async recordSale(registerId: string, amount: number): Promise<void> {
    try {
      await electronAPI.db.query({
        model: 'cashRegister',
        operation: 'update',
        args: {
          where: { id: registerId },
          data: {
            totalSales: { increment: amount },
            currentBalance: { increment: amount },
          }
        }
      })
    } catch (error) {
      console.error('Error recording sale:', error)
      throw new Error('Failed to record sale')
    }
  }

  // Update register for refund
  async recordRefund(registerId: string, amount: number): Promise<void> {
    try {
      await electronAPI.db.query({
        model: 'cashRegister',
        operation: 'update',
        args: {
          where: { id: registerId },
          data: {
            totalRefunds: { increment: amount },
            currentBalance: { decrement: amount },
          }
        }
      })
    } catch (error) {
      console.error('Error recording refund:', error)
      throw new Error('Failed to record refund')
    }
  }

  // Get register statistics
  async getStatistics(registerId?: string): Promise<{
    totalSales: number
    totalRefunds: number
    cashIn: number
    cashOut: number
    currentBalance: number
    transactionCount: number
  }> {
    try {
      if (registerId) {
        const register = await this.getRegisterById(registerId)
        if (!register) {
          throw new Error('Register not found')
        }
        return {
          totalSales: register.totalSales,
          totalRefunds: register.totalRefunds,
          cashIn: register.cashIn,
          cashOut: register.cashOut,
          currentBalance: register.currentBalance,
          transactionCount: register.cashMovements?.length || 0,
        }
      } else {
        // Get all registers and calculate totals
        const registers = await this.getAllRegisters()
        return {
          totalSales: registers.reduce((sum, r) => sum + r.totalSales, 0),
          totalRefunds: registers.reduce((sum, r) => sum + r.totalRefunds, 0),
          cashIn: registers.reduce((sum, r) => sum + r.cashIn, 0),
          cashOut: registers.reduce((sum, r) => sum + r.cashOut, 0),
          currentBalance: 0, // Not applicable for all registers
          transactionCount: 0, // Would need to calculate
        }
      }
    } catch (error) {
      console.error('Error fetching register statistics:', error)
      throw new Error('Failed to fetch register statistics')
    }
  }
}

export const cashRegisterService = CashRegisterService.getInstance()
