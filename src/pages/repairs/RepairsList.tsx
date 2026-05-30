import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import EntityExportButton from '@/components/common/EntityExportButton'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Wrench, Loader2, User, Phone, Clock, CheckCircle, DollarSign, Info, Calendar, Ban, XCircle, Package } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { repairService, Repair } from '@/services/repairService'
import { useLocaleFormatters } from '@/hooks/useLocaleFormatters'
import { useAppSettings } from '@/contexts/AppSettingsContext'

// Repair Job Card Component
interface RepairJobCardProps {
  repair: Repair
  onClick: () => void
}

function RepairJobCard({ repair, onClick }: RepairJobCardProps) {
  const { toast } = useToast()
  const { formatCurrency, formatDate } = useLocaleFormatters()
  const { t } = useAppSettings()
  const [showSummary, setShowSummary] = useState(false)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-4 w-4" />
      case 'IN_PROGRESS':
        return <Loader2 className="h-4 w-4 animate-spin" />
      case 'REJECTED':
        return <XCircle className="h-4 w-4" />
      case 'COMPLETED_WAITING_PAYMENT':
        return <DollarSign className="h-4 w-4" />
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4" />
      case 'FINISHED':
        return <CheckCircle className="h-4 w-4" />
      case 'DELIVERED':
        return <Package className="h-4 w-4" />
      case 'CANCELLED':
        return <Ban className="h-4 w-4" />
      default:
        return <Wrench className="h-4 w-4" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      'PENDING': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'IN_PROGRESS': 'bg-blue-100 text-blue-800 border-blue-200',
      'REJECTED': 'bg-orange-100 text-orange-800 border-orange-200',
      'COMPLETED_WAITING_PAYMENT': 'bg-purple-100 text-purple-800 border-purple-200',
      'COMPLETED': 'bg-green-100 text-green-800 border-green-200',
      'FINISHED': 'bg-teal-100 text-teal-800 border-teal-200',
      'DELIVERED': 'bg-gray-100 text-gray-800 border-gray-200',
      'CANCELLED': 'bg-red-100 text-red-800 border-red-200',
    }
    return variants[status] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, string> = {
      'LOW': 'bg-gray-100 text-gray-600',
      'NORMAL': 'bg-blue-50 text-blue-600',
      'HIGH': 'bg-orange-50 text-orange-600',
      'URGENT': 'bg-red-50 text-red-600',
    }
    return variants[priority] || 'bg-gray-100 text-gray-600'
  }

  const calculateProfit = () => {
    const partsCost = repair.parts?.reduce((sum, part) => sum + ((part.unitCost || 0) * (part.quantity || 0)), 0) || 0
    const laborCost = repair.repairCost * 0.4
    const totalCost = partsCost + laborCost
    const profit = repair.repairCost - totalCost
    const profitMargin = repair.repairCost > 0 ? (profit / repair.repairCost) * 100 : 0
    
    return {
      partsCost,
      laborCost,
      totalCost,
      profit,
      profitMargin,
      revenue: repair.repairCost,
      prepayment: repair.prepayment,
      dueAmount: repair.dueAmount
    }
  }

  const profit = calculateProfit()
  const navigate = useNavigate()

  return (
    <>
      <Card className="cursor-pointer hover:shadow-lg transition-shadow group" onClick={onClick}>
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${getStatusBadge(repair.status)}`}>
                {getStatusIcon(repair.status)}
              </div>
              <div>
                <p className="font-semibold text-sm">{repair.ticketNumber}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(repair.createdAt)}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation()
                setShowSummary(true)
              }}
            >
              <Info className="h-4 w-4" />
            </Button>
          </div>

          {/* Customer Info */}
          <div className="flex items-center gap-2 mb-3 p-2 bg-muted/50 rounded-lg">
            <User className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{repair.client?.fullName || t('noCustomer')}</p>
              {repair.client?.phone && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {repair.client.phone}
                </p>
              )}
            </div>
          </div>

          {/* Device Info */}
          <div className="mb-3">
            <p className="text-sm font-medium">{repair.deviceBrand} {repair.deviceModel}</p>
            <p className="text-xs text-muted-foreground line-clamp-2">{repair.problemDescription}</p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={getPriorityBadge(repair.priority)}>
                {repair.priority}
              </Badge>
              {repair.technician && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {repair.technician.fullName.split(' ')[0]}
                </span>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">{formatCurrency(repair.repairCost)}</p>
              {repair.prepayment > 0 && (
                <p className="text-xs text-muted-foreground">
                  {t('paid')}: {formatCurrency(repair.prepayment)}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Dialog */}
      <Dialog open={showSummary} onOpenChange={setShowSummary}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              {t('repairSummaryTitle')}
            </DialogTitle>
            <DialogDescription>
              {repair.ticketNumber} - {repair.deviceBrand} {repair.deviceModel}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Status and Priority */}
            <div className="flex items-center gap-2">
              <Badge className={getStatusBadge(repair.status)}>
                {repair.status === 'IN_PROGRESS' ? t('inProgress') : repair.status === 'COMPLETED' ? t('completed') : repair.status === 'PENDING' ? t('pending') : repair.status.replace('_', ' ')}
              </Badge>
              <Badge variant="outline" className={getPriorityBadge(repair.priority)}>
                {repair.priority} {t('priority')}
              </Badge>
            </div>

            {/* Customer & Device Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">{t('customer')}</Label>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="font-medium">{repair.client?.fullName}</span>
                </div>
                {repair.client?.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    {repair.client.phone}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">{t('device')}</Label>
                <p className="font-medium">{repair.deviceBrand} {repair.deviceModel}</p>
                {repair.deviceIMEI && (
                  <p className="text-sm text-muted-foreground">IMEI: {repair.deviceIMEI}</p>
                )}
              </div>
            </div>

            {/* Problem Description */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">{t('problemDescription')}</Label>
              <p className="text-sm bg-muted p-3 rounded-lg">{repair.problemDescription}</p>
            </div>

            {/* Timeline */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">{t('timeline')}</Label>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span>{t('received')}: {formatDate(repair.receivedAt)}</span>
                </div>
                {repair.expectedDeliveryDate && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-blue-500" />
                    <span>{t('expected')}: {formatDate(repair.expectedDeliveryDate)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="space-y-3">
              <Label className="text-muted-foreground">{t('financialSummary')}</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted p-3 rounded-lg space-y-1">
                  <p className="text-xs text-muted-foreground">{t('revenue')}</p>
                  <p className="text-lg font-semibold">{formatCurrency(profit.revenue)}</p>
                </div>
                <div className="bg-muted p-3 rounded-lg space-y-1">
                  <p className="text-xs text-muted-foreground">{t('partsCost')}</p>
                  <p className="text-lg font-semibold text-red-600">{formatCurrency(-profit.partsCost)}</p>
                </div>
                <div className="bg-muted p-3 rounded-lg space-y-1">
                  <p className="text-xs text-muted-foreground">{t('laborCost')}</p>
                  <p className="text-lg font-semibold text-red-600">{formatCurrency(-profit.laborCost)}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg space-y-1 border border-green-200">
                  <p className="text-xs text-green-600 font-medium">{t('netProfit')}</p>
                  <p className="text-lg font-bold text-green-700">{formatCurrency(profit.profit)}</p>
                  <p className="text-xs text-green-600">{profit.profitMargin.toFixed(1)}% {t('margin')}</p>
                </div>
              </div>
            </div>

            {/* Payment Status */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">{t('paymentStatus')}</p>
                <p className="font-medium">
                  {repair.prepayment >= repair.repairCost ? (
                    <span className="text-green-600">{t('fullyPaidStatus')}</span>
                  ) : repair.prepayment > 0 ? (
                    <span className="text-yellow-600">{t('partiallyPaid')}</span>
                  ) : (
                    <span className="text-red-600">{t('unpaid')}</span>
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">{t('dueAmount')}</p>
                <p className="font-semibold">{formatCurrency(repair.dueAmount)}</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSummary(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={() => {
              setShowSummary(false)
              navigate(`/repairs/${repair.id}`)
            }}>
              {t('openJobCard')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default function RepairsList() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { formatCurrency } = useLocaleFormatters()
  const { t } = useAppSettings()
  const [searchQuery, setSearchQuery] = useState('')
  const [repairs, setRepairs] = useState<Repair[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  useEffect(() => {
    loadRepairs()
  }, [])

  const loadRepairs = async () => {
    try {
      setIsLoading(true)
      const data = await repairService.getRepairs()
      setRepairs(data)
    } catch (error) {
      console.error('Error loading repairs:', error)
      toast({
        title: t('error'),
        description: t('failedToLoadData'),
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const filteredRepairs = repairs.filter(repair => {
    const matchesSearch = 
      repair.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repair.deviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repair.deviceBrand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repair.problemDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repair.client?.fullName.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'ALL' || repair.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: repairs.length,
    pending: repairs.filter(r => r.status === 'PENDING').length,
    inProgress: repairs.filter(r => r.status === 'IN_PROGRESS').length,
    completed: repairs.filter(r => r.status === 'COMPLETED').length,
    totalRevenue: repairs.reduce((sum, r) => sum + r.repairCost, 0),
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('repairJobCards')}</h1>
          <p className="text-muted-foreground">{t('manageRepairsTrackProgress')}</p>
        </div>
        <div className="flex items-center gap-2">
          <EntityExportButton entity="repairs" />
          <Button onClick={() => navigate('/repairs/new')}>
            <Plus className="mr-2 h-4 w-4" />
            {t('newRepairTicket')}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('total')}</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Wrench className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('pending')}</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
                <span className="text-yellow-600 text-xs font-bold">P</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('inProgress')}</p>
                <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 text-xs font-bold">IP</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('completed')}</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-green-600 text-xs font-bold">C</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('revenue')}</p>
                <p className="text-lg font-bold">{formatCurrency(stats.totalRevenue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle>{t('repairJobCards')}</CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                {['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      statusFilter === status
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {status === 'ALL' ? t('all') : status === 'IN_PROGRESS' ? t('inProgress') : status === 'COMPLETED' ? t('completed') : t('pending')}
                  </button>
                ))}
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t('searchRepairs')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredRepairs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t('noRepairsFound')}</p>
              <p className="text-sm">{t('createNewRepairTicketGetStarted')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredRepairs.map((repair) => (
                <RepairJobCard
                  key={repair.id}
                  repair={repair}
                  onClick={() => navigate(`/repairs/${repair.id}`)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
