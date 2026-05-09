import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ThemeState {
  theme: 'light' | 'dark' | 'system'
  isDark: boolean
  
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  toggleTheme: () => void
  initializeTheme: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      isDark: false,

      setTheme: (theme) => {
        const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
        
        set({ theme, isDark })
        
        // Apply theme to document
        const root = window.document.documentElement
        root.classList.remove('light', 'dark')
        root.classList.add(isDark ? 'dark' : 'light')
      },

      toggleTheme: () => {
        const { theme, setTheme } = get()
        const newTheme = theme === 'light' ? 'dark' : 'light'
        setTheme(newTheme)
      },

      initializeTheme: () => {
        const { theme, setTheme } = get()
        setTheme(theme)

        // Listen for system theme changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
        mediaQuery.addEventListener('change', () => {
          if (get().theme === 'system') {
            setTheme('system')
          }
        })
      }
    }),
    {
      name: 'theme-storage',
      partialize: (state) => ({ theme: state.theme })
    }
  )
)
