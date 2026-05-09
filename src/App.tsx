import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { Toaster } from '@/components/ui/toaster'

// Layouts
import MainLayout from '@/components/layout/MainLayout'
import AuthLayout from '@/components/layout/AuthLayout'

// Auth Pages
import Login from '@/pages/auth/Login'

// Dashboard
import Dashboard from '@/pages/dashboard/Dashboard'

// POS
import POS from '@/pages/pos/POS'

// Repairs
import RepairsList from '@/pages/repairs/RepairsList'
import RepairDetail from '@/pages/repairs/RepairDetail'
import NewRepair from '@/pages/repairs/NewRepair'

// Products
import ProductsList from '@/pages/products/ProductsList'
import ProductDetail from '@/pages/products/ProductDetail'

// Clients
import ClientsList from '@/pages/clients/ClientsList'
import ClientDetail from '@/pages/clients/ClientDetail'

// Cash Register
import CashRegister from '@/pages/cash-register/CashRegister'

// Reports
import Reports from '@/pages/reports/Reports'

// Settings
import Settings from '@/pages/settings/Settings'

// Protected Route Component
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

function App() {
  const { initialize, isLoading } = useAuthStore()
  const { initializeTheme } = useThemeStore()

  useEffect(() => {
    initialize()
    initializeTheme()
  }, [])

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">Loading RepairPro...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Routes>
        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
        </Route>

        {/* Protected Routes */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />

          {/* POS */}
          <Route path="/pos" element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'SELLER', 'CASHIER']}>
              <POS />
            </ProtectedRoute>
          } />

          {/* Repairs */}
          <Route path="/repairs" element={
            <ProtectedRoute>
              <RepairsList />
            </ProtectedRoute>
          } />
          <Route path="/repairs/new" element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'TECHNICIAN', 'SELLER']}>
              <NewRepair />
            </ProtectedRoute>
          } />
          <Route path="/repairs/:id" element={
            <ProtectedRoute>
              <RepairDetail />
            </ProtectedRoute>
          } />

          {/* Products */}
          <Route path="/products" element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'SELLER']}>
              <ProductsList />
            </ProtectedRoute>
          } />
          <Route path="/products/:id" element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <ProductDetail />
            </ProtectedRoute>
          } />

          {/* Clients */}
          <Route path="/clients" element={
            <ProtectedRoute>
              <ClientsList />
            </ProtectedRoute>
          } />
          <Route path="/clients/:id" element={
            <ProtectedRoute>
              <ClientDetail />
            </ProtectedRoute>
          } />

          {/* Cash Register */}
          <Route path="/cash-register" element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'CASHIER']}>
              <CashRegister />
            </ProtectedRoute>
          } />

          {/* Reports */}
          <Route path="/reports" element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <Reports />
            </ProtectedRoute>
          } />

          {/* Settings */}
          <Route path="/settings" element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Settings />
            </ProtectedRoute>
          } />
        </Route>
      </Routes>
      <Toaster />
    </>
  )
}

export default App
