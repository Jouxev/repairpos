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
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
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
  FileText,
  RefreshCw,
  Eye,
  Wallet,
  History,
  ArrowUpRight,
  ArrowDownRight,
  Printer,
  CheckCircle2,
  Ban,
} from 'lucide-react'
import { toast } from 'sonner'
import { supplierService, Supplier, CreateSupplierData, UpdateSupplierData } from '@/services/supplierService'
import {
  buildPaymentVoucherDocument,
  executePreparedPrintDocument,
  PreparedPrintDocument,
} from '@/services/printHelper'

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
  }, [suppliers, searchQuery, selectedStatus])

  const loadSuppliers = async () => {
    try {
      setIsLoading(true)
      const data = await supplierService.getSuppliers()
      setSuppliers(data)
      console.log(data)
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
      return <Badge variant="secondary">{t('inactive')}</Badge>
    }
    if (supplier.balance > 0) {
      return <Badge variant="destructive">{t('hasBalance')}</Badge>
    }
    return <Badge variant="default">{t('active')}</Badge>
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('suppliers')}</h1>
          <p className="text-muted-foreground">
            {t('manageSuppliersPurchasesBalances')}
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={isLoading}>
              <Plus className="h-4 w-4 mr-2" />
              {t('addSupplier')}
            </Button>
          </DialogTrigger>
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
                    <Label htmlFor="name">{t('supplierNameLabel')} *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder={t('enterSupplierName')}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t('phone')}</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder={t('phone')}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">{t('email')}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder={t('email')}
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
                      <SelectTrigger>
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
                  <Label htmlFor="address">{t('address')}</Label>
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
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('searchSuppliers')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allStatus')}</SelectItem>
                <SelectItem value="active">{t('active')}</SelectItem>
                <SelectItem value="inactive">{t('inactive')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Suppliers Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('suppliers')} ({filteredSuppliers.length})</CardTitle>
              <CardDescription>
                {t('manageSuppliersBalances')}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={loadSuppliers} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                {t('refresh')}
              </Button>
              <EntityExportButton entity="providers" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('supplierLabel')}</TableHead>
                  <TableHead>{t('contact')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead className="text-right">{t('totalPurchase')}</TableHead>
                  <TableHead className="text-right">{t('accountBalance')}</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Building2 className="h-8 w-8" />
                        <p>{t('noSuppliersFound')}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSuppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{supplier.name}</p>
                          {supplier.address && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {supplier.address}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {supplier.phone && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span>{supplier.phone}</span>
                            </div>
                          )}
                          {supplier.email && (
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <span className="truncate max-w-[150px]">{supplier.email}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(supplier)}</TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium">{formatCurrency(supplier.totalPurchases || 0)}</div>
                        <div className="text-xs text-muted-foreground">
                          {t('paid')} {formatCurrency(supplier.totalPaid || 0)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className={`font-medium ${supplier.balance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                          {formatCurrency(supplier.balance)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openViewDialog(supplier)}>
                              <Eye className="h-4 w-4 mr-2" />
                              {t('viewDetails')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(supplier)}>
                              <Edit className="h-4 w-4 mr-2" />
                              {t('edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAddPayment(supplier)}>
                              <Wallet className="h-4 w-4 mr-2" />
                              {t('supplierPayment')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleSupplierStatus(supplier)}>
                              {supplier.isActive ? (
                                <Ban className="h-4 w-4 mr-2" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                              )}
                              {supplier.isActive ? t('markInactive') : t('markActive')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => openDeleteDialog(supplier)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t('deleteSupplier')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

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
                  <Label htmlFor="name">{t('supplierNameLabel')} *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder={t('enterSupplierName')}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">{t('phone')}</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t('email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="supplier@example.com"
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
                    <SelectTrigger>
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
                <Label htmlFor="address">{t('address')}</Label>
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
                  <Label htmlFor="edit-name">{t('supplierNameLabel')} *</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder={t('enterSupplierName')}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">{t('phone')}</Label>
                  <Input
                    id="edit-phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-email">{t('email')}</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="supplier@example.com"
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
                    <SelectTrigger>
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
                <Label htmlFor="edit-address">{t('address')}</Label>
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
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border px-4 py-3 text-right">
                    <p className="text-xs uppercase text-muted-foreground">{t('totalPurchases')}</p>
                    <p className="text-xl font-semibold">
                      {formatCurrency(selectedSupplier.totalPurchases || 0)}
                    </p>
                  </div>
                  <div className="rounded-lg border px-4 py-3 text-right">
                    <p className="text-xs uppercase text-muted-foreground">{t('totalPaid')}</p>
                    <p className="text-xl font-semibold text-green-600">
                      {formatCurrency(selectedSupplier.totalPaid || 0)}
                    </p>
                  </div>
                  <div className="rounded-lg border px-4 py-3 text-right">
                    <p className="text-xs uppercase text-muted-foreground">{t('currentBalanceLabel')}</p>
                    <p className={`text-xl font-semibold ${selectedSupplier.balance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                      {formatCurrency(selectedSupplier.balance || 0)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4">
                {selectedSupplier.phone && (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedSupplier.phone}</span>
                  </div>
                )}
                {selectedSupplier.email && (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedSupplier.email}</span>
                  </div>
                )}
                {selectedSupplier.address && (
                  <div className="flex items-start gap-2 p-3 bg-muted rounded-lg col-span-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span>{selectedSupplier.address}</span>
                  </div>
                )}
              </div>

              {/* Notes */}
              {selectedSupplier.notes && (
                <div className="p-4 bg-muted rounded-lg">
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
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    {t('noPurchasesForSupplier')}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {supplierPurchases.slice(0, 5).map((purchase: any) => (
                      <div key={purchase.id} className="flex items-center justify-between rounded-lg border p-3">
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
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {t('edit')}
                </Button>
                {selectedSupplier.balance > 0 && (
                  <Button onClick={() => handleAddPayment(selectedSupplier)}>
                    <Wallet className="h-4 w-4 mr-2" />
                    {t('supplierPayment')}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
              <div className="rounded-lg border bg-muted/40 p-4 text-sm">
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier-payment-method">{t('paymentMethods')}</Label>
                <Select value={paymentMethod} onValueChange={(value: PaymentMethod) => setPaymentMethod(value)}>
                  <SelectTrigger id="supplier-payment-method">
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
              <Printer className="mr-2 h-4 w-4" />
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
              <p className="font-medium">{selectedSupplier.name}</p>
              {selectedSupplier.balance > 0 && (
                <p className="text-sm text-destructive mt-1">
                  {t('supplierOutstandingWarning', { amount: formatCurrency(selectedSupplier.balance) })}
                </p>
              )}
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
