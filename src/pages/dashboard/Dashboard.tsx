import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  DollarSign,
  Users,
  Wrench,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
  Loader2,
  RefreshCw,
  Receipt,
  Wallet,
  Package,
  BarChart3,
  FileText,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { dashboardService, DashboardData } from '@/services/dashboardService'
import { ReportsData, reportsService } from '@/services/reportsService'
import { toast } from '@/hooks/use-toast'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { useLocaleFormatters } from '@/hooks/useLocaleFormatters'

type DashboardPeriodPreset = '7d' | '30d' | '90d'

const periodOptions: Array<{ value: DashboardPeriodPreset; label: string }> = [
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
]

const buildPeriod = (preset: DashboardPeriodPreset) => {
  const endDate = new Date()
  const startDate = new Date()

  if (preset === '30d') {
    startDate.setDate(endDate.getDate() - 29)
  } else if (preset === '90d') {
    startDate.setDate(endDate.getDate() - 89)
  } else {
    startDate.setDate(endDate.getDate() - 6)
  }

  return { startDate, endDate }
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { t } = useAppSettings()
  const { formatCurrency } = useLocaleFormatters()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [periodPreset, setPeriodPreset] = useState<DashboardPeriodPreset>('30d')
  const [dashboardDataState, setDashboardDataState] = useState<DashboardData | null>(null)
  const [reportsData, setReportsData] = useState<ReportsData | null>(null)

  const period = useMemo(() => buildPeriod(periodPreset), [periodPreset])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) {
      return
    }

    loadDashboardData()
  }, [mounted, periodPreset])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [overviewData, analyticsData] = await Promise.all([
        dashboardService.getDashboardData(),
        reportsService.getReportsData(period),
      ])
      setDashboardDataState(overviewData)
      setReportsData(analyticsData)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load dashboard analytics and reports',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) {
    return null
  }

  const defaultDashboardData: DashboardData = {
    stats: {
      todaySales: 0,
      todaySalesChange: 0,
      activeRepairs: 0,
      pendingRepairs: 0,
      newCustomers: 0,
      newCustomersChange: 0,
      lowStockItems: 0,
    },
    salesData: [],
    repairStatusData: [],
    topProducts: [],
    recentRepairs: [],
  }

  const defaultReportsData: ReportsData = {
    period: {
      startDate: period.startDate.toISOString(),
      endDate: period.endDate.toISOString(),
    },
    overview: {
      salesRevenue: { label: 'Sales Revenue', value: 0, previousValue: 0, changePercent: 0 },
      repairRevenue: { label: 'Repair Revenue', value: 0, previousValue: 0, changePercent: 0 },
      netCollected: { label: 'Net Collected', value: 0, previousValue: 0, changePercent: 0 },
      completedRepairs: { label: 'Completed Repairs', value: 0, previousValue: 0, changePercent: 0 },
      newCustomers: { label: 'New Customers', value: 0, previousValue: 0, changePercent: 0 },
      averageSale: { label: 'Average Sale', value: 0, previousValue: 0, changePercent: 0 },
      totalClientBalance: 0,
      totalSupplierBalance: 0,
      inventoryCostValue: 0,
      inventoryRetailValue: 0,
      lowStockCount: 0,
    },
    salesTrend: [],
    paymentMethods: [],
    topProducts: [],
    recentSales: [],
    repairStatuses: [],
    recentRepairs: [],
    lowStockProducts: [],
  }

  const dashboardData = dashboardDataState || defaultDashboardData
  const analyticsData = reportsData || defaultReportsData
  const { stats, salesData, repairStatusData, topProducts, recentRepairs } = dashboardData

  const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '0.75rem',
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            {t('manageApplicationSettings') === 'Manage your application settings'
              ? 'Overview, analytics, and live report summaries for your business.'
              : t('overview')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={periodPreset} onValueChange={(value) => setPeriodPreset(value as DashboardPeriodPreset)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Period" />
              <SelectValue placeholder={t('period')} />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadDashboardData} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {t('refresh')}
          </Button>
          <Button variant="outline" onClick={() => navigate('/reports')}>
            <FileText className="mr-2 h-4 w-4" />
            {t('fullReports')}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('todaySales')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.todaySales)}</div>
            <p className="text-xs text-muted-foreground">
              <span className={`flex items-center ${stats.todaySalesChange >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {stats.todaySalesChange >= 0 ? (
                  <TrendingUp className="mr-1 h-3 w-3" />
                ) : (
                  <TrendingDown className="mr-1 h-3 w-3" />
                )}
                {stats.todaySalesChange >= 0 ? '+' : ''}
                {stats.todaySalesChange}%
              </span>{' '}
              {t('fromYesterday')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('activeRepairs')}</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeRepairs}</div>
            <p className="text-xs text-muted-foreground">
              <span className="flex items-center text-amber-500">
                <Clock className="mr-1 h-3 w-3" />
                {stats.pendingRepairs} {t('pending')}
              </span>{' '}
              {t('diagnosis')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('newCustomers')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.newCustomers}</div>
            <p className="text-xs text-muted-foreground">
              <span className={`flex items-center ${stats.newCustomersChange >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {stats.newCustomersChange >= 0 ? (
                  <TrendingUp className="mr-1 h-3 w-3" />
                ) : (
                  <TrendingDown className="mr-1 h-3 w-3" />
                )}
                {stats.newCustomersChange >= 0 ? '+' : ''}
                {stats.newCustomersChange}%
              </span>{' '}
              {t('fromLastWeek')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('lowStockItems')}</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.lowStockItems}</div>
            <p className="text-xs text-muted-foreground">
              <span className="flex items-center text-destructive">
                <TrendingUp className="mr-1 h-3 w-3" />
                {t('restockNeeded')}
              </span>{' '}
              {t('urgent')}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">{t('overview')}</TabsTrigger>
          <TabsTrigger value="analytics">{t('analytics')}</TabsTrigger>
          <TabsTrigger value="reports">{t('reports')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle>{t('salesRepairsOverview')}</CardTitle>
                <CardDescription>{t('dailySalesRepairRevenuePastWeek')}</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                {salesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={salesData}>
                      <defs>
                        <linearGradient id="overviewSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="overviewRepairs" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Area type="monotone" dataKey="sales" stroke="#3b82f6" fillOpacity={1} fill="url(#overviewSales)" name="Sales" />
                      <Area type="monotone" dataKey="repairs" stroke="#10b981" fillOpacity={1} fill="url(#overviewRepairs)" name="Repairs" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                    {t('noSalesDataAvailable')}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>{t('repairStatus')}</CardTitle>
                <CardDescription>{t('currentDistributionRepairStatuses')}</CardDescription>
              </CardHeader>
              <CardContent>
                {repairStatusData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={repairStatusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {repairStatusData.map((entry, index) => (
                            <Cell key={`repair-status-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {repairStatusData.map((status) => (
                        <div key={status.name} className="flex items-center gap-2 text-sm">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: status.color }} />
                          <span className="text-muted-foreground">{status.name}:</span>
                          <span className="font-medium">{status.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex h-[250px] items-center justify-center text-muted-foreground">
                    {t('noRepairDataAvailable')}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('recentRepairs')}</CardTitle>
                <CardDescription>{t('latestRepairTicketsAndStatus')}</CardDescription>
              </CardHeader>
              <CardContent>
                {recentRepairs.length > 0 ? (
                  <div className="space-y-4">
                    {recentRepairs.map((repair) => (
                      <div key={repair.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-3">
                          <div className={`h-2 w-2 rounded-full ${
                            repair.status === 'Completed' || repair.status === 'FINISHED'
                              ? 'bg-green-500'
                              : repair.status === 'In Progress' || repair.status === 'IN_PROGRESS'
                                ? 'bg-blue-500'
                                : 'bg-amber-500'
                          }`} />
                          <div>
                            <p className="text-sm font-medium">{repair.id}</p>
                            <p className="text-xs text-muted-foreground">{repair.customer} • {repair.device}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{formatCurrency(repair.amount)}</p>
                          <p className="text-xs text-muted-foreground">{repair.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                    {t('noRecentRepairs')}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('topProducts')}</CardTitle>
                <CardDescription>{t('bestSellingProductsThisMonth')}</CardDescription>
              </CardHeader>
              <CardContent>
                {topProducts.length > 0 ? (
                  <div className="space-y-4">
                    {topProducts.map((product, index) => (
                      <div key={product.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{product.name}</p>
                            <p className="text-xs text-muted-foreground">{product.sales} {t('sold')}</p>
                          </div>
                        </div>
                        <p className="text-sm font-medium">{formatCurrency(product.revenue)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                    {t('noSalesDataAvailable')}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { title: t('salesRevenue'), icon: DollarSign, value: analyticsData.overview.salesRevenue.value, change: analyticsData.overview.salesRevenue.changePercent, currency: true },
              { title: t('repairRevenue'), icon: Wrench, value: analyticsData.overview.repairRevenue.value, change: analyticsData.overview.repairRevenue.changePercent, currency: true },
              { title: t('netCollected'), icon: Receipt, value: analyticsData.overview.netCollected.value, change: analyticsData.overview.netCollected.changePercent, currency: true },
              { title: t('averageSale'), icon: BarChart3, value: analyticsData.overview.averageSale.value, change: analyticsData.overview.averageSale.changePercent, currency: true },
              { title: t('totalClientBalance'), icon: Users, value: analyticsData.overview.totalClientBalance, change: null, currency: true },
              { title: t('totalSupplierBalance'), icon: Wallet, value: analyticsData.overview.totalSupplierBalance, change: null, currency: true },
              { title: t('inventoryCost'), icon: Package, value: analyticsData.overview.inventoryCostValue, change: null, currency: true },
              { title: t('inventoryRetail'), icon: Package, value: analyticsData.overview.inventoryRetailValue, change: null, currency: true },
            ].map((item) => (
              <Card key={item.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {item.currency ? formatCurrency(item.value) : item.value.toLocaleString()}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {item.change === null ? (
                      t('currentStoredTotal')
                    ) : (
                      <span className={`flex items-center ${item.change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {item.change >= 0 ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
                        {item.change >= 0 ? '+' : ''}
                        {item.change}% {t('vsPreviousPeriod')}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.7fr_1.1fr]">
            <Card>
              <CardHeader>
                <CardTitle>{t('revenueTrend')}</CardTitle>
                <CardDescription>{t('selectedPeriodRevenue')}</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                {analyticsData.salesTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={analyticsData.salesTrend}>
                      <defs>
                        <linearGradient id="analyticsSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.03} />
                        </linearGradient>
                        <linearGradient id="analyticsRepairs" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.03} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="label" />
                      <YAxis />
                      <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => formatCurrency(value)} />
                      <Area type="monotone" dataKey="sales" stroke="#3b82f6" fill="url(#analyticsSales)" name="Sales" />
                      <Area type="monotone" dataKey="repairs" stroke="#10b981" fill="url(#analyticsRepairs)" name="Repairs" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[320px] items-center justify-center text-muted-foreground">
                    {t('noAnalyticsDataAvailable')}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('paymentMethods')}</CardTitle>
                <CardDescription>{t('collectedPaymentMix')}</CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsData.paymentMethods.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={analyticsData.paymentMethods}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="method" />
                      <YAxis />
                      <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="amount" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[320px] items-center justify-center text-muted-foreground">
                    {t('noPaymentAnalyticsAvailable')}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <Card>
              <CardHeader>
                <CardTitle>{t('topProducts')}</CardTitle>
                <CardDescription>{t('bestPerformingProductsSelectedPeriod')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {analyticsData.topProducts.length > 0 ? (
                  analyticsData.topProducts.map((product, index) => (
                    <div key={product.id} className="flex items-center justify-between rounded-2xl border p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">{product.sku} • {product.quantitySold} sold</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(product.revenue)}</p>
                        <p className="text-xs text-muted-foreground">{t('revenue')}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex h-[220px] items-center justify-center rounded-2xl border border-dashed text-muted-foreground">
                    {t('noProductReportDataAvailable')}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('recentSales')}</CardTitle>
                <CardDescription>{t('latestSalesSelectedPeriod')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {analyticsData.recentSales.length > 0 ? (
                  analyticsData.recentSales.map((sale) => (
                    <div key={sale.id} className="rounded-2xl border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{sale.invoiceNumber}</p>
                          <p className="text-sm text-muted-foreground">{sale.customerName}</p>
                        </div>
                        <Badge variant={sale.dueAmount > 0 ? 'secondary' : 'default'}>
                          {sale.paymentStatus}
                        </Badge>
                      </div>
                      <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
                        <div>
                          <p className="text-muted-foreground">{t('total')}</p>
                          <p className="font-semibold">{formatCurrency(sale.total)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t('collected')}</p>
                          <p className="font-semibold">{formatCurrency(sale.paidAmount)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t('due')}</p>
                          <p className={`font-semibold ${sale.dueAmount > 0 ? 'text-destructive' : 'text-green-600'}`}>
                            {formatCurrency(sale.dueAmount)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex h-[220px] items-center justify-center rounded-2xl border border-dashed text-muted-foreground">
                    {t('noSalesFoundForPeriod')}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>{t('recentRepairs')}</CardTitle>
                <CardDescription>{t('latestRepairTicketsRevenueProfit')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {analyticsData.recentRepairs.length > 0 ? (
                  analyticsData.recentRepairs.map((repair) => (
                    <div key={repair.id} className="rounded-2xl border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{repair.ticketNumber}</p>
                          <p className="text-sm text-muted-foreground">{repair.customerName} • {repair.device}</p>
                        </div>
                        <Badge variant="outline">{repair.status}</Badge>
                      </div>
                      <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                        <div>
                          <p className="text-muted-foreground">{t('repairRevenueShort')}</p>
                          <p className="font-semibold">{formatCurrency(repair.repairCost)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t('estimatedProfit')}</p>
                          <p className={`font-semibold ${repair.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {formatCurrency(repair.profit)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex h-[220px] items-center justify-center rounded-2xl border border-dashed text-muted-foreground">
                    {t('noRepairsFoundForPeriod')}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('lowStockReport')}</CardTitle>
                <CardDescription>{t('productsNeedReplenishment')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {analyticsData.lowStockProducts.length > 0 ? (
                  analyticsData.lowStockProducts.slice(0, 8).map((product) => (
                    <div key={product.id} className="flex items-center justify-between rounded-2xl border p-4">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{product.sku} • {product.categoryName}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{product.quantity}</p>
                        <p className="text-xs text-amber-600">{t('alertAt')} {product.minStockAlert}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex h-[220px] items-center justify-center rounded-2xl border border-dashed text-muted-foreground">
                    {t('noLowStockItemsFound')}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
