import { useCallback, useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as SonnerToaster } from 'sonner'

// Layouts
import MainLayout from '@/components/layout/MainLayout'
import AuthLayout from '@/components/layout/AuthLayout'

// Auth Pages
import Login from '@/pages/auth/Login'
import Onboarding from '@/pages/auth/Onboarding'

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
import NewProduct from '@/pages/products/NewProduct'
import ProductLabels from '@/pages/products/ProductLabels'

// Clients
import ClientsList from '@/pages/clients/ClientsList'
import ClientDetail from '@/pages/clients/ClientDetail'
import NewClient from '@/pages/clients/NewClient'

// Cash Register
import CashRegister from '@/pages/cash-register/CashRegister'

// Reports
import Reports from '@/pages/reports/Reports'

// Settings
import Settings from '@/pages/settings/Settings'

// Suppliers
import SuppliersList from '@/pages/suppliers/SuppliersList'

// Purchases
import PurchasesList from '@/pages/purchases/PurchasesList'
import NewPurchase from '@/pages/purchases/NewPurchase'

// Sales
import SalesList from '@/pages/sales/SalesList'
import NewSale from '@/pages/sales/NewSale'

// Technician Profile
import TechnicianProfilePage from '@/pages/technician/TechnicianProfilePage'
import { appSetupService } from '@/services/appSetupService'
import { useAppSettings } from '@/contexts/AppSettingsContext'

