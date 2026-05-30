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
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import EntityExportButton from '@/components/common/EntityExportButton'
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
  ShoppingCart,
  Calendar,
  DollarSign,
  Package,
  RefreshCw,
  Eye,
  CreditCard,
  User,
  ArrowRight,
  Check,
  X,
  Clock,
  TrendingUp,
  Ban,
  Truck,
  Printer,
} from 'lucide-react'
import { toast } from 'sonner'
import { useLocaleFormatters } from '@/hooks/useLocaleFormatters'
import { salesService, Sale, SaleStatus, PaymentStatus } from '@/services/salesService'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import {
  buildCommercialDocument,
  buildReceiptDocument,
  executePreparedPrintDocument,
  PreparedPrintDocument,
} from '@/services/printHelper'

const statusColors: Record<SaleStatus, string> = {
  QUOTATION: 'bg-gray-500',
  CONFIRMED: 'bg-blue-500',
  PROCESSING: 'bg-purple-500',
  SHIPPED: 'bg-indigo-500',
  DELIVERED: 'bg-green-500',
  CANCELLED: 'bg-red-500',
  REFUNDED: 'bg-orange-500',
}

const paymentStatusColors: Record<PaymentStatus, string> = {
  PENDING: 'bg-yellow-500',
  PARTIAL: 'bg-orange-500',
  PAID: 'bg-green-500',
  REFUNDED: 'bg-blue-500',
}

