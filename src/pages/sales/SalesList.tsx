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
  Download,
  Eye,
  CreditCard,
  User,
  ArrowRight,
  Check,
  X,
  Clock,
  TrendingUp,
  Ban,
} from 'lucide-react'
import { toast } from 'sonner'
import { salesService, Sale, SaleStatus, PaymentStatus } from '@/services/salesService'

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
      toast.error('Failed to load sales: ' + error.message)
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
      toast.success('Sale deleted successfully')
      setIsDeleteDialogOpen(false)
      setSelectedSale(null)
      await loadData()
    } catch (error: any) {
      toast.error('Failed to delete sale: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Helper functions for dialog actions
  const openViewDialog = (sale: Sale) => {
    setSelectedSale(sale)
    setIsViewDialogOpen(true)
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
      toast.success(`Sale status updated to ${newStatus}`)
      await loadData()
    } catch (error: any) {
      toast.error('Failed to update status: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
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
        {status}
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
        {status}
      </Badge>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales</h1>
          <p className="text-muted-foreground">
            Manage sales orders and quotations
          </p>
        </div>
        <Button onClick={() => navigate('/sales/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Sale
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by invoice, customer name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="QUOTATION">Quotation</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                <SelectItem value="PROCESSING">Processing</SelectItem>
                <SelectItem value="SHIPPED">Shipped</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedPaymentStatus} onValueChange={setSelectedPaymentStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payment</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PARTIAL">Partial</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
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
              <CardTitle>Sales Orders ({filteredSales.length})</CardTitle>
              <CardDescription>
                Manage sales orders and quotations
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Due</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <ShoppingCart className="h-8 w-8" />
                        <p>No sales found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>
                        <div className="font-medium">{sale.invoiceNumber}</div>
                        <div className="text-xs text-muted-foreground">
                          {sale.items?.length || 0} items
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{sale.customerName || 'Walk-in Customer'}</div>
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
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openViewDialog(sale)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {sale.status !== 'DELIVERED' && sale.status !== 'CANCELLED' && (
                              <DropdownMenuItem onClick={() => navigate(`/sales/edit/${sale.id}`)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Update Status</DropdownMenuLabel>
                            {sale.status === 'QUOTATION' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(sale, 'CONFIRMED')}>
                                <Check className="h-4 w-4 mr-2" />
                                Mark as Confirmed
                              </DropdownMenuItem>
                            )}
                            {sale.status === 'CONFIRMED' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(sale, 'PROCESSING')}>
                                <Package className="h-4 w-4 mr-2" />
                                Mark as Processing
                              </DropdownMenuItem>
                            )}
                            {sale.status === 'PROCESSING' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(sale, 'SHIPPED')}>
                                <Truck className="h-4 w-4 mr-2" />
                                Mark as Shipped
                              </DropdownMenuItem>
                            )}
                            {sale.status === 'SHIPPED' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(sale, 'DELIVERED')}>
                                <Check className="h-4 w-4 mr-2" />
                                Mark as Delivered
                              </DropdownMenuItem>
                            )}
                            {(sale.status !== 'CANCELLED' && sale.status !== 'DELIVERED') && (
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(sale, 'CANCELLED')}
                                className="text-destructive"
                              >
                                <Ban className="h-4 w-4 mr-2" />
                                Cancel Order
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => openDeleteDialog(sale)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
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
            <DialogTitle>Sale Order Details</DialogTitle>
            <DialogDescription>
              View complete sale order information
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
                  <p className="text-sm text-muted-foreground">Order Date</p>
                  <p className="font-medium">{formatDate(selectedSale.saleDate)}</p>
                </div>
              </div>

              {/* Customer Info */}
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Customer
                </h4>
                <p className="font-medium">{selectedSale.customerName || 'Walk-in Customer'}</p>
                {selectedSale.customerPhone && (
                  <p className="text-sm text-muted-foreground">{selectedSale.customerPhone}</p>
                )}
                {selectedSale.customerEmail && (
                  <p className="text-sm text-muted-foreground">{selectedSale.customerEmail}</p>
                )}
              </div>

              {/* Items Table */}
              <div>
                <h4 className="font-medium mb-3">Sale Items</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
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
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(selectedSale.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span>{formatCurrency(selectedSale.discountAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span>{formatCurrency(selectedSale.taxAmount)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <span>Total</span>
                    <span>{formatCurrency(selectedSale.total)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Paid</span>
                    <span className="text-green-600">{formatCurrency(selectedSale.paidAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Due</span>
                    <span className={selectedSale.dueAmount > 0 ? 'text-destructive' : 'text-green-600'}>
                      {formatCurrency(selectedSale.dueAmount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedSale.notes && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Notes</h4>
                  <p className="text-sm text-muted-foreground">{selectedSale.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsViewDialogOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Sale Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this sale order? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedSale && (
            <div className="py-4">
              <p className="font-medium">{selectedSale.invoiceNumber}</p>
              <p className="text-sm text-muted-foreground">{selectedSale.customerName || 'Walk-in Customer'}</p>
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
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading}
            >
              {isLoading ? 'Deleting...' : 'Delete Sale'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}