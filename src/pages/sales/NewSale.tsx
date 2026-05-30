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
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  Trash2,
  ArrowLeft,
  Search,
  Package,
  ShoppingCart,
  Calculator,
  User,
  X,
  Save,
  Receipt,
  FileSpreadsheet,
  Printer,
} from 'lucide-react'
import { toast } from 'sonner'
import { salesService, CreateSaleInput } from '@/services/salesService'
import { productService, Product } from '@/services/productService'
import CustomerSearch from '@/components/CustomerSearch'
import { Client } from '@/services/clientService'
import { buildReceiptDocument, executePreparedPrintDocument, PreparedPrintDocument } from '@/services/printHelper'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { useLocaleFormatters } from '@/hooks/useLocaleFormatters'

interface SaleItem {
  id: string
  productId: string
  product: Product
  quantity: number
  unitPrice: number
  discount: number
  tax: number
  total: number
}

interface CustomerInfo {
  name: string
  phone: string
  email: string
}

export default function NewSale() {
  const navigate = useNavigate()
  const { t } = useAppSettings()
  const { formatCurrency } = useLocaleFormatters()
  const { id } = useParams()
  const location = useLocation()
  const pathname = location.pathname
  const isEdit = pathname.includes('/edit') && !!id
  const saleId = id
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingSale, setIsLoadingSale] = useState(false)
  const [items, setItems] = useState<SaleItem[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [customer, setCustomer] = useState<CustomerInfo>({ name: '', phone: '', email: '' })
  const [selectedCustomer, setSelectedCustomer] = useState<Client | null>(null)
  const [notes, setNotes] = useState('')
  const [taxRate, setTaxRate] = useState(0)
  const [discountAmount, setDiscountAmount] = useState(0)
  const [paidAmountInput, setPaidAmountInput] = useState(0)
  const [isProformaPreviewOpen, setIsProformaPreviewOpen] = useState(false)
  const [proformaPreviewDocument, setProformaPreviewDocument] = useState<PreparedPrintDocument | null>(null)
  const [isPrintingProforma, setIsPrintingProforma] = useState(false)

  // Load products on mount
  useEffect(() => {
    loadProducts()
  }, [])

  useEffect(() => {
    if (isEdit && saleId) {
      loadSale(saleId)
    }
  }, [isEdit, saleId])

  useEffect(() => {
    setItems((currentItems) =>
      currentItems.map((item) => {
        const itemSubtotal = item.product.salePrice * item.quantity
        const itemTax = itemSubtotal * (taxRate / 100)
        return {
          ...item,
          tax: itemTax,
          total: itemSubtotal + itemTax,
        }
      })
    )
  }, [taxRate])

  const loadProducts = async () => {
    try {
      const data = await productService.getProducts({})
      setProducts(data)
      
    } catch (error: any) {
      toast.error(`${t('failedToLoadShopSettings')}: ${error.message}`)
    }
  }

  const loadSale = async (currentSaleId: string) => {
    try {
      setIsLoadingSale(true)
      const sale = await salesService.getSaleById(currentSaleId)
      if (!sale) {
        throw new Error(t('repairNotFound'))
      }

      const computedSubtotal = sale.items?.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) || 0
      const computedTaxRate = computedSubtotal > 0
        ? Number((((sale.taxAmount || 0) / computedSubtotal) * 100).toFixed(2))
        : 0

      setCustomer({
        name: sale.customerName || '',
        phone: sale.customerPhone || '',
        email: sale.customerEmail || '',
      })
      setSelectedCustomer(
        sale.customerId
          ? {
              id: sale.customerId,
              fullName: sale.customerName || t('customerInformation'),
              phone: sale.customerPhone || '',
              email: sale.customerEmail || '',
            } as Client
          : null
      )
      setNotes(sale.notes || '')
      setTaxRate(computedTaxRate)
      setDiscountAmount(sale.discountAmount || 0)
      setPaidAmountInput(sale.paidAmount || 0)
      setItems(
        (sale.items || []).map((item) => {
          const itemSubtotal = item.unitPrice * item.quantity
          const itemTax = item.tax ?? itemSubtotal * (computedTaxRate / 100)
          return {
            id: item.id,
            productId: item.productId,
            product: {
              id: item.product?.id || item.productId,
              name: item.product?.name || 'Unknown product',
              sku: item.product?.sku || '',
              unit: item.product?.unit || 'piece',
              price: item.unitPrice,
              sellingPrice: item.unitPrice,
              quantity: 0,
            } as Product,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount || 0,
            tax: itemTax,
            total: itemSubtotal + itemTax,
          }
        })
      )
    } catch (error: any) {
      toast.error(`${t('loadingSale')}: ${error.message}`)
      navigate('/sales')
    } finally {
      setIsLoadingSale(false)
    }
  }

  const filteredProducts = Array.isArray(products)
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : []

  const handleAddProduct = (product: Product) => {
    setSelectedProduct(product)
    setQuantity(1)
  }

  const handleConfirmAddItem = () => {
    if (!selectedProduct) return

    const existingItemIndex = items.findIndex((item) => item.productId === selectedProduct.id)

    if (existingItemIndex >= 0) {
      // Update existing item
      const updatedItems = [...items]
      const existingItem = updatedItems[existingItemIndex]
      const newQuantity = existingItem.quantity + quantity
      const itemTotal = newQuantity * existingItem.unitPrice * (1 - existingItem.discount / 100)
      const itemTax = itemTotal * (taxRate / 100)

      updatedItems[existingItemIndex] = {
        ...existingItem,
        quantity: newQuantity,
        total: itemTotal + itemTax,
      }
      setItems(updatedItems)
    } else {
      // Add new item
      const unitPrice = selectedProduct.sellingPrice || selectedProduct.price || 0
      const itemSubtotal = unitPrice * quantity
      const itemTax = itemSubtotal * (taxRate / 100)
      const itemTotal = itemSubtotal + itemTax

      const newItem: SaleItem = {
        id: Math.random().toString(36).substring(7),
        productId: selectedProduct.id,
        product: selectedProduct,
        quantity,
        unitPrice,
        discount: 0,
        tax: itemTax,
        total: itemTotal,
      }
      setItems([...items, newItem])
    }

    setSelectedProduct(null)
    setQuantity(1)
    setIsProductDialogOpen(false)
    setSearchQuery('')
  }

  const handleRemoveItem = (itemId: string) => {
    setItems(items.filter((item) => item.id !== itemId))
  }

  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return

    setItems(
      items.map((item) => {
        if (item.id !== itemId) return item
        const itemSubtotal = item.unitPrice * newQuantity
        const itemTax = itemSubtotal * (taxRate / 100)
        return {
          ...item,
          quantity: newQuantity,
          tax: itemTax,
          total: itemSubtotal + itemTax,
        }
      })
    )
  }

  // Calculate totals
  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.product.salePrice * item.quantity, 0)
    const tax = items.reduce((sum, item) => sum + item.tax, 0)
    const total = subtotal + tax - discountAmount
    const paid = Math.max(0, Math.min(paidAmountInput || 0, total))
    const due = Math.max(0, total - paid)

    return { subtotal, tax, discount: discountAmount, total, paid, due }
  }

  const totals = calculateTotals()

  const buildSaleDocument = async (documentType: 'A4_INVOICE' | 'A4_PROFORMA_INVOICE' = 'A4_INVOICE') => {
    return buildReceiptDocument(
      {
        shopName: '',
        receiptNumber: isEdit && saleId ? `SALE-${saleId.slice(0, 8).toUpperCase()}` : `DRAFT-${Date.now()}`,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        customerName: customer.name || t('customerInformation'),
        customerPhone: customer.phone,
        customerEmail: customer.email,
        items: items.map((item) => ({
          name: item.product.name,
          quantity: item.quantity,
          price: item.unitPrice,
          total: item.unitPrice * item.quantity,
        })),
        subtotal: totals.subtotal,
        tax: totals.tax,
        discount: totals.discount,
        total: totals.total,
        paymentMethod: 'Cash',
        footer: notes || undefined,
      },
      documentType,
    )
  }

  const handleCreateProforma = async () => {
    if (items.length === 0) {
      toast.error(t('noItemsAddedYet'))
      return
    }

    try {
      const document = await buildSaleDocument('A4_PROFORMA_INVOICE')
      setProformaPreviewDocument(document)
      setIsProformaPreviewOpen(true)
    } catch (error: any) {
      toast.error(`${t('proformaInvoicePreview')}: ${error.message}`)
    }
  }

  const handlePrintProforma = async () => {
    if (!proformaPreviewDocument) {
      return
    }

    try {
      setIsPrintingProforma(true)
      await executePreparedPrintDocument(proformaPreviewDocument)
      toast.success(t('printProformaInvoice'))
    } catch (error: any) {
      toast.error(`${t('printProformaInvoice')}: ${error.message}`)
    } finally {
      setIsPrintingProforma(false)
    }
  }

  const handleSubmit = async () => {
    if (items.length === 0) {
      toast.error(t('noItemsAddedYet'))
      return
    }

    try {
      setIsLoading(true)
      const saleData: CreateSaleInput = {
        customerId: selectedCustomer?.id,
        customerName: customer.name || t('customerInformation'),
        customerPhone: customer.phone,
        customerEmail: customer.email,
        status: 'CONFIRMED',
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          tax: item.tax,
        })),
        discountAmount: totals.discount,
        taxAmount: totals.tax,
        total: totals.total,
        paidAmount: totals.paid,
        notes,
      }

      if (isEdit && saleId) {
        await salesService.updateSaleWithItems(saleId, saleData)
        toast.success(t('updateSale'))
      } else {
        await salesService.createSale(saleData)
        toast.success(t('createSale'))
      }
      navigate('/sales')
    } catch (error: any) {
      toast.error(`${isEdit ? t('updateSale') : t('createSale')}: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingSale) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center rounded-lg border bg-card p-12 text-sm text-muted-foreground">
          {t('loadingSale')}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{isEdit ? t('editSale') : t('newSale')}</h1>
          <p className="text-muted-foreground">{isEdit ? t('updateExistingSale') : t('createNewSaleQuotation')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/sales')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('back')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    {t('items')}
                  </CardTitle>
                  <CardDescription>{t('addProductsToSale')}</CardDescription>
                </div>
                <Button onClick={() => setIsProductDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('addProduct')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">{t('noItemsAddedYet')}</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setIsProductDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('addProduct')}
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('product')}</TableHead>
                      <TableHead className="text-right">{t('price')}</TableHead>
                      <TableHead className="text-center w-32">{t('qty')}</TableHead>
                      <TableHead className="text-right">{t('total')}</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium">{item.product.name}</div>
                          <div className="text-xs text-muted-foreground">{item.product.sku}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.product.salePrice || 0)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                            >
                              -
                            </Button>
                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                            >
                              +
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.product.salePrice * item.quantity)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleRemoveItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Customer Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {t('customerInformation')}
              </CardTitle>
              <CardDescription>{t('searchExistingCustomerOrManual')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Customer Search */}
                <div className="flex gap-2">
                  <CustomerSearch 
                    onSelect={(customer) => {
                      setSelectedCustomer(customer)
                      setCustomer({
                        name: customer.fullName,
                        phone: customer.phone,
                        email: customer.email || ''
                      })
                    }}
                  >
                    <Button variant="outline" className="w-full justify-start">
                      <User className="mr-2 h-4 w-4" />
                      {selectedCustomer ? selectedCustomer.fullName : t('searchCustomer')}
                    </Button>
                  </CustomerSearch>
                  {selectedCustomer && (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        setSelectedCustomer(null)
                        setCustomer({ name: '', phone: '', email: '' })
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Manual Entry */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customerName">{t('fullName')}</Label>
                    <Input
                      id="customerName"
                      placeholder={t('customerName')}
                      value={customer.name}
                      onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerPhone">{t('phone')}</Label>
                    <Input
                      id="customerPhone"
                      placeholder={t('phoneNumberPlaceholder')}
                      value={customer.phone}
                      onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerEmail">{t('email')}</Label>
                    <Input
                      id="customerEmail"
                      placeholder={t('emailAddress')}
                      value={customer.email}
                      onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes Card */}
          <Card>
            <CardHeader>
              <CardTitle>{t('notes')}</CardTitle>
              <CardDescription>{t('additionalSaleInformation')}</CardDescription>
            </CardHeader>
            <CardContent>
              <textarea
                className="w-full min-h-[100px] p-3 rounded-md border border-input bg-background text-sm"
                placeholder={t('addPaymentOrderNotes')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Summary */}
        <div className="space-y-6">
          {/* Totals Card */}
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                {t('saleSummary')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('subtotal')}</span>
                  <span>{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('taxRate').replace(' (%)', '')}</span>
                  <span>{formatCurrency(totals.tax)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('discount')}</span>
                  <span>-{formatCurrency(totals.discount)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>{t('total')}</span>
                  <span>{formatCurrency(totals.total)}</span>
                </div>
                <div className="flex justify-between text-sm text-green-600">
                  <span>{t('paid')}</span>
                  <span>{formatCurrency(totals.paid)}</span>
                </div>
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-muted-foreground">{t('due')}</span>
                  <span className={totals.due > 0 ? 'text-destructive' : 'text-green-600'}>
                    {formatCurrency(totals.due)}
                  </span>
                </div>
              </div>

              <Separator />

              {/* Tax Rate Input */}
              <div className="space-y-2">
                <Label htmlFor="taxRate">{t('taxRate')}</Label>
                <Input
                  id="taxRate"
                  type="number"
                  min={0}
                  max={100}
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                />
              </div>

              {/* Discount Input */}
              <div className="space-y-2">
                <Label htmlFor="discountAmount">{t('discountAmount')}</Label>
                <Input
                  id="discountAmount"
                  type="number"
                  min={0}
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="paidAmount">{t('paidAmount')}</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPaidAmountInput(totals.total)}
                    disabled={totals.total <= 0}
                  >
                    {t('fullyPaid')}
                  </Button>
                </div>
                <Input
                  id="paidAmount"
                  type="number"
                  min={0}
                  step="0.01"
                  value={paidAmountInput}
                  onChange={(e) => setPaidAmountInput(parseFloat(e.target.value) || 0)}
                />
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                size="lg"
                onClick={handleCreateProforma}
                disabled={items.length === 0}
              >
                <FileSpreadsheet className="h-5 w-5 mr-2" />
                {t('createProformaInvoice')}
              </Button>
              <Button
                className="w-full"
                size="lg"
                onClick={handleSubmit}
                disabled={isLoading || items.length === 0}
              >
                <Receipt className="h-5 w-5 mr-2" />
                {isLoading ? (isEdit ? t('saving') : t('completingSetup')) : (isEdit ? t('updateSale') : t('createSale'))}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/sales')}
              >
                {t('cancel')}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Product Selection Dialog */}
      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{t('addProductDialogTitle')}</DialogTitle>
            <DialogDescription>{t('searchAndSelectProduct')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('searchProductsByNameOrSku')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {selectedProduct ? (
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium">{selectedProduct.name}</h4>
                    <p className="text-sm text-muted-foreground">SKU: {selectedProduct.sku}</p>
                    <p className="text-lg font-bold mt-1">
                      {formatCurrency(selectedProduct.salePrice  || 0)}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedProduct(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-4 flex items-center gap-4">
                  <Label>{t('quantityLabel')}</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      -
                    </Button>
                    <Input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 text-center"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setQuantity(quantity + 1)}
                    >
                      +
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <ScrollArea className="h-[300px] border rounded-md">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead>{t('product')}</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">{t('price')}</TableHead>
                      <TableHead className="text-right">{t('stockLevel')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          {t('noProductsFound')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProducts.map((product) => (
                        <TableRow
                          key={product.id}
                          className="cursor-pointer hover:bg-muted"
                          onClick={() => handleAddProduct(product)}
                        >
                          <TableCell>
                            <div className="font-medium">{product.name}</div>
                          </TableCell>
                          <TableCell>{product.sku || '-'}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(product.salePrice  || 0)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={product.quantity > 0 ? 'default' : 'destructive'}>
                              {product.quantity}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsProductDialogOpen(false)
              setSelectedProduct(null)
              setSearchQuery('')
            }}>
              {t('cancel')}
            </Button>
            {selectedProduct && (
              <Button onClick={handleConfirmAddItem}>
                <Plus className="h-4 w-4 mr-2" />
                {t('addItem')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isProformaPreviewOpen} onOpenChange={setIsProformaPreviewOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{t('proformaInvoicePreview')}</DialogTitle>
            <DialogDescription>
              {t('previewProformaTemplate')}
            </DialogDescription>
          </DialogHeader>
          <iframe
            title="Proforma Invoice Preview"
            srcDoc={proformaPreviewDocument?.html || ''}
            className="h-[70vh] w-full rounded-xl border bg-white"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProformaPreviewOpen(false)}>
              {t('closeRegister').replace('Register', '').trim() || t('cancel')}
            </Button>
            <Button onClick={handlePrintProforma} disabled={!proformaPreviewDocument || isPrintingProforma}>
              <Printer className="mr-2 h-4 w-4" />
              {isPrintingProforma ? t('printing') : t('printProformaInvoice')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
