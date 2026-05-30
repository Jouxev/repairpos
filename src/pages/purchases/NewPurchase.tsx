import { useState, useEffect } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Plus,
  Trash2,
  ArrowLeft,
  ShoppingCart,
  Package,
  Search,
  Check,
  FileText,
  Printer,
} from 'lucide-react'
import { toast } from 'sonner'
import { supplierService, Supplier } from '@/services/supplierService'
import { productService, Product } from '@/services/productService'
import { purchaseService, CreatePurchaseData } from '@/services/purchaseService'
import NewProduct from '@/pages/products/NewProduct'
import { buildPurchaseOrderDocument, executePreparedPrintDocument, PreparedPrintDocument } from '@/services/printHelper'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { useLocaleFormatters } from '@/hooks/useLocaleFormatters'

interface FormItem {
  id: string
  productId: string
  productName: string
  sku?: string
  quantity: number
  unitCost: number
  total: number
}

export default function NewPurchase() {
  const navigate = useNavigate()
  const { t } = useAppSettings()
  const { formatCurrency } = useLocaleFormatters()
  const { id } = useParams()
  const location = useLocation()
  const pathname = location.pathname
  const isEdit = pathname.includes('/edit') && !!id
  const purchaseId = id
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingPurchase, setIsLoadingPurchase] = useState(false)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [searchProductQuery, setSearchProductQuery] = useState('')
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false)

  // Form data
  const [formData, setFormData] = useState({
    supplierId: '',
    invoiceNumber: '',
    orderedAt: new Date().toISOString().split('T')[0],
    expectedDeliveryDate: '',
    notes: '',
    taxRate: 0,
    paidAmount: 0,
  })

  const [items, setItems] = useState<FormItem[]>([])
  const [updateStock, setUpdateStock] = useState(true)
  const [isOrderRequestPreviewOpen, setIsOrderRequestPreviewOpen] = useState(false)
  const [orderRequestDocument, setOrderRequestDocument] = useState<PreparedPrintDocument | null>(null)
  const [isPrintingOrderRequest, setIsPrintingOrderRequest] = useState(false)

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + item.total, 0)
  const taxAmount = subtotal * (formData.taxRate / 100)
  const total = subtotal + taxAmount
  const paidAmount = Math.max(0, Math.min(Number(formData.paidAmount) || 0, total))
  const dueAmount = Math.max(0, total - paidAmount)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (isEdit && purchaseId) {
      loadPurchase(purchaseId)
    }
  }, [isEdit, purchaseId])

  const loadData = async () => {
    try {
      const [suppliersData, productsData] = await Promise.all([
        supplierService.getSuppliers({ isActive: true }),
        productService.getProducts(),
      ])
      setSuppliers(suppliersData || [])
      setProducts(productsData || [])

    } catch (error: any) {
      toast.error(`${t('unableToLoadReportData')}: ${error.message}`)
      setSuppliers([])
      setProducts([])
    }
  }

  const loadPurchase = async (currentPurchaseId: string) => {
    try {
      setIsLoadingPurchase(true)
      const purchase = await purchaseService.getPurchaseById(currentPurchaseId)

      setFormData({
        supplierId: purchase.supplierId || '',
        invoiceNumber: purchase.invoiceNumber || '',
        orderedAt: purchase.orderedAt ? new Date(purchase.orderedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        expectedDeliveryDate: purchase.expectedDeliveryDate
          ? new Date(purchase.expectedDeliveryDate).toISOString().split('T')[0]
          : '',
        notes: purchase.notes || '',
        taxRate: purchase.subtotal > 0 ? Number((((purchase.taxAmount || 0) / purchase.subtotal) * 100).toFixed(2)) : 0,
        paidAmount: purchase.paidAmount || 0,
      })

      setItems(
        (purchase.items || []).map((item) => ({
          id: item.id,
          productId: item.productId,
          productName: item.product?.name || t('product'),
          sku: item.product?.sku || '',
          quantity: item.quantity,
          unitCost: item.unitCost,
          total: item.total,
        }))
      )
      setUpdateStock(false)
    } catch (error: any) {
      toast.error(`${t('loadingPurchase')}: ${error.message}`)
      navigate('/purchases')
    } finally {
      setIsLoadingPurchase(false)
    }
  }

  const handleAddItem = (product: Product) => {
    const existingItem = items.find((item) => item.productId === product.id)

    if (existingItem) {
      // Update quantity if already exists
      setItems(
        items.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                total: (item.quantity + 1) * item.unitCost,
              }
            : item
        )
      )
    } else {
      // Add new item
      const newItem: FormItem = {
        id: Date.now().toString(),
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        quantity: 1,
        unitCost: product.costPrice || product.price * 0.6,
        total: product.costPrice || product.price * 0.6,
      }
      setItems([...items, newItem])
    }

    toast.success(`${product.name} ${t('add')}`)
  }

  const handleRemoveItem = (itemId: string) => {
    setItems(items.filter((item) => item.id !== itemId))
  }

  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return

    setItems(
      items.map((item) =>
        item.id === itemId
          ? { ...item, quantity: newQuantity, total: newQuantity * item.unitCost }
          : item
      )
    )
  }

  const handleUpdateUnitCost = (itemId: string, newUnitCost: number) => {
    if (newUnitCost < 0) return

    setItems(
      items.map((item) =>
        item.id === itemId
          ? { ...item, unitCost: newUnitCost, total: item.quantity * newUnitCost }
          : item
      )
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.supplierId) {
      toast.error(t('selectSupplier'))
      return
    }

    if (items.length === 0) {
      toast.error(t('noItemsAddedYet'))
      return
    }

    try {
      setIsLoading(true)

      const purchaseData: CreatePurchaseData = {
        invoiceNumber: formData.invoiceNumber,
        supplierId: formData.supplierId,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitCost: item.unitCost,
          total: item.total,
        })),
        subtotal,
        taxAmount,
        total,
        paidAmount,
        dueAmount,
        notes: formData.notes,
        orderedAt: new Date(formData.orderedAt),
        expectedDeliveryDate: formData.expectedDeliveryDate
          ? new Date(formData.expectedDeliveryDate)
          : undefined,
        updateStock,
      }

      if (isEdit && purchaseId) {
        await purchaseService.updatePurchaseWithItems(purchaseId, purchaseData)
        toast.success(t('updatePurchaseOrder'))
      } else {
        await purchaseService.createPurchase(purchaseData)
        toast.success(t('createPurchaseOrder'))
      }
      navigate('/purchases')
    } catch (error: any) {
      toast.error(`${isEdit ? t('updatePurchaseOrder') : t('createPurchaseOrder')}: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredProducts = Array.isArray(products)
    ? products.filter(
        (product) =>
          product.name.toLowerCase().includes(searchProductQuery.toLowerCase()) ||
          product.sku?.toLowerCase().includes(searchProductQuery.toLowerCase())
      )
    : []

  // Handle product created from dialog
  const handleProductCreated = (product: Product) => {
    setProducts((prev) => [...prev, product])
    handleAddItem(product)
    setIsProductDialogOpen(false)
  }

  const handleCreateOrderRequest = async () => {
    if (!formData.supplierId) {
      toast.error(t('selectSupplier'))
      return
    }

    if (items.length === 0) {
      toast.error(t('noItemsAddedYet'))
      return
    }

    try {
      const supplier = suppliers.find((item) => item.id === formData.supplierId)
      const document = await buildPurchaseOrderDocument({
        orderNumber: formData.invoiceNumber || `PO-${Date.now()}`,
        date: formData.orderedAt,
        expectedDeliveryDate: formData.expectedDeliveryDate || undefined,
        supplierName: supplier?.name,
        supplierPhone: supplier?.phone,
        supplierEmail: supplier?.email,
        supplierAddress: supplier?.address,
        items: items.map((item) => ({
          name: item.productName,
          quantity: item.quantity,
          unitCost: item.unitCost,
          total: item.total,
        })),
        subtotal,
        tax: taxAmount,
        total,
        notes: formData.notes || undefined,
        status: isEdit ? 'Updated' : 'Draft',
      })
      setOrderRequestDocument(document)
      setIsOrderRequestPreviewOpen(true)
    } catch (error: any) {
      toast.error(`${t('orderRequestPreview')}: ${error.message}`)
    }
  }

  const handlePrintOrderRequest = async () => {
    if (!orderRequestDocument) {
      return
    }

    try {
      setIsPrintingOrderRequest(true)
      await executePreparedPrintDocument(orderRequestDocument)
      toast.success(t('printOrderRequest'))
    } catch (error: any) {
      toast.error(`${t('printOrderRequest')}: ${error.message}`)
    } finally {
      setIsPrintingOrderRequest(false)
    }
  }

  if (isLoadingPurchase) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center rounded-lg border bg-card p-12 text-sm text-muted-foreground">
          {t('loadingPurchase')}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{isEdit ? t('editPurchaseOrder') : t('newPurchaseOrder')}</h1>
          <p className="text-muted-foreground">
            {isEdit ? t('updateExistingPurchaseOrder') : t('createPurchaseOrderFromSupplier')}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/purchases')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('back')}
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Order Details */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  {t('orderDetails')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier">{t('suppliers')} *</Label>
                  <Select
                    value={formData.supplierId}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, supplierId: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectSupplier')} />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoiceNumber">{t('invoiceNumber')}</Label>
                  <Input
                    id="invoiceNumber"
                    value={formData.invoiceNumber}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, invoiceNumber: e.target.value }))
                    }
                    placeholder={t('enterInvoiceNumber')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orderedAt">{t('orderDate')}</Label>
                  <Input
                    id="orderedAt"
                    type="date"
                    value={formData.orderedAt}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, orderedAt: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expectedDeliveryDate">{t('expectedDelivery')}</Label>
                  <Input
                    id="expectedDeliveryDate"
                    type="date"
                    value={formData.expectedDeliveryDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, expectedDeliveryDate: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">{t('notes')}</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    placeholder={t('addAdditionalNotes')}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Items */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  {t('purchaseItems')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add Item */}
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">{t('addProduct')}</h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsProductDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {t('createNew')}
                    </Button>
                  </div>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder={t('searchProductsByNameOrSku')}
                      value={searchProductQuery}
                      onChange={(e) => setSearchProductQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {searchProductQuery && (
                    <ScrollArea className="h-48 border rounded-md">
                      <div className="p-2 space-y-1">
                        {filteredProducts.length === 0 ? (
                          <p className="text-sm text-muted-foreground p-2">{t('noProductsFound')}</p>
                        ) : (
                          filteredProducts.map((product) => (
                            <button
                              key={product.id}
                              type="button"
                              onClick={() => {
                                handleAddItem(product)
                                setSearchProductQuery('')
                              }}
                              className="w-full text-left p-2 hover:bg-accent rounded-md transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">{product.name}</p>
                                  <p className="text-xs text-muted-foreground">{product.sku}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium">
                                    {formatCurrency(product.costPrice || product.price * 0.6)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{t('inStockText', { count: product.quantity })}</p>
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  )}
                </div>

                {/* Items Table */}
                {items.length > 0 && (
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('product')}</TableHead>
                          <TableHead className="text-right">{t('quantity')}</TableHead>
                          <TableHead className="text-right">{t('unitCost')}</TableHead>
                          <TableHead className="text-right">{t('total')}</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{item.productName}</p>
                                {item.sku && (
                                  <p className="text-xs text-muted-foreground">{item.sku}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleUpdateQuantity(item.id, parseInt(e.target.value) || 1)
                                }
                                className="w-20 ml-auto"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unitCost}
                                onChange={(e) =>
                                  handleUpdateUnitCost(item.id, parseFloat(e.target.value) || 0)
                                }
                                className="w-24 ml-auto"
                              />
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(item.total)}
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveItem(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Summary */}
                <div className="flex justify-end">
                  <div className="w-72 space-y-2">
                    <div className="space-y-2 rounded-lg border p-3">
                      <Label htmlFor="purchase-paid-amount">{t('paidAmount')}</Label>
                      <Input
                        id="purchase-paid-amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.paidAmount}
                        onChange={(e) =>
                          setFormData((current) => ({
                            ...current,
                            paidAmount: parseFloat(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('subtotal')}</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('taxRate')} ({formData.taxRate}%)</span>
                      <span>{formatCurrency(taxAmount)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>{t('total')}</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-green-600">
                      <span>{t('paid')}</span>
                      <span>{formatCurrency(paidAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium text-destructive">
                      <span>{t('totalSupplierBalance')}</span>
                      <span>{formatCurrency(dueAmount)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {!isEdit && (
              <div className="flex items-start space-x-2 p-4 bg-muted/50 rounded-lg">
                <Checkbox
                  id="updateStock"
                  checked={updateStock}
                  onCheckedChange={(checked) => setUpdateStock(checked as boolean)}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor="updateStock"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {t('updateStockQuantity')}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t('updateStockHelp')}
                  </p>
                </div>
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCreateOrderRequest}
                disabled={isLoading || items.length === 0}
              >
                <FileText className="h-4 w-4 mr-2" />
                {t('createOrderRequest')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/purchases')}
                disabled={isLoading}
              >
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={isLoading || items.length === 0}>
                <Check className="h-4 w-4 mr-2" />
                {isLoading ? t('saving') : (isEdit ? t('updatePurchaseOrder') : t('createPurchaseOrder'))}
              </Button>
            </div>
          </div>
        </div>
      </form>

      {/* Product Creation Dialog */}
      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('createNewProduct')}</DialogTitle>
            <DialogDescription>
              {t('addNewProductAutoAdd')}
            </DialogDescription>
          </DialogHeader>
          <NewProduct
            inDialog={true}
            onProductCreated={handleProductCreated}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isOrderRequestPreviewOpen} onOpenChange={setIsOrderRequestPreviewOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{t('orderRequestPreview')}</DialogTitle>
            <DialogDescription>
              {t('previewOrderRequestTemplate')}
            </DialogDescription>
          </DialogHeader>
          <iframe
            title="Order Request Preview"
            srcDoc={orderRequestDocument?.html || ''}
            className="h-[70vh] w-full rounded-xl border bg-white"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOrderRequestPreviewOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handlePrintOrderRequest} disabled={!orderRequestDocument || isPrintingOrderRequest}>
              <Printer className="mr-2 h-4 w-4" />
              {isPrintingOrderRequest ? t('printing') : t('printOrderRequest')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
