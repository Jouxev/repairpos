import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertTriangle,
  Bell,
  DollarSign,
  LogOut,
  Loader2,
  Moon,
  PackagePlus,
  Play,
  Plus,
  Receipt,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Sun,
  Power,
  User,
  Wallet,
  Wrench,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { cashRegisterService, CashRegister } from '@/services/cashRegisterService'
import OpenRegisterDialog from '@/components/cash-register/OpenRegisterDialog'
import QuickVersementDialog from '@/components/layout/QuickVersementDialog'
import backupService from '@/services/backupService'
import { useAppSettings } from '@/contexts/AppSettingsContext'

export default function Header() {
  const { user, logout } = useAuthStore()
  const { isDark, toggleTheme } = useThemeStore()
  const { t, locale } = useAppSettings()
  const navigate = useNavigate()
  const location = useLocation()
  const [openRegister, setOpenRegister] = useState<CashRegister | null>(null)
  const [isOpenRegisterDialogOpen, setIsOpenRegisterDialogOpen] = useState(false)
  const [quickVersementMode, setQuickVersementMode] = useState<'client' | 'supplier' | null>(null)
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false)
  const [isClosingApp, setIsClosingApp] = useState<'backup' | 'immediate' | null>(null)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  useEffect(() => {
    const loadOpenRegister = async () => {
      try {
        const register = await cashRegisterService.getOpenRegister()
        setOpenRegister(register)
      } catch (error) {
        console.error('Failed to fetch open register for header:', error)
      }
    }

    loadOpenRegister()
  }, [location.pathname])

  const handleCashRegisterClick = () => {
    if (openRegister?.id) {
      navigate('/cash-register')
      return
    }

    setIsOpenRegisterDialogOpen(true)
  }

  const handleExitWithBackup = async () => {
    try {
      setIsClosingApp('backup')
      await backupService.createDatabaseBackup()
      await window.electronAPI.app.close()
    } catch (error) {
      console.error('Failed to backup and close application:', error)
      toast.error(t('backupRecommended'))
      setIsClosingApp(null)
    }
  }

  const handleExitImmediately = async () => {
    try {
      setIsClosingApp('immediate')
      await window.electronAPI.app.close()
    } catch (error) {
      console.error('Failed to close application:', error)
      toast.error(t('closeApplication'))
      setIsClosingApp(null)
    }
  }

  return (
    <>
      <OpenRegisterDialog
        open={isOpenRegisterDialogOpen}
        onOpenChange={setIsOpenRegisterDialogOpen}
        onOpened={(register) => {
          setOpenRegister(register)
          toast.success('Cash register opened from quick action')
          navigate('/cash-register')
        }}
      />
      <QuickVersementDialog
        mode="client"
        open={quickVersementMode === 'client'}
        onOpenChange={(open) => setQuickVersementMode(open ? 'client' : null)}
      />
      <QuickVersementDialog
        mode="supplier"
        open={quickVersementMode === 'supplier'}
        onOpenChange={(open) => setQuickVersementMode(open ? 'supplier' : null)}
      />
      <Dialog open={isExitDialogOpen} onOpenChange={setIsExitDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="items-center text-center">
            <div className="mb-2 flex h-20 w-20 items-center justify-center rounded-3xl bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400">
              <Power className="h-9 w-9" />
            </div>
            <DialogTitle className="text-3xl font-bold tracking-tight">{t('exitApplication')}</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-5 text-sm text-muted-foreground">
                <p className="mx-auto max-w-xs text-base">{t('exitConfirmation')}</p>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left dark:border-amber-900/60 dark:bg-amber-950/20">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-amber-100 p-2 text-amber-600 dark:bg-amber-950/70 dark:text-amber-400">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{t('dataProtection')}</p>
                      <p className="mt-1 text-amber-700 dark:text-amber-300">
                        {t('backupRecommended')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Button
              className="h-auto w-full justify-start rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-left text-emerald-950 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-100 dark:hover:bg-emerald-950/40"
              variant="ghost"
              onClick={handleExitWithBackup}
              disabled={!!isClosingApp}
            >
              <div className="flex w-full items-center gap-3">
                <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
                  {isClosingApp === 'backup' ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{t('backupExit')}</p>
                  <p className="text-sm text-emerald-700/90 dark:text-emerald-300">{t('safeClosing')}</p>
                </div>
              </div>
            </Button>

            <Button
              variant="ghost"
              className="h-auto w-full justify-start rounded-2xl border border-border bg-muted/30 px-4 py-4 text-left hover:bg-muted/60"
              onClick={handleExitImmediately}
              disabled={!!isClosingApp}
            >
              <div className="flex w-full items-center gap-3">
                <div className="rounded-2xl bg-muted p-3 text-muted-foreground">
                  {isClosingApp === 'immediate' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Power className="h-5 w-5" />}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{t('exitImmediately')}</p>
                  <p className="text-sm text-muted-foreground">{t('withoutBackup')}</p>
                </div>
              </div>
            </Button>
          </div>
          <DialogFooter className="mt-2 sm:justify-center">
            <Button
              variant="ghost"
              onClick={() => setIsExitDialogOpen(false)}
              disabled={!!isClosingApp}
              className="text-muted-foreground"
            >
              {t('cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <header className="flex h-16 items-center justify-between border-b bg-card px-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {t('welcomeBack', { name: user?.fullName?.split(' ')[0] || t('user') })}
          </h2>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={openRegister?.id ? 'default' : 'outline'}
            size="icon"
            onClick={handleCashRegisterClick}
            className="relative"
            title={openRegister?.id ? t('registerOpen') : t('openRegister')}
          >
            <Wallet className="h-4 w-4" />
            <span
              className={`absolute right-1 top-1 h-2 w-2 rounded-full ${
                openRegister?.id ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
          </Button>

          <Button
            variant={location.pathname === '/pos' ? 'default' : 'outline'}
            size="sm"
            onClick={() => navigate('/pos')}
            className="gap-2"
          >
            <ShoppingCart className="h-4 w-4" />
            {t('pos')}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" title={t('quickActions')}>
                <Plus className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{t('quickActions')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/repairs/new')}>
              <Wrench className="mr-2 h-4 w-4" />
              {t('quickAddRepair')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/products/new')}>
              <PackagePlus className="mr-2 h-4 w-4" />
              {t('addProduct')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/sales/new')}>
              <Receipt className="mr-2 h-4 w-4" />
              {t('newSale')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/purchases/new')}>
              <ShoppingCart className="mr-2 h-4 w-4" />
              {t('newPurchase')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setQuickVersementMode('client')}>
              <DollarSign className="mr-2 h-4 w-4" />
              {t('clientPayment')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setQuickVersementMode('supplier')}>
              <DollarSign className="mr-2 h-4 w-4" />
              {t('supplierPayment')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCashRegisterClick}>
              <Play className="mr-2 h-4 w-4" />
              {openRegister?.id ? t('cashRegister') : t('openRegister')}
            </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {openRegister?.id && (
            <Badge variant="secondary" className="hidden sm:inline-flex">
              {t('registerOpen')}
            </Badge>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="text-muted-foreground"
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="relative text-muted-foreground"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <span className="text-sm font-medium">
                    {user?.fullName?.split(' ').map((n) => n[0]).join('').toUpperCase() || 'U'}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.fullName}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                {t('settings')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <User className="mr-2 h-4 w-4" />
                {t('profile')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                {t('logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsExitDialogOpen(true)}
            title={t('closeApplication')}
            className="ml-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            <Power className="h-4 w-4" />
          </Button>
        </div>
      </header>
    </>
  )
}
