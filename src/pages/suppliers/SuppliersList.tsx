import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import EntityExportButton from '@/components/common/EntityExportButton'
import { useLocaleFormatters } from '@/hooks/useLocaleFormatters'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Building2,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
  Eye,
  Wallet,
  ChevronRight,
  ArrowUpDown,
  Loader2,
  CheckCircle2,
  Ban,
  CreditCard,
  Package,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { supplierService, Supplier, CreateSupplierData } from '@/services/supplierService'
import {
  buildPaymentVoucherDocument,
  executePreparedPrintDocument,
  PreparedPrintDocument,
} from '@/services/printHelper'
import { cn } from '@/lib/utils'

type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'check' | 'digital_wallet'

const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: 'cash',
  card: 'card',
  bank_transfer: 'bank_transfer',
  check: 'check',
  digital_wallet: 'digital_wallet',
}

export default function SuppliersList() {
  const { t } = useAppSettings()
  const { formatCurrency, formatDate } = useLocaleFormatters()
  const navigate = useNavigate()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'name' | 'balance' | 'newest'>('newest')
  const [isLoading, setIsLoading] = useState(false)

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [isPaymentPreviewOpen, setIsPaymentPreviewOpen] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [supplierPurchases, setSupplierPurchases] = useState<any[]>([])
  const [paymentPreviewDocument, setPaymentPreviewDocument] = useState<PreparedPrintDocument | null>(null)
  const [isPrintingVoucher, setIsPrintingVoucher] = useState(false)
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [paymentNotes, setPaymentNotes] = useState('')

  // Form states
  const [formData, setFormData] = useState<CreateSupplierData>({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    isActive: true,
  })

  useEffect(() => {
    loadSuppliers()
  }, [])

  useEffect(() => {
    filterSuppliers()
  }, [suppliers, searchQuery, selectedStatus, sortBy])

  const loadSuppliers = async () => {
    try {
      setIsLoading(true)
      const data = await supplierService.getSuppliers()
      setSuppliers(data)
    } catch (error: any) {
      toast.error(`${t('failedToLoadSuppliers')}: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const filterSuppliers = () => {
    let filtered = suppliers

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.email?.toLowerCase().includes(query) ||
          s.phone?.toLowerCase().includes(query) ||
          s.address?.toLowerCase().includes(query)
      )
    }

    if (selectedStatus !== 'all') {
      const isActive = selectedStatus === 'active'
      filtered = filtered.filter((s) => s.isActive === isActive)
    }

    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name)
        case 'balance': return (b.balance || 0) - (a.balance || 0)
        case 'newest': default: return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      }
    })

    setFilteredSuppliers(filtered)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error(t('supplierNameRequired'))
      return
    }

    try {
      setIsLoading(true)
      await supplierService.createSupplier(formData)
      toast.success(t('supplierCreated'))
      setIsCreateDialogOpen(false)
      resetForm()
      await loadSuppliers()
    } catch (error: any) {
      toast.error(`${t('failedToCreateSupplier')}: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSupplier) return
    if (!formData.name.trim()) {
      toast.error(t('supplierNameRequired'))
      return
    }

    try {
      setIsLoading(true)
      await supplierService.updateSupplier(selectedSupplier.id, formData)
      toast.success(t('supplierUpdated'))
      setIsEditDialogOpen(false)
      setSelectedSupplier(null)
      resetForm()
      await loadSuppliers()
    } catch (error: any) {
      toast.error(`${t('failedToUpdateSupplier')}: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedSupplier) return

    try {
      setIsLoading(true)
      await supplierService.deleteSupplier(selectedSupplier.id)
      toast.success(t('supplierDeleted'))
      setIsDeleteDialogOpen(false)
      setSelectedSupplier(null)
      await loadSuppliers()
    } catch (error: any) {
      toast.error(`${t('failedToDeleteSupplier')}: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const openEditDialog = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setFormData({
      name: supplier.name,
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      notes: supplier.notes || '',
      isActive: supplier.isActive,
    })
    setIsEditDialogOpen(true)
  }

  const loadSupplierPurchases = async (supplierId: string) => {
    try {
      const purchases = await supplierService.getSupplierPurchases(supplierId)
      setSupplierPurchases(Array.isArray(purchases) ? purchases : [])
    } catch (error: any) {
      toast.error(`${t('failedToLoadSupplierPurchases')}: ${error.message}`)
      setSupplierPurchases([])
    }
  }

  const refreshSelectedSupplier = async (supplierId: string) => {
    try {
      const supplier = await supplierService.getSupplierById(supplierId)
      setSelectedSupplier(supplier)
    } catch (error: any) {
      toast.error(`${t('failedToRefreshSupplier')}: ${error.message}`)
    }
  }

  const openViewDialog = async (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setIsViewDialogOpen(true)
    await loadSupplierPurchases(supplier.id)
    await refreshSelectedSupplier(supplier.id)
  }

  const openDeleteDialog = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setIsDeleteDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      notes: '',
      isActive: true,
    })
  }

  const resetPaymentForm = () => {
    setPaymentAmount('')
    setPaymentMethod('cash')
    setPaymentNotes('')
  }

  const getStatusBadge = (supplier: Supplier) => {
    if (!supplier.isActive) {
      return <Badge variant="secondary" className="text-[10px] gap-1"><Ban className="h-3 w-3" />{t('inactive')}</Badge>
    }
    if (supplier.balance > 0) {
      return <Badge variant="destructive" className="text-[10px] gap-1"><AlertTriangle className="h-3 w-3" />{t('hasBalance')}</Badge>
    }
    return <Badge variant="default" className="text-[10px] gap-1"><CheckCircle2 className="h-3 w-3" />{t('active')}</Badge>
  }

  const handleAddPayment = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setIsPaymentDialogOpen(true)
  }

  const handleToggleSupplierStatus = async (supplier: Supplier) => {
    try {
      setIsLoading(true)
      await supplierService.updateSupplier(supplier.id, { isActive: !supplier.isActive })
      toast.success(t('supplierMarkedStatus', { status: supplier.isActive ? t('inactive') : t('active') }))
      await loadSuppliers()

      if (selectedSupplier?.id === supplier.id) {
        await refreshSelectedSupplier(supplier.id)
      }
    } catch (error: any) {
      toast.error(`${t('failedToUpdateSupplierStatus')}: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveSupplierVersement = async () => {
    if (!selectedSupplier) return

    const amount = Number(paymentAmount)
    if (!amount || amount <= 0) {
      toast.error(t('enterVersementAmount'))
      return
    }

    try {
      setIsSubmittingPayment(true)
      await supplierService.addPayment(selectedSupplier.id, {
        amount,
        paymentMethod,
        notes: paymentNotes || undefined,
        date: new Date(),
      })

      const preview = await buildPaymentVoucherDocument(
        {
          reference: `PAY-OUT-${Date.now()}`,
          date: new Date().toLocaleDateString(),
          amount,
          method:
            paymentMethod === 'cash'
              ? t('cashIn').replace(' In', '')
              : paymentMethod === 'card'
                ? 'Card'
                : paymentMethod === 'bank_transfer'
                  ? 'Bank Transfer'
                  : paymentMethod === 'check'
                    ? 'Check'
                    : 'Digital Wallet',
          notes: paymentNotes || undefined,
          direction: 'OUT',
          supplierName: selectedSupplier.name,
          supplierPhone: selectedSupplier.phone,
          supplierEmail: selectedSupplier.email,
        },
        'PAYMENT_OUT',
      )

      setPaymentPreviewDocument(preview)
      setIsPaymentPreviewOpen(true)
      setIsPaymentDialogOpen(false)
      resetPaymentForm()
      await loadSuppliers()
      await loadSupplierPurchases(selectedSupplier.id)
      await refreshSelectedSupplier(selectedSupplier.id)
      toast.success(t('supplierVersementRecorded'))
    } catch (error: any) {
      toast.error(`${t('failedToRecordSupplierVersement')}: ${error.message}`)
    } finally {
      setIsSubmittingPayment(false)
    }
  }

  const handlePrintSupplierVoucher = async () => {
    if (!paymentPreviewDocument) {
      return
    }

    try {
      setIsPrintingVoucher(true)
      await executePreparedPrintDocument(paymentPreviewDocument)
      toast.success(t('supplierVoucherSent'))
    } catch (error: any) {
      toast.error(`${t('failedToPrintSupplierVoucher')}: ${error.message}`)
    } finally {
      setIsPrintingVoucher(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Compute stats
  const totalSuppliers = suppliers.length
  const activeSuppliers = suppliers.filter(s => s.isActive).length
  const totalPurchases = suppliers.reduce((sum, s) => sum + (s.totalPurchases || 0), 0)
  const totalBalance = suppliers.reduce((sum, s) => sum + (s.balance || 0), 0)

  return (
    <div className="space-y-6 animate-enter">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t('suppliers')}</h1>
          <p className="text-muted-foreground">{t('manageSuppliersPurchasesBalances')}</p>
        </div>
        <div className="flex items-center gap-2">
          <EntityExportButton entity="providers" />
          <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2" disabled={isLoading}>
            <Plus className="h-4 w-4" />
            {t('addSupplier')}
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border/50 bg-card p-4 transition-all duration-200 hover:shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalSuppliers}</p>
              <p className="text-xs text-muted-foreground">{t('totalSuppliers')}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-4 transition-all duration-200 hover:shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeSuppliers}</p>
              <p className="text-xs text-muted-foreground">{t('active')}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-4 transition-all duration-200 hover:shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(totalPurchases)}</p>
              <p className="text-xs text-muted-foreground">{t('totalPurchase')}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-4 transition-all duration-200 hover:shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
              <CreditCard className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className={cn("text-2xl font-bold", totalBalance > 0 ? 'text-destructive' : 'text-foreground')}>
                {formatCurrency(totalBalance)}
              </p>
              <p className="text-xs text-muted-foreground">{t('accountBalance')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('searchSuppliers')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <span className="text-lg leading-none">&times;</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={t('status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allStatus')}</SelectItem>
                  <SelectItem value="active">{t('active')}</SelectItem>
                  <SelectItem value="inactive">{t('inactive')}</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1.5 rounded-lg border bg-background px-2 py-1">
                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="bg-transparent text-sm font-medium outline-none cursor-pointer"
                >
                  <option value="newest">{t('newest')}</option>
                  <option value="name">{t('name')}</option>
                  <option value="balance">{t('balance')}</option>
                </select>
              </div>
              <Badge variant="secondary" className="text-xs">
                {filteredSuppliers.length} {t('suppliers')}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Suppliers List */}
      {isLoading && suppliers.length === 0 ? (
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{t('loadingSuppliers')}</p>
          </div>
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="font-medium">{t('noSuppliersFound')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('tryDifferentSearch')}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('addSupplier')}
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredSuppliers.map((supplier, index) => (
            <div
              key={supplier.id}
              className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-5 transition-all duration-300 hover-lift cursor-pointer"
              onClick={() => openViewDialog(supplier)}
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              <div className="relative">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 rounded-xl">
                      <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-semibold">
                        {getInitials(supplier.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{supplier.name}</h3>
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground truncate">
                          {supplier.address || t('noAddressSet')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {getStatusBadge(supplier)}
                    <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </div>

                {supplier.email && (
                  <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    <span className="truncate">{supplier.email}</span>
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-4">
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium">{supplier.phone || '—'}</span>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "text-sm font-semibold",
                      supplier.balance > 0 ? 'text-destructive' : supplier.balance < 0 ? 'text-success' : 'text-muted-foreground'
                    )}>
                      {formatCurrency(supplier.balance || 0)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {supplier.balance > 0 ? t('balanceDue') : supplier.balance < 0 ? t('creditBalance') : t('zeroBalance')}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {t('totalPurchase')}: {formatCurrency(supplier.totalPurchases || 0)}
                  </Badge>
                  {supplier.isActive && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="ml-auto h-7 px-2 text-xs opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAddPayment(supplier)
                      }}
                    >
                      <Wallet className="h-3 w-3 mr-1" />
                      {t('supplierPayment')}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('addNewSupplier')}</DialogTitle>
            <DialogDescription>
              {t('enterSupplierDetails')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    {t('supplierNameLabel')} *
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder={t('enterSupplierName')}
                    className="h-11"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {t('phone')}
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="+1 (555) 123-4567"
                    className="h-11"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {t('email')}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="supplier@example.com"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="isActive">{t('status')}</Label>
                  <Select
                    value={formData.isActive ? 'active' : 'inactive'}
                    onValueChange={(value) =>
                      setFormData({ ...formData, isActive: value === 'active' })
                    }
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{t('active')}</SelectItem>
                      <SelectItem value="inactive">{t('inactive')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  {t('address')}
                </Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder={t('address')}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">{t('notes')}</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder={t('optionalNotes')}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false)
                  resetForm()
                }}
                disabled={isLoading}
              >
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? t('saving') : t('createSupplier')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('editSupplier')}</DialogTitle>
            <DialogDescription>
              {t('updateSupplierDetails')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    {t('supplierNameLabel')} *
                  </Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder={t('enterSupplierName')}
                    className="h-11"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {t('phone')}
                  </Label>
                  <Input
                    id="edit-phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="+1 (555) 123-4567"
                    className="h-11"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {t('email')}
                  </Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="supplier@example.com"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-isActive">{t('status')}</Label>
                  <Select
                    value={formData.isActive ? 'active' : 'inactive'}
                    onValueChange={(value) =>
                      setFormData({ ...formData, isActive: value === 'active' })
                    }
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{t('active')}</SelectItem>
                      <SelectItem value="inactive">{t('inactive')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-address" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  {t('address')}
                </Label>
                <Textarea
                  id="edit-address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder={t('address')}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-notes">{t('notes')}</Label>
                <Textarea
                  id="edit-notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder={t('optionalNotes')}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false)
                  setSelectedSupplier(null)
                }}
                disabled={isLoading}
              >
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? t('saving') : t('updateSupplier')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t('supplierDetails')}</DialogTitle>
            <DialogDescription>
              {t('viewSupplierInfoPurchaseHistory')}
            </DialogDescription>
          </DialogHeader>
          {selectedSupplier && (
            <div className="space-y-6 py-4">
              {/* Header Info */}
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 rounded-2xl">
                    <AvatarFallback className="rounded-2xl bg-primary/10 text-primary text-xl font-semibold">
                      {getInitials(selectedSupplier.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-2xl font-bold">{selectedSupplier.name}</h3>
                    <div className="mt-2 flex items-center gap-2">
                      {getStatusBadge(selectedSupplier)}
                      {selectedSupplier.balance > 0 && (
                        <Badge variant="destructive">
                          {t('balanceDue')}: {formatCurrency(selectedSupplier.balance)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border bg-muted/20 px-4 py-3 text-right">
                    <p className="text-xs uppercase text-muted-foreground">{t('totalPurchases')}</p>
                    <p className="text-xl font-semibold">
                      {formatCurrency(selectedSupplier.totalPurchases || 0)}
                    </p>
                  </div>
                  <div className="rounded-2xl border bg-muted/20 px-4 py-3 text-right">
                    <p className="text-xs uppercase text-muted-foreground">{t('totalPaid')}</p>
                    <p className="text-xl font-semibold text-green-600">
                      {formatCurrency(selectedSupplier.totalPaid || 0)}
                    </p>
                  </div>
                  <div className="rounded-2xl border bg-muted/20 px-4 py-3 text-right">
                    <p className="text-xs uppercase text-muted-foreground">{t('currentBalanceLabel')}</p>
                    <p className={cn("text-xl font-semibold", selectedSupplier.balance > 0 ? 'text-destructive' : 'text-green-600')}>
                      {formatCurrency(selectedSupplier.balance || 0)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4">
                {selectedSupplier.phone && (
                  <div className="flex items-center gap-2 p-3 rounded-2xl bg-muted/30">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{selectedSupplier.phone}</span>
                  </div>
                )}
                {selectedSupplier.email && (
                  <div className="flex items-center gap-2 p-3 rounded-2xl bg-muted/30">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{selectedSupplier.email}</span>
                  </div>
                )}
                {selectedSupplier.address && (
                  <div className="flex items-start gap-2 p-3 rounded-2xl bg-muted/30 col-span-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span className="text-sm">{selectedSupplier.address}</span>
                  </div>
                )}
              </div>

              {/* Notes */}
              {selectedSupplier.notes && (
                <div className="p-4 rounded-2xl bg-muted/30">
                  <h4 className="font-medium mb-2">{t('notes')}</h4>
                  <p className="text-sm text-muted-foreground">{selectedSupplier.notes}</p>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{t('recentPurchases')}</h4>
                  <span className="text-sm text-muted-foreground">{supplierPurchases.length} {t('items')}</span>
                </div>
                {supplierPurchases.length === 0 ? (
                  <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground text-center">
                    {t('noPurchasesForSupplier')}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {supplierPurchases.slice(0, 5).map((purchase: any) => (
                      <div key={purchase.id} className="flex items-center justify-between rounded-2xl border p-3 transition-colors hover:bg-muted/20">
                        <div>
                          <p className="font-medium">{purchase.invoiceNumber}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(purchase.orderedAt)} • {purchase.status}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(purchase.total || 0)}</p>
                          <p className="text-xs text-muted-foreground">
                            {t('due')} {formatCurrency(purchase.dueAmount || 0)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsViewDialogOpen(false)
                    openEditDialog(selectedSupplier)
                  }}
                  className="gap-2"
                >
                  <Edit className="h-4 w-4" />
                  {t('edit')}
                </Button>
                {selectedSupplier.balance > 0 && (
                  <Button onClick={() => handleAddPayment(selectedSupplier)} className="gap-2">
                    <Wallet className="h-4 w-4" />
                    {t('supplierPayment')}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('supplierPayment')}</DialogTitle>
            <DialogDescription>
              {t('supplierVersementDescription')}
            </DialogDescription>
          </DialogHeader>
          {selectedSupplier && (
            <div className="space-y-4">
              <div className="rounded-2xl border bg-muted/20 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('supplierLabel')}</span>
                  <span className="font-medium">{selectedSupplier.name}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-muted-foreground">{t('currentBalance')}</span>
                  <span className="font-medium">{formatCurrency(selectedSupplier.balance || 0)}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier-payment-amount">{t('amount')}</Label>
                <Input
                  id="supplier-payment-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(event) => setPaymentAmount(event.target.value)}
                  placeholder={t('enterVersementAmount')}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier-payment-method">{t('paymentMethods')}</Label>
                <Select value={paymentMethod} onValueChange={(value: PaymentMethod) => setPaymentMethod(value)}>
                  <SelectTrigger id="supplier-payment-method" className="h-11">
                    <SelectValue placeholder={t('paymentMethods')} />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(paymentMethodLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {value === 'cash'
                          ? t('cashIn').replace(' In', '')
                          : value === 'card'
                            ? 'Card'
                            : value === 'bank_transfer'
                              ? 'Bank Transfer'
                              : value === 'check'
                                ? 'Check'
                                : 'Digital Wallet'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier-payment-notes">{t('notes')}</Label>
                <Textarea
                  id="supplier-payment-notes"
                  value={paymentNotes}
                  onChange={(event) => setPaymentNotes(event.target.value)}
                  placeholder={t('optionalReasonOrNote')}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsPaymentDialogOpen(false)
                resetPaymentForm()
              }}
              disabled={isSubmittingPayment}
            >
              {t('cancel')}
            </Button>
            <Button onClick={handleSaveSupplierVersement} disabled={isSubmittingPayment}>
              {isSubmittingPayment ? t('saving') : t('saveVersement')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Preview */}
      <Dialog open={isPaymentPreviewOpen} onOpenChange={setIsPaymentPreviewOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{paymentPreviewDocument?.title || t('supplierVersementPreview')}</DialogTitle>
            <DialogDescription>
              {t('previewSupplierVoucher')}
            </DialogDescription>
          </DialogHeader>
          <iframe
            title="Supplier Versement Preview"
            srcDoc={paymentPreviewDocument?.html || ''}
            className="h-[70vh] w-full rounded-xl border bg-white"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentPreviewOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handlePrintSupplierVoucher} disabled={!paymentPreviewDocument || isPrintingVoucher}>
              <RefreshCw className={cn("mr-2 h-4 w-4", isPrintingVoucher && "animate-spin")} />
              {isPrintingVoucher ? t('printing') : t('printVoucher')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteSupplier')}</DialogTitle>
            <DialogDescription>
              {t('confirmDeleteSupplier')}
            </DialogDescription>
          </DialogHeader>
          {selectedSupplier && (
            <div className="py-4">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/30">
                <Avatar className="h-10 w-10 rounded-xl">
                  <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-semibold text-sm">
                    {getInitials(selectedSupplier.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedSupplier.name}</p>
                  {selectedSupplier.balance > 0 && (
                    <p className="text-sm text-destructive">
                      {t('supplierOutstandingWarning', { amount: formatCurrency(selectedSupplier.balance) })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setSelectedSupplier(null)
              }}
              disabled={isLoading}
            >
              {t('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading}
            >
              {isLoading ? t('deleting') : t('deleteSupplier')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}