export default function SalesList() {
  const { formatCurrency, formatDate } = useLocaleFormatters()
  const { t } = useAppSettings()
  const navigate = useNavigate()
  const [sales, setSales] = useState<Sale[]>([])
  const [filteredSales, setFilteredSales] = useState<Sale[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(false)

  // Dialog states
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false)
  const [printPreviewDocument, setPrintPreviewDocument] = useState<PreparedPrintDocument | null>(null)
  const [isPrintingDocument, setIsPrintingDocument] = useState(false)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    filterSales()
  }, [sales, searchQuery, selectedStatus, selectedPaymentStatus])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const salesData = await salesService.getSales()
      setSales(salesData)
    } catch (error: any) {
      toast.error(`${t('sales')}: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const filterSales = () => {
    let filtered = sales

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (s) =>
          s.invoiceNumber?.toLowerCase().includes(query) ||
          s.customerName?.toLowerCase().includes(query) ||
          s.customerPhone?.includes(query)
      )
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter((s) => s.status === selectedStatus)
    }

    if (selectedPaymentStatus !== 'all') {
      filtered = filtered.filter((s) => s.paymentStatus === selectedPaymentStatus)
    }

    setFilteredSales(filtered)
  }

  const handleDelete = async () => {
    if (!selectedSale) return

    try {
      setIsLoading(true)
      await salesService.deleteSale(selectedSale.id)
      toast.success(t('deleteSale'))
      setIsDeleteDialogOpen(false)
      setSelectedSale(null)
      await loadData()
    } catch (error: any) {
      toast.error(`${t('deleteSale')}: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Helper functions for dialog actions
  const openViewDialog = (sale: Sale) => {
    setSelectedSale(sale)
    setIsViewDialogOpen(true)
  }

  const refreshSelectedSale = async (saleId: string) => {
    const freshSale = await salesService.getSaleById(saleId)
    if (freshSale) {
      setSelectedSale(freshSale)
    }
  }

  const buildSaleInvoiceDocument = async (sale: Sale, documentType: 'A4_INVOICE' | 'A4_PROFORMA_INVOICE') => {
    return buildReceiptDocument(
      {
        shopName: '',
        receiptNumber: sale.invoiceNumber,
        date: new Date(sale.saleDate).toLocaleDateString(),
        time: new Date(sale.saleDate).toLocaleTimeString(),
        customerName: sale.customerName || t('walkInCustomer'),
        customerPhone: sale.customerPhone || undefined,
        customerEmail: sale.customerEmail || undefined,
        items: (sale.items || []).map((item) => ({
          name: item.product?.name || t('product'),
          quantity: item.quantity,
          price: item.unitPrice,
          total: item.total,
        })),
        subtotal: sale.subtotal,
        tax: sale.taxAmount,
        discount: sale.discountAmount,
        total: sale.total,
        paymentMethod: String((sale as any).paymentMethod || t('cashIn').replace(' In', '')),
        footer: sale.notes || undefined,
      },
      documentType,
    )
  }

  const buildSaleCommercialDocument = async (
    sale: Sale,
    documentType: 'DELIVERY_NOTE' | 'PURCHASE_VOUCHER',
  ) => {
    return buildCommercialDocument({
      number: sale.invoiceNumber,
      date: new Date(sale.saleDate).toLocaleDateString(),
      partyName: sale.customerName || t('walkInCustomer'),
      partyPhone: sale.customerPhone || undefined,
      partyEmail: sale.customerEmail || undefined,
      partyAddress: undefined,
      partyLabel: t('customer'),
      items: (sale.items || []).map((item) => ({
        name: item.product?.name || t('product'),
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
      })),
      subtotal: sale.subtotal,
      tax: sale.taxAmount,
      discount: sale.discountAmount,
      total: sale.total,
      notes: sale.notes || undefined,
      status: sale.status,
    }, documentType)
  }

  const openPreparedPreview = (document: PreparedPrintDocument) => {
    setPrintPreviewDocument(document)
    setIsPrintPreviewOpen(true)
  }

  const handleOpenPrintPreview = async (
    sale: Sale,
    documentType: 'A4_INVOICE' | 'A4_PROFORMA_INVOICE' | 'DELIVERY_NOTE' | 'PURCHASE_VOUCHER',
  ) => {
    try {
      const document =
        documentType === 'A4_INVOICE' || documentType === 'A4_PROFORMA_INVOICE'
          ? await buildSaleInvoiceDocument(sale, documentType)
          : await buildSaleCommercialDocument(sale, documentType)
      openPreparedPreview(document)
    } catch (error: any) {
      toast.error(`${t('preview')}: ${error.message}`)
    }
  }

  const handlePrintSale = async () => {
    if (!printPreviewDocument) {
      return
    }

    try {
      setIsPrintingDocument(true)
      await executePreparedPrintDocument(printPreviewDocument)
      toast.success(t('printDocuments'))
    } catch (error: any) {
      toast.error(`${t('printDocuments')}: ${error.message}`)
    } finally {
      setIsPrintingDocument(false)
    }
  }

  const handleOpenPaymentDialog = (sale: Sale) => {
    setSelectedSale(sale)
    setPaymentAmount('')
    setPaymentMethod('cash')
    setIsPaymentDialogOpen(true)
  }

  const handleAddPayment = async () => {
    if (!selectedSale) {
      return
    }

    const amount = Number(paymentAmount)
    if (!amount || amount <= 0) {
      toast.error(t('enterPaymentAmount'))
      return
    }

    try {
      setIsSubmittingPayment(true)
      await salesService.addPayment(selectedSale.id, {
        amount,
        paymentMethod,
      })
      await loadData()
      await refreshSelectedSale(selectedSale.id)
      setIsPaymentDialogOpen(false)
      setPaymentAmount('')
      setPaymentMethod('cash')
      toast.success(t('savePayment'))
    } catch (error: any) {
      toast.error(`${t('savePayment')}: ${error.message}`)
    } finally {
      setIsSubmittingPayment(false)
    }
  }

  const openEditDialog = (sale: Sale) => {
    navigate(`/sales/edit/${sale.id}`)
  }

  const openDeleteDialog = (sale: Sale) => {
    setSelectedSale(sale)
    setIsDeleteDialogOpen(true)
  }

  const handleStatusChange = async (sale: Sale, newStatus: SaleStatus) => {
    try {
      setIsLoading(true)
      await salesService.updateStatus(sale.id, newStatus)
      toast.success(`${t('status')} ${newStatus}`)
      await loadData()
    } catch (error: any) {
      toast.error(`${t('status')}: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: SaleStatus) => {
    const colors: Record<SaleStatus, string> = {
      QUOTATION: 'bg-gray-100 text-gray-800 border-gray-200',
      CONFIRMED: 'bg-blue-100 text-blue-800 border-blue-200',
      PROCESSING: 'bg-purple-100 text-purple-800 border-purple-200',
      SHIPPED: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      DELIVERED: 'bg-green-100 text-green-800 border-green-200',
      CANCELLED: 'bg-red-100 text-red-800 border-red-200',
      REFUNDED: 'bg-orange-100 text-orange-800 border-orange-200',
    }

    return (
      <Badge variant="outline" className={colors[status]}>
        {status === 'QUOTATION' ? t('quotation') : status === 'CONFIRMED' ? t('confirmed') : status === 'PROCESSING' ? t('processing') : status === 'SHIPPED' ? t('shipped') : status === 'DELIVERED' ? t('delivered') : status === 'CANCELLED' ? t('cancelled') : status}
      </Badge>
    )
  }

  const getPaymentStatusBadge = (status: PaymentStatus) => {
    const colors: Record<PaymentStatus, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      PARTIAL: 'bg-orange-100 text-orange-800 border-orange-200',
      PAID: 'bg-green-100 text-green-800 border-green-200',
      REFUNDED: 'bg-blue-100 text-blue-800 border-blue-200',
    }

    return (
      <Badge variant="outline" className={colors[status]}>
        {status === 'PENDING' ? t('pending') : status === 'PARTIAL' ? t('partiallyPaid') : status === 'PAID' ? t('paid') : status}
      </Badge>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('sales')}</h1>
          <p className="text-muted-foreground">
            {t('manageSalesOrdersQuotations')}
          </p>
        </div>
        <Button onClick={() => navigate('/sales/new')}>
          <Plus className="h-4 w-4 mr-2" />
          {t('newSale')}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('searchSalesPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t('status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allStatus')}</SelectItem>
                <SelectItem value="QUOTATION">{t('quotation')}</SelectItem>
                <SelectItem value="CONFIRMED">{t('confirmed')}</SelectItem>
                <SelectItem value="PROCESSING">{t('processing')}</SelectItem>
                <SelectItem value="SHIPPED">{t('shipped')}</SelectItem>
                <SelectItem value="DELIVERED">{t('delivered')}</SelectItem>
                <SelectItem value="CANCELLED">{t('cancelled')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedPaymentStatus} onValueChange={setSelectedPaymentStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t('paymentStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allPayment')}</SelectItem>
                <SelectItem value="PENDING">{t('pending')}</SelectItem>
                <SelectItem value="PARTIAL">{t('partiallyPaid')}</SelectItem>
                <SelectItem value="PAID">{t('paid')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('salesOrders')} ({filteredSales.length})</CardTitle>
              <CardDescription>
                {t('manageSalesOrdersQuotations')}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                {t('refresh')}
              </Button>
              <EntityExportButton entity="sales" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('invoiceNumber')}</TableHead>
                  <TableHead>{t('customer')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead>{t('paymentStatus')}</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Due</TableHead>
                  <TableHead>{t('date')}</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <ShoppingCart className="h-8 w-8" />
                        <p>{t('noSalesFound')}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>
                        <div className="font-medium">{sale.invoiceNumber}</div>
                        <div className="text-xs text-muted-foreground">
                          {sale.items?.length || 0} {t('items')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{sale.customerName || t('walkInCustomer')}</div>
                        {sale.customerPhone && (
                          <div className="text-xs text-muted-foreground">{sale.customerPhone}</div>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(sale.status)}</TableCell>
                      <TableCell>{getPaymentStatusBadge(sale.paymentStatus)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(sale.total)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={sale.dueAmount > 0 ? 'text-destructive' : 'text-green-600'}>
                          {formatCurrency(sale.dueAmount)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(sale.saleDate)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{t('actionsTitle')}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openViewDialog(sale)}>
                              <Eye className="h-4 w-4 mr-2" />
                              {t('viewDetails')}
                            </DropdownMenuItem>
                            {sale.status !== 'DELIVERED' && sale.status !== 'CANCELLED' && (
                              <DropdownMenuItem onClick={() => navigate(`/sales/edit/${sale.id}`)}>
                                <Edit className="h-4 w-4 mr-2" />
                                {t('edit')}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>{t('updateStatusTitle')}</DropdownMenuLabel>
                            {sale.status === 'QUOTATION' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(sale, 'CONFIRMED')}>
                                <Check className="h-4 w-4 mr-2" />
                                {t('markAsConfirmed')}
                              </DropdownMenuItem>
                            )}
                            {sale.status === 'CONFIRMED' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(sale, 'PROCESSING')}>
                                <Package className="h-4 w-4 mr-2" />
                                {t('markAsProcessing')}
                              </DropdownMenuItem>
                            )}
                            {sale.status === 'PROCESSING' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(sale, 'SHIPPED')}>
                                <Truck className="h-4 w-4 mr-2" />
                                {t('markAsShipped')}
                              </DropdownMenuItem>
                            )}
                            {sale.status === 'SHIPPED' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(sale, 'DELIVERED')}>
                                <Check className="h-4 w-4 mr-2" />
                                {t('markAsDelivered')}
                              </DropdownMenuItem>
                            )}
                            {(sale.status !== 'CANCELLED' && sale.status !== 'DELIVERED') && (
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(sale, 'CANCELLED')}
                                className="text-destructive"
                              >
                                <Ban className="h-4 w-4 mr-2" />
                                {t('cancelOrder')}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => openDeleteDialog(sale)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t('delete')}
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

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('saleOrderDetails')}</DialogTitle>
            <DialogDescription>
              {t('viewCompleteSaleOrderInformation')}
            </DialogDescription>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-6 py-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-bold">{selectedSale.invoiceNumber}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    {getStatusBadge(selectedSale.status)}
                    {getPaymentStatusBadge(selectedSale.paymentStatus)}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">{t('orderDate')}</p>
                  <p className="font-medium">{formatDate(selectedSale.saleDate)}</p>
                </div>
              </div>

              {/* Customer Info */}
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {t('customer')}
                </h4>
                <p className="font-medium">{selectedSale.customerName || t('walkInCustomer')}</p>
                {selectedSale.customerPhone && (
                  <p className="text-sm text-muted-foreground">{selectedSale.customerPhone}</p>
                )}
                {selectedSale.customerEmail && (
                  <p className="text-sm text-muted-foreground">{selectedSale.customerEmail}</p>
                )}
              </div>

              {/* Items Table */}
              <div>
                <h4 className="font-medium mb-3">{t('saleItems')}</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('product')}</TableHead>
                      <TableHead className="text-right">{t('quantity')}</TableHead>
                      <TableHead className="text-right">{t('unitPrice')}</TableHead>
                      <TableHead className="text-right">{t('total')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSale.items?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium">{item.product?.name}</div>
                          <div className="text-xs text-muted-foreground">{item.product?.sku}</div>
                        </TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Financial Summary */}
              <div className="flex justify-end">
                <div className="w-72 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('subtotal')}</span>
                    <span>{formatCurrency(selectedSale.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('discount')}</span>
                    <span>{formatCurrency(selectedSale.discountAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('taxRate').replace(' (%)', '')}</span>
                    <span>{formatCurrency(selectedSale.taxAmount)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <span>{t('total')}</span>
                    <span>{formatCurrency(selectedSale.total)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('paid')}</span>
                    <span className="text-green-600">{formatCurrency(selectedSale.paidAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('due')}</span>
                    <span className={selectedSale.dueAmount > 0 ? 'text-destructive' : 'text-green-600'}>
                      {formatCurrency(selectedSale.dueAmount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedSale.notes && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">{t('notes')}</h4>
                  <p className="text-sm text-muted-foreground">{selectedSale.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2">
                {selectedSale.dueAmount > 0 && (
                  <Button variant="outline" onClick={() => handleOpenPaymentDialog(selectedSale)}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    {t('addPaymentToSale')}
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button>
                      <Printer className="h-4 w-4 mr-2" />
                      {t('printDocuments')}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{t('salesDocuments')}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => selectedSale && handleOpenPrintPreview(selectedSale, 'A4_INVOICE')}>
                      {t('invoice')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => selectedSale && handleOpenPrintPreview(selectedSale, 'A4_PROFORMA_INVOICE')}>
                      {t('proformaInvoice')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => selectedSale && handleOpenPrintPreview(selectedSale, 'DELIVERY_NOTE')}>
                      Bon de Route
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => selectedSale && handleOpenPrintPreview(selectedSale, 'PURCHASE_VOUCHER')}>
                      Bon d&apos;Achat
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="outline"
                  onClick={() => setIsViewDialogOpen(false)}
                >
                  {t('cancel')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('addPaymentToSale')}</DialogTitle>
            <DialogDescription>
              {t('recordExtraPaymentForSale')}
            </DialogDescription>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/40 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('invoiceNumber')}</span>
                  <span className="font-medium">{selectedSale.invoiceNumber}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-muted-foreground">{t('currentBalance')}</span>
                  <span className="font-medium">{formatCurrency(selectedSale.dueAmount || 0)}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sale-payment-amount">{t('amount')}</Label>
                <Input
                  id="sale-payment-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(event) => setPaymentAmount(event.target.value)}
                  placeholder={t('enterPaymentAmount')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sale-payment-method">{t('paymentMethods')}</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger id="sale-payment-method">
                    <SelectValue placeholder={t('paymentMethods')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">{t('cashIn').replace(' In', '')}</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="digital_wallet">Digital Wallet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsPaymentDialogOpen(false)
                setPaymentAmount('')
                setPaymentMethod('cash')
              }}
              disabled={isSubmittingPayment}
            >
              {t('cancel')}
            </Button>
            <Button onClick={handleAddPayment} disabled={isSubmittingPayment}>
              {isSubmittingPayment ? t('saving') : t('savePayment')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPrintPreviewOpen} onOpenChange={setIsPrintPreviewOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{printPreviewDocument?.title || t('salePrintPreview')}</DialogTitle>
            <DialogDescription>
              {t('previewSaleDocument')}
            </DialogDescription>
          </DialogHeader>
          <iframe
            title="Sale Print Preview"
            srcDoc={printPreviewDocument?.html || ''}
            className="h-[70vh] w-full rounded-xl border bg-white"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPrintPreviewOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handlePrintSale} disabled={!printPreviewDocument || isPrintingDocument}>
              <Printer className="h-4 w-4 mr-2" />
              {isPrintingDocument ? t('printing') : (printPreviewDocument?.title?.replace(' Preview', '') || t('printDocuments'))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteSaleOrder')}</DialogTitle>
            <DialogDescription>
              {t('confirmDeleteSaleOrder')}
            </DialogDescription>
          </DialogHeader>
          {selectedSale && (
            <div className="py-4">
              <p className="font-medium">{selectedSale.invoiceNumber}</p>
              <p className="text-sm text-muted-foreground">{selectedSale.customerName || t('walkInCustomer')}</p>
              <p className="text-lg font-medium mt-2">{formatCurrency(selectedSale.total)}</p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setSelectedSale(null)
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
              {isLoading ? t('deleting') : t('deleteSale')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
