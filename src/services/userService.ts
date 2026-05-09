export type UserRole = 'ADMIN' | 'MANAGER' | 'TECHNICIAN' | 'SELLER' | 'CASHIER'

export interface CreateUserData {
  username: string
  email: string
  password: string
  fullName: string
  phone?: string
  role: UserRole
  isActive?: boolean
  avatar?: string
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
}

export interface UserFilters {
  search?: string
  role?: UserRole
  isActive?: boolean
}

// IPC bridge to main process
const ipcRenderer = window.require('electron').ipcRenderer

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
    return ipcRenderer.invoke('auth:hashPassword', password)
  }

  // Verify password - now done in main process
  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return ipcRenderer.invoke('auth:comparePassword', password, hashedPassword)
  }

  // Create new user
  async createUser(data: CreateUserData) {
    try {
      // Create user via IPC - the main process will hash the password
      const result = await ipcRenderer.invoke('user:create', data)

      if (!result.success) {
        throw new Error(result.error)
      }

      return { success: true, user: result.user }
    } catch (error) {
      console.error('Error creating user:', error)
      throw error
    }
  }

  // Get all users with optional filters
  async getUsers(filters: UserFilters = {}) {
    try {
      const result = await ipcRenderer.invoke('db:query', {
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
      const result = await ipcRenderer.invoke('db:query', {
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
      const result = await ipcRenderer.invoke('user:update', { id, data })

      if (!result.success) {
        throw new Error(result.error)
      }

      return { success: true, user: result.user }
    } catch (error) {
      console.error('Error updating user:', error)
      throw error
    }
  }

  // Delete user
  async deleteUser(id: string) {
    try {
      const result = await ipcRenderer.invoke('user:delete', { id })

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
      const result = await ipcRenderer.invoke('db:query', {
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
}

export const userService = UserService.getInstance()
export default userService
