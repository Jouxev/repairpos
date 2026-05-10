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
  Check,
  X,
  Truck,
  CreditCard,
  Building2,
  ArrowRight,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import { purchaseService, Purchase, PurchaseStatus, PaymentStatus } from '@/services/purchaseService'
import { supplierService, Supplier } from '@/services/supplierService'

const statusColors: Record<PurchaseStatus, string> = {
  ORDERED: 'bg-blue-500',
  PARTIAL: 'bg-yellow-500',
  RECEIVED: 'bg-green-500',
  CANCELLED: 'bg-red-500',
}

const paymentStatusColors: Record<PaymentStatus, string> = {
  PENDING: 'bg-yellow-500',
  PARTIAL: 'bg-orange-500',
  PAID: 'bg-green-500',
}

export default function PurchasesList() {
  const navigate = useNavigate()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [filteredPurchases, setFilteredPurchases] = useState<Purchase[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('all')
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(false)

  // Dialog states
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isReceiveDialogOpen, setIsReceiveDialogOpen] = useState(false)
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    filterPurchases()
  }, [purchases, searchQuery, selectedStatus, selectedPaymentStatus, selectedSupplier])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [purchasesData, suppliersData] = await Promise.all([
        purchaseService.getPurchases(),
        supplierService.getSuppliers(),
      ])
      setPurchases(purchasesData)
      setSuppliers(suppliersData)
    } catch (error: any) {
      toast.error('Failed to load data: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const filterPurchases = () => {
    let filtered = purchases

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          p.invoiceNumber?.toLowerCase().includes(query) ||
          p.supplier?.name?.toLowerCase().includes(query)
      )
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter((p) => p.status === selectedStatus)
    }

    if (selectedPaymentStatus !== 'all') {
      filtered = filtered.filter((p) => p.paymentStatus === selectedPaymentStatus)
    }

    if (selectedSupplier !== 'all') {
      filtered = filtered.filter((p) => p.supplierId === selectedSupplier)
    }

    setFilteredPurchases(filtered)
  }

  const handleDelete = async () => {
    if (!selectedPurchase) return

    try {
      setIsLoading(true)
      await purchaseService.deletePurchase(selectedPurchase.id)
      toast.success('Purchase deleted successfully')
      setIsDeleteDialogOpen(false)
      setSelectedPurchase(null)
      await loadData()
    } catch (error: any) {
      toast.error('Failed to delete purchase: ' + error.message)
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

  const getStatusBadge = (status: PurchaseStatus) => {
    const colors: Record<PurchaseStatus, string> = {
      ORDERED: 'bg-blue-100 text-blue-800 border-blue-200',
      PARTIAL: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      RECEIVED: 'bg-green-100 text-green-800 border-green-200',
      CANCELLED: 'bg-red-100 text-red-800 border-red-200',
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
          <h1 className="text-3xl font-bold tracking-tight">Purchases</h1>
          <p className="text-muted-foreground">
            Manage purchase orders and stock receiving
          </p>
        </div>
        <Button onClick={() => navigate('/purchases/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Purchase
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by invoice or supplier..."
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
                <SelectItem value="ORDERED">Ordered</SelectItem>
                <SelectItem value="PARTIAL">Partial</SelectItem>
                <SelectItem value="RECEIVED">Received</SelectItem>
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
            <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Purchases Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Purchase Orders ({filteredPurchases.length})</CardTitle>
              <CardDescription>
                Manage purchase orders and stock receiving
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
                  <TableHead>Supplier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Due</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPurchases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <ShoppingCart className="h-8 w-8" />
                        <p>No purchases found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPurchases.map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell>
                        <div className="font-medium">{purchase.invoiceNumber}</div>
                        <div className="text-xs text-muted-foreground">
                          {purchase.items?.length || 0} items
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{purchase.supplier?.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {purchase.supplier?.phone}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(purchase.status)}</TableCell>
                      <TableCell>{getPaymentStatusBadge(purchase.paymentStatus)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(purchase.total)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={purchase.dueAmount > 0 ? 'text-destructive' : 'text-green-600'}>
                          {formatCurrency(purchase.dueAmount)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(purchase.orderedAt)}
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
                            <DropdownMenuItem onClick={() => openViewDialog(purchase)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {purchase.status !== 'RECEIVED' && purchase.status !== 'CANCELLED' && (
                              <DropdownMenuItem onClick={() => openReceiveDialog(purchase)}>
                                <Truck className="h-4 w-4 mr-2" />
                                Receive Stock
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => navigate(`/purchases/edit/${purchase.id}`)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => openDeleteDialog(purchase)}
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
            <DialogTitle>Purchase Order Details</DialogTitle>
            <DialogDescription>
              View complete purchase order information
            </DialogDescription>
          </DialogHeader>
          {selectedPurchase && (
            <div className="space-y-6 py-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-bold">{selectedPurchase.invoiceNumber}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    {getStatusBadge(selectedPurchase.status)}
                    {getPaymentStatusBadge(selectedPurchase.paymentStatus)}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Order Date</p>
                  <p className="font-medium">{formatDate(selectedPurchase.orderedAt)}</p>
                  {selectedPurchase.expectedDeliveryDate && (
                    <>
                      <p className="text-sm text-muted-foreground mt-2">Expected Delivery</p>
                      <p className="font-medium">{formatDate(selectedPurchase.expectedDeliveryDate)}</p>
                    </>
                  )}
                </div>
              </div>

              {/* Supplier Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Supplier
                  </h4>
                  <p className="font-medium">{selectedPurchase.supplier?.name}</p>
                  {selectedPurchase.supplier?.phone && (
                    <p className="text-sm text-muted-foreground">{selectedPurchase.supplier.phone}</p>
                  )}
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Items
                  </h4>
                  <p className="font-medium">{selectedPurchase.items?.length || 0} products</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedPurchase.items?.reduce((sum: number, item: any) => sum + item.quantity, 0)} total units
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h4 className="font-medium mb-3">Purchase Items</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPurchase.items?.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium">{item.product?.name}</div>
                          <div className="text-xs text-muted-foreground">{item.product?.sku}</div>
                        </TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unitCost)}</TableCell>
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
                    <span>{formatCurrency(selectedPurchase.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span>{formatCurrency(selectedPurchase.taxAmount)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <span>Total</span>
                    <span>{formatCurrency(selectedPurchase.total)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Paid</span>
                    <span className="text-green-600">{formatCurrency(selectedPurchase.paidAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Due</span>
                    <span className={selectedPurchase.dueAmount > 0 ? 'text-destructive' : 'text-green-600'}>
                      {formatCurrency(selectedPurchase.dueAmount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedPurchase.notes && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Notes</h4>
                  <p className="text-sm text-muted-foreground">{selectedPurchase.notes}</p>
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
                {selectedPurchase.status !== 'RECEIVED' && selectedPurchase.status !== 'CANCELLED' && (
                  <Button onClick={() => openReceiveDialog(selectedPurchase)}>
                    <Truck className="h-4 w-4 mr-2" />
                    Receive Stock
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Purchase Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this purchase order? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedPurchase && (
            <div className="py-4">
              <p className="font-medium">{selectedPurchase.invoiceNumber}</p>
              <p className="text-sm text-muted-foreground">{selectedPurchase.supplier?.name}</p>
              <p className="text-lg font-medium mt-2">{formatCurrency(selectedPurchase.total)}</p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setSelectedPurchase(null)
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
              {isLoading ? 'Deleting...' : 'Delete Purchase'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
