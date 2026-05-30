import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { ReportsData, reportsService } from '@/services/reportsService'
import { ExportEntity, ExportFormat, dataExportService } from '@/services/dataExportService'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  Download,
  Loader2,
  Package,
  RefreshCcw,
  Receipt,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { useLocaleFormatters } from '@/hooks/useLocaleFormatters'

type PeriodPreset = '7d' | '30d' | '90d' | 'month' | 'custom'

const periodOptions: Array<{ value: PeriodPreset; label: string }> = [
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: 'month', label: 'This Month' },
  { value: 'custom', label: 'Custom Range' },
]

const entityExportOptions: Array<{ value: ExportEntity; label: string; description: string }> = [
  { value: 'repairs', label: 'Repairs', description: 'Repair tickets and repair financial data' },
  { value: 'products', label: 'Products', description: 'Inventory items, prices, and stock levels' },
  { value: 'clients', label: 'Clients', description: 'Customers with balances and contact info' },
  { value: 'providers', label: 'Providers', description: 'Suppliers with balances and purchases' },
  { value: 'sales', label: 'Sales', description: 'Invoices, collections, and payment status' },
  { value: 'purchases', label: 'Purchases', description: 'Purchase orders and supplier payments' },
  { value: 'cash_register', label: 'Cash Register', description: 'Open and closed cash register sessions' },
]

const formatDateInput = (date: Date) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

const buildPeriod = (preset: PeriodPreset, customStart: string, customEnd: string) => {
  const today = new Date()
  const endDate = new Date()
  let startDate = new Date()

  switch (preset) {
    case '30d':
      startDate.setDate(today.getDate() - 29)
      break
    case '90d':
      startDate.setDate(today.getDate() - 89)
      break
    case 'month':
      startDate = new Date(today.getFullYear(), today.getMonth(), 1)
      break
    case 'custom':
      startDate = customStart ? new Date(customStart) : new Date(today.getFullYear(), today.getMonth(), 1)
      return {
        startDate,
        endDate: customEnd ? new Date(customEnd) : endDate,
      }
    case '7d':
    default:
      startDate.setDate(today.getDate() - 6)
      break
  }

  return { startDate, endDate }
}

