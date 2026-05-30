export type UserRole = 'ADMIN' | 'MANAGER' | 'TECHNICIAN' | 'SELLER' | 'CASHIER'

export interface User {
  id: string
  username: string
  email: string
  fullName: string
  phone?: string
  role: UserRole
  isActive: boolean
  avatar?: string
  commissionRate: number
  balance: number
  createdAt: Date
  updatedAt: Date
}

export interface CreateUserData {
  username: string
  email: string
  password: string
  fullName: string
  phone?: string
  role: UserRole
  isActive?: boolean
  avatar?: string
  commissionRate?: number
}

export interface UpdateUserData {
  username?: string
  email?: string
  password?: string
  fullName?: string
  phone?: string
  role?: UserRole
  isActive?: boolean
  avatar?: string
  commissionRate?: number
  balance?: number
}

export interface TechnicianEarning {
  id: string
  amount: number
  type: 'COMMISSION' | 'PENALTY' | 'ADJUSTMENT'
  description?: string
  repairId?: string
  createdAt: Date
  technicianId: string
}

export interface UserFilters {
  search?: string
  role?: UserRole
  isActive?: boolean
}


const electronAPI = window.electronAPI

class UserService {
  private static instance: UserService

  private constructor() {}

  static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService()
    }
    return UserService.instance
  }

  // Hash password - now done in main process
  async hashPassword(password: string): Promise<string> {
    return electronAPI.auth.hashPassword(password)
  }

  // Verify password - now done in main process
  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return electronAPI.auth.comparePassword(password, hashedPassword)
  }

  // Create new user
  async createUser(data: CreateUserData) {
    try {
      // Check if username or email already exists
      const existingUsers = await this.getUsers()
      const existingUser = existingUsers.find(
        u => u.username === data.username || u.email === data.email
      )

      if (existingUser) {
        throw new Error('Username or email already exists')
      }

      // Hash password before sending
      const hashedPassword = await this.hashPassword(data.password)

      // Create user via IPC
      const result = await electronAPI.db.query({
        model: 'user',
        operation: 'create',
        args: {
          data: {
            username: data.username,
            email: data.email,
            password: hashedPassword,
            fullName: data.fullName,
            phone: data.phone,
            role: data.role,
            isActive: data.isActive ?? true,
            avatar: data.avatar,
            commissionRate: data.commissionRate ?? 50,
            balance: 0
          }
        }
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      return { success: true, user: result.data }
    } catch (error) {
      console.error('Error creating user:', error)
      throw error
    }
  }

  // Get all users with optional filters
  async getUsers(filters: UserFilters = {}) {
    try {
      const result = await electronAPI.db.query({
        model: 'user',
        operation: 'findMany',
        args: {
          orderBy: { createdAt: 'desc' }
        }
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      let users = result.data

      // Apply filters in memory since Prisma filters don't work via IPC
      if (filters.search) {
        const query = filters.search.toLowerCase()
        users = users.filter(
          (u: any) =>
            u.username?.toLowerCase().includes(query) ||
            u.email?.toLowerCase().includes(query) ||
            u.fullName?.toLowerCase().includes(query) ||
            u.phone?.toLowerCase().includes(query)
        )
      }

      if (filters.role) {
        users = users.filter((u: any) => u.role === filters.role)
      }

      if (filters.isActive !== undefined) {
        users = users.filter((u: any) => u.isActive === filters.isActive)
      }

      return users
    } catch (error) {
      console.error('Error fetching users:', error)
      throw error
    }
  }

  // Get user by ID
  async getUserById(id: string) {
    try {
      const result = await electronAPI.db.query({
        model: 'user',
        operation: 'findUnique',
        args: { where: { id } }
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      if (!result.data) {
        throw new Error('User not found')
      }

      return result.data
    } catch (error) {
      console.error('Error fetching user:', error)
      throw error
    }
  }

  // Update user
  async updateUser(id: string, data: UpdateUserData) {
    try {
      const updateData: any = { ...data }
      
      // Handle password update separately - hash it
      if (data.password) {
        updateData.password = await this.hashPassword(data.password)
      }

      const result = await electronAPI.db.query({
        model: 'user',
        operation: 'update',
        args: {
          where: { id },
          data: updateData
        }
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      return { success: true, user: result.data }
    } catch (error) {
      console.error('Error updating user:', error)
      throw error
    }
  }

  // Delete user
  async deleteUser(id: string) {
    try {
      const result = await electronAPI.db.query({
        model: 'user',
        operation: 'delete',
        args: { where: { id } }
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      return { success: true }
    } catch (error) {
      console.error('Error deleting user:', error)
      throw error
    }
  }

  // Toggle user active status
  async toggleUserStatus(id: string) {
    try {
      const user = await this.getUserById(id)
      const result = await electronAPI.db.query({
        model: 'user',
        operation: 'update',
        args: {
          where: { id },
          data: { isActive: !user.isActive }
        }
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      return { success: true, user: result.data }
    } catch (error) {
      console.error('Error toggling user status:', error)
      throw error
    }
  }

  // Get technician earnings
  async getTechnicianEarnings(technicianId: string): Promise<TechnicianEarning[]> {
    try {
      const result = await electronAPI.db.query({
        model: 'technicianEarning',
        operation: 'findMany',
        args: {
          where: { technicianId },
          orderBy: { createdAt: 'desc' }
        }
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      return result.data || []
    } catch (error) {
      console.error('Error fetching technician earnings:', error)
      throw error
    }
  }

  // Add earning to technician
  async addTechnicianEarning(
    technicianId: string,
    amount: number,
    type: 'COMMISSION' | 'PENALTY' | 'ADJUSTMENT',
    description?: string,
    repairId?: string
  ) {
    try {
      // Create earning record
      const earningResult = await electronAPI.db.query({
        model: 'technicianEarning',
        operation: 'create',
        args: {
          data: {
            technicianId,
            amount,
            type,
            description,
            repairId
          }
        }
      })

      if (!earningResult.success) {
        throw new Error(earningResult.error)
      }

      // Update technician balance
      const userResult = await electronAPI.db.query({
        model: 'user',
        operation: 'update',
        args: {
          where: { id: technicianId },
          data: {
            balance: {
              increment: amount
            }
          }
        }
      })

      if (!userResult.success) {
        throw new Error(userResult.error)
      }

      return { success: true, earning: earningResult.data }
    } catch (error) {
      console.error('Error adding technician earning:', error)
      throw error
    }
  }
}

export const userService = UserService.getInstance()
export default userService
