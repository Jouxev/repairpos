import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: string
  username: string
  email: string
  fullName: string
  phone?: string
  role: 'ADMIN' | 'MANAGER' | 'TECHNICIAN' | 'SELLER' | 'CASHIER'
  isActive: boolean
  avatar?: string
  createdAt: string
  lastLoginAt?: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Actions
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  initialize: () => Promise<void>
  updateUser: (user: Partial<User>) => void
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (username: string, password: string) => {
        set({ isLoading: true, error: null })
        
        try {
          const result = await window.electronAPI.db.query({
            model: 'user',
            operation: 'findUnique',
            args: {
              where: { username }
            }
          })

          if (!result.success || !result.data) {
            set({ error: 'Invalid username or password', isLoading: false })
            return false
          }

          const user = result.data
          const isValidPassword = await window.electronAPI.auth.comparePassword(password, user.password)

          if (!isValidPassword) {
            set({ error: 'Invalid username or password', isLoading: false })
            return false
          }

          // Update last login
          await window.electronAPI.db.query({
            model: 'user',
            operation: 'update',
            args: {
              where: { id: user.id },
              data: { lastLoginAt: new Date().toISOString() }
            }
          })

          const { password: _, ...userWithoutPassword } = user

          set({
            user: userWithoutPassword as User,
            isAuthenticated: true,
            isLoading: false,
            error: null
          })

          return true
        } catch (error) {
          set({ error: 'Login failed. Please try again.', isLoading: false })
          return false
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null
        })
      },

      initialize: async () => {
        // Check if we have persisted auth state
        const state = get()
        if (state.user) {
          // Verify user still exists in database
          try {
            const result = await window.electronAPI.db.query({
              model: 'user',
              operation: 'findUnique',
              args: {
                where: { id: state.user.id }
              }
            })

            if (!result.success || !result.data) {
              // User no longer exists, clear auth state
              set({
                user: null,
                token: null,
                isAuthenticated: false
              })
            }
          } catch (error) {
            console.error('Error verifying auth state:', error)
          }
        }
        set({ isLoading: false })
      },

      updateUser: (userData: Partial<User>) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null
        }))
      },

      clearError: () => {
        set({ error: null })
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)