const downloadTextFile = (filename: string, content: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

const escapeCsv = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`

export default function Reports() {
  const { t } = useAppSettings()
  const { formatCurrency, formatDate, formatDateTime } = useLocaleFormatters()
  const [isLoading, setIsLoading] = useState(true)
  const [isExportingEntity, setIsExportingEntity] = useState<ExportFormat | null>(null)
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('30d')
  const [customStartDate, setCustomStartDate] = useState(formatDateInput(new Date(new Date().setDate(new Date().getDate() - 29))))
  const [customEndDate, setCustomEndDate] = useState(formatDateInput(new Date()))
  const [reportsData, setReportsData] = useState<ReportsData | null>(null)
  const [exportEntity, setExportEntity] = useState<ExportEntity>('sales')

  const period = useMemo(
    () => buildPeriod(periodPreset, customStartDate, customEndDate),
    [periodPreset, customStartDate, customEndDate],
  )

  const loadReports = async () => {
    try {
      setIsLoading(true)
      const data = await reportsService.getReportsData(period)
      setReportsData(data)
    } catch (error) {
      console.error('Failed to load reports:', error)
      toast.error('Failed to load reports')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadReports()
  }, [periodPreset, customStartDate, customEndDate])

  const periodLabel = useMemo(() => {
    const start = formatDate(period.startDate)
    const end = formatDate(period.endDate)
    return `${start} - ${end}`
  }, [formatDate, period])

  const exportJson = () => {
    if (!reportsData) {
      return
    }

    downloadTextFile(
      `reports-${formatDateInput(period.startDate)}-${formatDateInput(period.endDate)}.json`,
      JSON.stringify(reportsData, null, 2),
      'application/json;charset=utf-8',
    )
    toast.success('JSON report exported')
  }

  const exportCsv = () => {
    if (!reportsData) {
      return
    }

    const lines: string[] = []
    lines.push('Section,Label,Value,Extra')
    lines.push(`Overview,Sales Revenue,${reportsData.overview.salesRevenue.value},${reportsData.overview.salesRevenue.changePercent}%`)
    lines.push(`Overview,Repair Revenue,${reportsData.overview.repairRevenue.value},${reportsData.overview.repairRevenue.changePercent}%`)
    lines.push(`Overview,Net Collected,${reportsData.overview.netCollected.value},${reportsData.overview.netCollected.changePercent}%`)
    lines.push(`Overview,Completed Repairs,${reportsData.overview.completedRepairs.value},${reportsData.overview.completedRepairs.changePercent}%`)
    lines.push(`Overview,New Customers,${reportsData.overview.newCustomers.value},${reportsData.overview.newCustomers.changePercent}%`)
    lines.push(`Overview,Average Sale,${reportsData.overview.averageSale.value},${reportsData.overview.averageSale.changePercent}%`)
    lines.push(`Overview,Total Client Balance,${reportsData.overview.totalClientBalance},-`)
    lines.push(`Overview,Total Supplier Balance,${reportsData.overview.totalSupplierBalance},-`)

    reportsData.topProducts.forEach((product) => {
      lines.push(
        [
          'Top Products',
          escapeCsv(product.name),
          product.revenue,
          escapeCsv(`Qty ${product.quantitySold} | ${product.sku}`),
        ].join(','),
      )
    })

    reportsData.recentSales.forEach((sale) => {
      lines.push(
        [
          'Recent Sales',
          escapeCsv(sale.invoiceNumber),
          sale.total,
          escapeCsv(`${sale.customerName} | ${sale.paymentStatus}`),
        ].join(','),
      )
    })

    reportsData.recentRepairs.forEach((repair) => {
      lines.push(
        [
          'Recent Repairs',
          escapeCsv(repair.ticketNumber),
          repair.repairCost,
          escapeCsv(`${repair.customerName} | ${repair.status}`),
        ].join(','),
      )
    })

    reportsData.lowStockProducts.forEach((product) => {
      lines.push(
        [
          'Low Stock',
          escapeCsv(product.name),
          product.quantity,
          escapeCsv(`Alert ${product.minStockAlert} | ${product.categoryName}`),
        ].join(','),
      )
    })

    downloadTextFile(
      `reports-${formatDateInput(period.startDate)}-${formatDateInput(period.endDate)}.csv`,
      lines.join('\n'),
      'text/csv;charset=utf-8',
    )
    toast.success('CSV report exported')
  }

  const handleEntityExport = async (format: ExportFormat) => {
    try {
      setIsExportingEntity(format)
      await dataExportService.exportEntity(exportEntity, format, period)
      toast.success(`${entityExportOptions.find((option) => option.value === exportEntity)?.label || 'Entity'} exported as ${format.toUpperCase()}`)
    } catch (error) {
      console.error('Failed to export entity data:', error)
      toast.error('Failed to export entity data')
    } finally {
      setIsExportingEntity(null)
    }
  }

  const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '0.75rem',
  }

  const trendMetrics = reportsData?.overview

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('reports')}</h1>
          <p className="text-muted-foreground">Track sales, repairs, payments, and inventory performance with live business reporting.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="px-3 py-1">{periodLabel}</Badge>
          <Button variant="outline" onClick={loadReports} disabled={isLoading}>
            <RefreshCcw className={cn('mr-2 h-4 w-4', isLoading && 'animate-spin')} />
            {t('refresh')}
          </Button>
          <Button variant="outline" onClick={exportCsv} disabled={!reportsData}>
            <Download className="mr-2 h-4 w-4" />
            {t('exportCsv')}
          </Button>
          <Button onClick={exportJson} disabled={!reportsData}>
            <Download className="mr-2 h-4 w-4" />
            {t('exportJson')}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>{t('reportFilters')}</CardTitle>
          <CardDescription>{t('selectReportingPeriod')}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[220px_1fr_auto]">
          <div className="space-y-2">
            <Label>{t('period')}</Label>
            <Select value={periodPreset} onValueChange={(value) => setPeriodPreset(value as PeriodPreset)}>
              <SelectTrigger>
                <SelectValue placeholder={t('choosePeriod')} />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {periodPreset === 'custom' ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('startDate')}</Label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="date" value={customStartDate} onChange={(event) => setCustomStartDate(event.target.value)} className="pl-10" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('endDate')}</Label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="date" value={customEndDate} onChange={(event) => setCustomEndDate(event.target.value)} className="pl-10" />
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              {t('reportsRefreshAutomatically')}
            </div>
          )}

          <div className="flex items-end">
            <Button variant="outline" onClick={loadReports} disabled={isLoading} className="w-full lg:w-auto">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BarChart3 className="mr-2 h-4 w-4" />}
              {t('reload')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>{t('entityExports')}</CardTitle>
          <CardDescription>{t('entityExportsDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 xl:grid-cols-[260px_1fr]">
          <div className="space-y-2">
            <Label>{t('entity')}</Label>
            <Select value={exportEntity} onValueChange={(value) => setExportEntity(value as ExportEntity)}>
              <SelectTrigger>
                <SelectValue placeholder={t('chooseEntity')} />
              </SelectTrigger>
              <SelectContent>
                {entityExportOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {entityExportOptions.find((option) => option.value === exportEntity)?.description}
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <Button variant="outline" onClick={() => handleEntityExport('json')} disabled={!!isExportingEntity}>
              {isExportingEntity === 'json' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              {t('exportJson')}
            </Button>
            <Button variant="outline" onClick={() => handleEntityExport('csv')} disabled={!!isExportingEntity}>
              {isExportingEntity === 'csv' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              {t('exportCsv')}
            </Button>
            <Button variant="outline" onClick={() => handleEntityExport('xlsx')} disabled={!!isExportingEntity}>
              {isExportingEntity === 'xlsx' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              {t('exportXlsx')}
            </Button>
            <Button onClick={() => handleEntityExport('pdf')} disabled={!!isExportingEntity}>
              {isExportingEntity === 'pdf' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              {t('exportPdf')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading && !reportsData ? (
        <div className="flex min-h-[320px] items-center justify-center rounded-2xl border bg-card">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>{t('loadingReports')}</span>
          </div>
        </div>
      ) : reportsData ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { title: t('salesRevenue'), icon: Wallet, metric: trendMetrics?.salesRevenue, currency: true },
              { title: t('repairRevenue'), icon: Wrench, metric: trendMetrics?.repairRevenue, currency: true },
              { title: t('netCollected'), icon: Receipt, metric: trendMetrics?.netCollected, currency: true },
              { title: t('repairs'), icon: Wrench, metric: trendMetrics?.completedRepairs, currency: false },
              { title: t('newCustomers'), icon: Users, metric: trendMetrics?.newCustomers, currency: false },
              { title: t('averageSale'), icon: TrendingUp, metric: trendMetrics?.averageSale, currency: true },
              { title: t('totalClientBalance'), icon: Users, value: reportsData.overview.totalClientBalance, currency: true },
              { title: t('totalSupplierBalance'), icon: Wallet, value: reportsData.overview.totalSupplierBalance, currency: true },
            ].map((item) => {
              const Icon = item.icon
              const metric = 'metric' in item ? item.metric : undefined
              const rawValue = 'value' in item ? item.value : undefined
              const isPositive = (metric?.changePercent || 0) >= 0

              return (
                <Card key={item.title}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {item.currency
                        ? formatCurrency(metric?.value ?? rawValue ?? 0)
                        : (metric?.value ?? rawValue ?? 0).toLocaleString()}
                    </div>
                    {metric ? (
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <span className={cn('flex items-center font-medium', isPositive ? 'text-emerald-600' : 'text-red-600')}>
                          {isPositive ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
                          {isPositive ? '+' : ''}{metric.changePercent || 0}%
                        </span>
                        <span>{t('vsPreviousPeriod')}</span>
                      </div>
                    ) : (
                      <div className="mt-2 text-xs text-muted-foreground">
                        {t('currentStoredTotal')}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.8fr_1.2fr]">
            <Card>
              <CardHeader>
                <CardTitle>{t('revenueTrend')}</CardTitle>
                <CardDescription>{t('selectedPeriodRevenue')}</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={reportsData.salesTrend}>
                    <defs>
                      <linearGradient id="reportsSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.03} />
                      </linearGradient>
                      <linearGradient id="reportsRepairs" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.03} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => formatCurrency(value)} />
                    <Area type="monotone" dataKey="sales" stroke="#3b82f6" fill="url(#reportsSales)" name="Sales" />
                    <Area type="monotone" dataKey="repairs" stroke="#10b981" fill="url(#reportsRepairs)" name="Repairs" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('paymentMethods')}</CardTitle>
                <CardDescription>{t('collectedPaymentMix')}</CardDescription>
              </CardHeader>
              <CardContent>
                {reportsData.paymentMethods.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={reportsData.paymentMethods}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="method" />
                      <YAxis />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value: number, _name, item) => [formatCurrency(value), item?.payload?.method || t('amount')]}
                      />
                      <Bar dataKey="amount" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[320px] items-center justify-center text-muted-foreground">{t('noPaymentAnalyticsAvailable')}</div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <CardHeader>
                <CardTitle>{t('inventorySnapshot')}</CardTitle>
                <CardDescription>{t('currentInventoryValue')}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <p className="text-sm text-muted-foreground">{t('costValue')}</p>
                  <p className="mt-2 text-2xl font-bold">{formatCurrency(reportsData.overview.inventoryCostValue)}</p>
                </div>
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <p className="text-sm text-muted-foreground">{t('retailValue')}</p>
                  <p className="mt-2 text-2xl font-bold">{formatCurrency(reportsData.overview.inventoryRetailValue)}</p>
                </div>
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <p className="text-sm text-muted-foreground">{t('lowStockItems')}</p>
                  <p className="mt-2 text-2xl font-bold text-amber-600">{reportsData.overview.lowStockCount}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('repairStatusMix')}</CardTitle>
                <CardDescription>{t('repairsCreatedSelectedPeriod')}</CardDescription>
              </CardHeader>
              <CardContent>
                {reportsData.repairStatuses.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={reportsData.repairStatuses} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                        {reportsData.repairStatuses.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[220px] items-center justify-center text-muted-foreground">{t('noRepairStatusDataAvailable')}</div>
                )}
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="sales" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="sales">{t('sales')}</TabsTrigger>
              <TabsTrigger value="repairs">{t('repairs')}</TabsTrigger>
              <TabsTrigger value="inventory">{t('inventory')}</TabsTrigger>
            </TabsList>

            <TabsContent value="sales" className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('topProducts')}</CardTitle>
                    <CardDescription>{t('bestPerformingProductsSelectedPeriod')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {reportsData.topProducts.length > 0 ? (
                      reportsData.topProducts.map((product, index) => (
                        <div key={product.id} className="flex items-center justify-between rounded-2xl border p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-sm text-muted-foreground">{product.sku} · {product.quantitySold} {t('sold')}</p>
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
                    <CardDescription>{t('latestInvoicesInsidePeriod')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {reportsData.recentSales.length > 0 ? (
                      reportsData.recentSales.map((sale) => (
                        <div key={sale.id} className="rounded-2xl border p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium">{sale.invoiceNumber}</p>
                              <p className="text-sm text-muted-foreground">{sale.customerName}</p>
                            </div>
                            <Badge variant={sale.dueAmount > 0 ? 'secondary' : 'default'}>{sale.paymentStatus}</Badge>
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
                              <p className="text-muted-foreground">{t('date')}</p>
                              <p className="font-semibold">{formatDateTime(sale.saleDate)}</p>
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
            </TabsContent>

            <TabsContent value="repairs" className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('repairStatusBreakdown')}</CardTitle>
                    <CardDescription>{t('activeDistributionWorkflowStates')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {reportsData.repairStatuses.length > 0 ? (
                      reportsData.repairStatuses.map((status) => (
                        <div key={status.name} className="flex items-center justify-between rounded-2xl border px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: status.color }} />
                            <span className="font-medium">{status.name}</span>
                          </div>
                          <Badge variant="outline">{status.value}</Badge>
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
                    <CardTitle>{t('recentRepairs')}</CardTitle>
                    <CardDescription>{t('latestRepairTicketsRevenueProfit')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {reportsData.recentRepairs.length > 0 ? (
                      reportsData.recentRepairs.map((repair) => (
                        <div key={repair.id} className="rounded-2xl border p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium">{repair.ticketNumber}</p>
                              <p className="text-sm text-muted-foreground">{repair.customerName} · {repair.device}</p>
                            </div>
                            <Badge variant={repair.status === 'Cancelled' ? 'destructive' : 'secondary'}>{repair.status}</Badge>
                          </div>
                          <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                            <div>
                              <p className="text-muted-foreground">{t('repairRevenueShort')}</p>
                              <p className="font-semibold">{formatCurrency(repair.repairCost)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">{t('estimatedProfit')}</p>
                              <p className={cn('font-semibold', repair.profit >= 0 ? 'text-emerald-600' : 'text-red-600')}>
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
              </div>
            </TabsContent>

            <TabsContent value="inventory" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t('lowStockReport')}</CardTitle>
                  <CardDescription>{t('lowStockThresholdDescription')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {reportsData.lowStockProducts.length > 0 ? (
                    reportsData.lowStockProducts.map((product) => (
                      <div key={product.id} className="flex flex-col gap-3 rounded-2xl border p-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                            <Package className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-muted-foreground">{product.sku} · {product.categoryName}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">{t('currentStock')}</p>
                            <p className="font-semibold">{product.quantity}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">{t('alertAt')}</p>
                            <p className="font-semibold">{product.minStockAlert}</p>
                          </div>
                          <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            {t('restock')}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex h-[220px] items-center justify-center rounded-2xl border border-dashed text-muted-foreground">
                      {t('noLowStockProductsFound')}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <div className="flex min-h-[320px] items-center justify-center rounded-2xl border bg-card text-muted-foreground">
          {t('unableToLoadReportData')}
        </div>
      )}
    </div>
  )
}
