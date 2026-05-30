export interface Client {
  id: string
  fullName: string
  phone: string
  email?: string
  address?: string
  notes?: string
  isActive: boolean
  balance: number
  loyaltyPoints: number
  createdAt: Date
  updatedAt: Date
}

export interface CreateClientData {
  fullName: string
  phone: string
  email?: string
  address?: string
  notes?: string
  isActive?: boolean
}

export interface UpdateClientData {
  fullName?: string
  phone?: string
  email?: string
  address?: string
  notes?: string
  isActive?: boolean
}

export interface ClientFilters {
  search?: string
}

export interface ClientPaymentData {
  amount: number
  paymentMethod: string
  notes?: string
  date?: Date
}


const electronAPI = window.electronAPI

class ClientService {
  private static instance: ClientService

  private constructor() {}

  static getInstance(): ClientService {
    if (!ClientService.instance) {
      ClientService.instance = new ClientService()
    }
    return ClientService.instance
  }

  // Get all clients
  async getClients(filters?: ClientFilters): Promise<Client[]> {
    try {
      const result = await electronAPI.db.query({
        model: 'client',
        operation: 'findMany',
        args: {
          where: this.buildFilters(filters),
          orderBy: {
            fullName: 'asc',
          },
        },
      })
      return result?.data || []
    } catch (error) {
      console.error('Error fetching clients:', error)
      throw new Error('Failed to fetch clients')
    }
  }

  // Get a single client by ID
  async getClientById(id: string): Promise<Client | null> {
    try {
      const result = await electronAPI.db.query({
        model: 'client',
        operation: 'findUnique',
        args: {
          where: { id },
        },
      })
      return result?.data
    } catch (error) {
      console.error('Error fetching client:', error)
      throw new Error('Failed to fetch client')
    }
  }

  // Get client by phone number
  async getClientByPhone(phone: string): Promise<Client | null> {
    try {
      const result = await electronAPI.db.query({
        model: 'client',
        operation: 'findFirst',
        args: {
          where: { phone },
        },
      })
      return result?.data
    } catch (error) {
      console.error('Error fetching client by phone:', error)
      throw new Error('Failed to fetch client by phone')
    }
  }

  // Create a new client
  async createClient(data: CreateClientData): Promise<Client> {
    try {
      const result = await electronAPI.db.query({
        model: 'client',
        operation: 'create',
        args: {
          data: {
            fullName: data.fullName,
            phone: data.phone,
            email: data.email,
            address: data.address,
            notes: data.notes,
            balance: 0,
            loyaltyPoints: 0,
          },
        },
      })
      return result?.data
    } catch (error) {
      console.error('Error creating client:', error)
      throw new Error('Failed to create client')
    }
  }

  // Update a client
  async updateClient(id: string, data: UpdateClientData): Promise<Client> {
    try {
      // Build update data dynamically
      const updateData: any = {}
      if (data.fullName !== undefined) updateData.fullName = data.fullName
      if (data.phone !== undefined) updateData.phone = data.phone
      if (data.email !== undefined) updateData.email = data.email
      if (data.address !== undefined) updateData.address = data.address
      if (data.notes !== undefined) updateData.notes = data.notes

      const result = await electronAPI.db.query({
        model: 'client',
        operation: 'update',
        args: {
          where: { id },
          data: updateData,
        },
      })
      return result?.data
    } catch (error) {
      console.error('Error updating client:', error)
      throw new Error('Failed to update client')
    }
  }

  // Delete a client
  async deleteClient(id: string): Promise<void> {
    try {
      await electronAPI.db.query({
        model: 'client',
        operation: 'delete',
        args: {
          where: { id },
        },
      })
    } catch (error) {
      console.error('Error deleting client:', error)
      throw new Error('Failed to delete client')
    }
  }

  // Update client balance
  async updateBalance(id: string, amount: number): Promise<Client> {
    try {
      const client = await this.getClientById(id)
      if (!client) {
        throw new Error('Client not found')
      }

      const newBalance = client.balance + amount

      const result = await electronAPI.db.query({
        model: 'client',
        operation: 'update',
        args: {
          where: { id },
          data: { balance: newBalance },
        },
      })
      return result?.data
    } catch (error) {
      console.error('Error updating client balance:', error)
      throw new Error('Failed to update client balance')
    }
  }

  async addPayment(id: string, paymentData: ClientPaymentData): Promise<Client> {
    try {
      const client = await this.getClientById(id)
      if (!client) {
        throw new Error('Client not found')
      }

      const nextBalance = (client.balance || 0) + paymentData.amount

      const result = await electronAPI.db.query({
        model: 'client',
        operation: 'update',
        args: {
          where: { id },
          data: {
            balance: nextBalance,
          },
        },
      })

      return result?.data
    } catch (error) {
      console.error('Error recording client payment:', error)
      throw new Error('Failed to record client payment')
    }
  }

  // Add loyalty points
  async addLoyaltyPoints(id: string, points: number): Promise<Client> {
    try {
      const client = await this.getClientById(id)
      if (!client) {
        throw new Error('Client not found')
      }

      const newPoints = client.loyaltyPoints + points

      const result = await electronAPI.db.query({
        model: 'client',
        operation: 'update',
        args: {
          where: { id },
          data: { loyaltyPoints: newPoints },
        },
      })
      return result?.data
    } catch (error) {
      console.error('Error adding loyalty points:', error)
      throw new Error('Failed to add loyalty points')
    }
  }

  // Build Prisma where clause from filters
  private buildFilters(filters?: ClientFilters): any {
    const where: any = {}

    if (filters?.search) {
      where.OR = [
        { fullName: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ]
    }

    return where
  }
}

export const clientService = ClientService.getInstance()
