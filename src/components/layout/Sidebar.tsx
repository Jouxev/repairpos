import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  LayoutDashboard,
  ShoppingCart,
  Wrench,
  Package,
  Users,
  DollarSign,
  BarChart3,
  Settings,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Store,
  Truck,
  Building2,
  TrendingUp
} from 'lucide-react'

interface NavItem {
  titleKey:
    | 'dashboard'
    | 'pos'
    | 'repairs'
    | 'products'
    | 'clients'
    | 'sales'
    | 'purchases'
    | 'suppliers'
    | 'cashRegister'
    | 'reports'
    | 'myProfile'
    | 'settings'
  href: string
  icon: React.ElementType
  roles?: string[]
}

const navItems: NavItem[] = [
  { titleKey: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
  { titleKey: 'pos', href: '/pos', icon: ShoppingCart, roles: ['ADMIN', 'MANAGER', 'SELLER', 'CASHIER'] },
  { titleKey: 'repairs', href: '/repairs', icon: Wrench },
  { titleKey: 'products', href: '/products', icon: Package, roles: ['ADMIN', 'MANAGER', 'SELLER'] },
  { titleKey: 'clients', href: '/clients', icon: Users },
  { titleKey: 'sales', href: '/sales', icon: TrendingUp, roles: ['ADMIN', 'MANAGER', 'SELLER'] },
  { titleKey: 'purchases', href: '/purchases', icon: Truck, roles: ['ADMIN', 'MANAGER', 'SELLER'] },
  { titleKey: 'suppliers', href: '/suppliers', icon: Building2, roles: ['ADMIN', 'MANAGER', 'SELLER'] },
  { titleKey: 'cashRegister', href: '/cash-register', icon: DollarSign, roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
  { titleKey: 'reports', href: '/reports', icon: BarChart3, roles: ['ADMIN', 'MANAGER'] },
  { titleKey: 'myProfile', href: '/profile', icon: Users, roles: ['TECHNICIAN'] },
  { titleKey: 'settings', href: '/settings', icon: Settings, roles: ['ADMIN'] },
]

export default function Sidebar() {
  const { user } = useAuthStore()
  const { t } = useAppSettings()
  const location = useLocation()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const filteredNavItems = navItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  )

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed)
  }

  const toggleMobileSidebar = () => {
    setIsMobileOpen(!isMobileOpen)
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-50 lg:hidden"
        onClick={toggleMobileSidebar}
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 flex h-screen flex-col border-r bg-card transition-all duration-300 lg:static',
          isCollapsed ? 'w-16' : 'w-64',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Store className="h-5 w-5" />
            </div>
            {!isCollapsed && (
              <span className="text-lg font-bold">RepairPro</span>
            )}
          </Link>
          
          {/* Collapse Button (Desktop only) */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex"
            onClick={toggleSidebar}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="space-y-1 px-2">
            <TooltipProvider delayDuration={0}>
              {filteredNavItems.map((item) => {
                const isActive = location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)
                const Icon = item.icon

                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                      <Link
                        to={item.href}
                        onClick={() => setIsMobileOpen(false)}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                          isCollapsed && 'justify-center px-2'
                        )}
                      >
                        <Icon className="h-5 w-5 flex-shrink-0" />
                        {!isCollapsed && <span>{t(item.titleKey)}</span>}
                      </Link>
                    </TooltipTrigger>
                    {isCollapsed && (
                      <TooltipContent side="right" className="flex items-center gap-4">
                        {t(item.titleKey)}
                      </TooltipContent>
                    )}
                  </Tooltip>
                )
              })}
            </TooltipProvider>
          </nav>
        </ScrollArea>

        {/* User Profile Summary */}
        {user && !isCollapsed && (
          <div className="border-t p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <span className="text-sm font-medium">
                  {user.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.fullName}</p>
                <p className="text-xs text-muted-foreground capitalize">{user.role.toLowerCase()}</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