// Protected Route Component
function ProtectedRoute({
  children,
  allowedRoles,
  needsOnboarding,
}: {
  children: React.ReactNode
  allowedRoles?: string[]
  needsOnboarding: boolean
}) {
  const { user, isAuthenticated } = useAuthStore()

  if (needsOnboarding) {
    return <Navigate to="/onboarding" replace />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

function App() {
  const { initialize, isLoading, isAuthenticated } = useAuthStore()
  const { initializeTheme } = useThemeStore()
  const { t } = useAppSettings()
  const [isSetupLoading, setIsSetupLoading] = useState(true)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)

  const refreshSetupStatus = useCallback(async () => {
    try {
      setIsSetupLoading(true)
      const status = await appSetupService.getStatus()
      setNeedsOnboarding(status.needsOnboarding)
    } catch (error) {
      console.error('Failed to load setup status:', error)
      setNeedsOnboarding(true)
    } finally {
      setIsSetupLoading(false)
    }
  }, [])

  useEffect(() => {
    const bootstrap = async () => {
      initializeTheme()
      await initialize()
      await refreshSetupStatus()
    }

    void bootstrap()
  }, [initialize, initializeTheme, refreshSetupStatus])

  if (isLoading || isSetupLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">{t('loadingRepairPro')}</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Routes>
        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route
            path="/login"
            element={
              needsOnboarding ? (
                <Navigate to="/onboarding" replace />
              ) : isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Login />
              )
            }
          />
          <Route
            path="/onboarding"
            element={
              needsOnboarding ? (
                <Onboarding onCompleted={refreshSetupStatus} />
              ) : (
                <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />
              )
            }
          />
        </Route>

        {/* Protected Routes */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          <Route path="/dashboard" element={
            <ProtectedRoute needsOnboarding={needsOnboarding}>
              <Dashboard />
            </ProtectedRoute>
          } />

          {/* POS */}
          <Route path="/pos" element={
            <ProtectedRoute needsOnboarding={needsOnboarding} allowedRoles={['ADMIN', 'MANAGER', 'SELLER', 'CASHIER']}>
              <POS />
            </ProtectedRoute>
          } />

          {/* Repairs */}
          <Route path="/repairs" element={
            <ProtectedRoute needsOnboarding={needsOnboarding}>
              <RepairsList />
            </ProtectedRoute>
          } />
          <Route path="/repairs/new" element={
            <ProtectedRoute needsOnboarding={needsOnboarding} allowedRoles={['ADMIN', 'MANAGER', 'TECHNICIAN', 'SELLER']}>
              <NewRepair />
            </ProtectedRoute>
          } />
          <Route path="/repairs/:id" element={
            <ProtectedRoute needsOnboarding={needsOnboarding}>
              <RepairDetail />
            </ProtectedRoute>
          } />

          {/* Products */}
          <Route path="/products" element={
            <ProtectedRoute needsOnboarding={needsOnboarding} allowedRoles={['ADMIN', 'MANAGER', 'SELLER']}>
              <ProductsList />
            </ProtectedRoute>
          } />
          <Route path="/products/new" element={
            <ProtectedRoute needsOnboarding={needsOnboarding} allowedRoles={['ADMIN', 'MANAGER']}>
              <NewProduct />
            </ProtectedRoute>
          } />
          <Route path="/products/labels" element={
            <ProtectedRoute needsOnboarding={needsOnboarding} allowedRoles={['ADMIN', 'MANAGER', 'SELLER']}>
              <ProductLabels />
            </ProtectedRoute>
          } />
          <Route path="/products/:id" element={
            <ProtectedRoute needsOnboarding={needsOnboarding} allowedRoles={['ADMIN', 'MANAGER']}>
              <ProductDetail />
            </ProtectedRoute>
          } />
          <Route path="/products/:id/edit" element={
            <ProtectedRoute needsOnboarding={needsOnboarding} allowedRoles={['ADMIN', 'MANAGER']}>
              <NewProduct />
            </ProtectedRoute>
          } />

          {/* Clients */}
          <Route path="/clients" element={
            <ProtectedRoute needsOnboarding={needsOnboarding}>
              <ClientsList />
            </ProtectedRoute>
          } />
          <Route path="/clients/new" element={
            <ProtectedRoute needsOnboarding={needsOnboarding}>
              <NewClient />
            </ProtectedRoute>
          } />
          <Route path="/clients/:id" element={
            <ProtectedRoute needsOnboarding={needsOnboarding}>
              <ClientDetail />
            </ProtectedRoute>
          } />
          <Route path="/clients/:id/edit" element={
            <ProtectedRoute needsOnboarding={needsOnboarding}>
              <NewClient />
            </ProtectedRoute>
          } />

          {/* Cash Register */}
          <Route path="/cash-register" element={
            <ProtectedRoute needsOnboarding={needsOnboarding} allowedRoles={['ADMIN', 'MANAGER', 'CASHIER']}>
              <CashRegister />
            </ProtectedRoute>
          } />

          {/* Suppliers */}
          <Route path="/suppliers" element={
            <ProtectedRoute needsOnboarding={needsOnboarding} allowedRoles={['ADMIN', 'MANAGER', 'SELLER']}>
              <SuppliersList />
            </ProtectedRoute>
          } />

          {/* Purchases */}
          <Route path="/purchases" element={
            <ProtectedRoute needsOnboarding={needsOnboarding} allowedRoles={['ADMIN', 'MANAGER', 'SELLER']}>
              <PurchasesList />
            </ProtectedRoute>
          } />
          <Route path="/purchases/new" element={
            <ProtectedRoute needsOnboarding={needsOnboarding} allowedRoles={['ADMIN', 'MANAGER']}>
              <NewPurchase />
            </ProtectedRoute>
          } />
          <Route path="/purchases/edit/:id" element={
            <ProtectedRoute needsOnboarding={needsOnboarding} allowedRoles={['ADMIN', 'MANAGER']}>
              <NewPurchase />
            </ProtectedRoute>
          } />

          {/* Sales */}
          <Route path="/sales" element={
            <ProtectedRoute needsOnboarding={needsOnboarding} allowedRoles={['ADMIN', 'MANAGER', 'SELLER']}>
              <SalesList />
            </ProtectedRoute>
          } />
          <Route path="/sales/new" element={
            <ProtectedRoute needsOnboarding={needsOnboarding} allowedRoles={['ADMIN', 'MANAGER', 'SELLER']}>
              <NewSale />
            </ProtectedRoute>
          } />
          <Route path="/sales/edit/:id" element={
            <ProtectedRoute needsOnboarding={needsOnboarding} allowedRoles={['ADMIN', 'MANAGER', 'SELLER']}>
              <NewSale />
            </ProtectedRoute>
          } />

          {/* Profile */}
          <Route path="/profile" element={
            <ProtectedRoute needsOnboarding={needsOnboarding}>
              <TechnicianProfilePage />
            </ProtectedRoute>
          } />

          {/* Reports */}
          <Route path="/reports" element={
            <ProtectedRoute needsOnboarding={needsOnboarding} allowedRoles={['ADMIN', 'MANAGER']}>
              <Reports />
            </ProtectedRoute>
          } />

          {/* Settings */}
          <Route path="/settings" element={
            <ProtectedRoute needsOnboarding={needsOnboarding} allowedRoles={['ADMIN']}>
              <Settings />
            </ProtectedRoute>
          } />
        </Route>
      </Routes>
      <Toaster />
      <SonnerToaster position="top-center" richColors closeButton />
    </>
  )
}

export default App
