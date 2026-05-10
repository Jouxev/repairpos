import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
} from 'lucide-react'
import { toast } from 'sonner'
import { salesService, CreateSaleInput } from '@/services/salesService'
import { productService, Product } from '@/services/productService'

// Helper function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

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
  const [isLoading, setIsLoading] = useState(false)
  const [items, setItems] = useState<SaleItem[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [customer, setCustomer] = useState<CustomerInfo>({ name: '', phone: '', email: '' })
  const [notes, setNotes] = useState('')
  const [taxRate, setTaxRate] = useState(0)
  const [discountAmount, setDiscountAmount] = useState(0)

  // Load products on mount
  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      const data = await productService.getProducts({})
      setProducts(data)
    } catch (error: any) {
      toast.error('Failed to load products: ' + error.message)
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
    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    const tax = items.reduce((sum, item) => sum + item.tax, 0)
    const total = subtotal + tax - discountAmount
    const paid = total - (total - subtotal - tax + discountAmount > 0 ? 0 : total)
    const due = Math.max(0, total - paid)

    return { subtotal, tax, discount: discountAmount, total, paid, due }
  }

  const totals = calculateTotals()

  const handleSubmit = async () => {
    if (items.length === 0) {
      toast.error('Please add at least one item')
      return
    }

    try {
      setIsLoading(true)
      const saleData: CreateSaleInput = {
        customerId: undefined,
        customerName: customer.name || 'Walk-in Customer',
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

      await salesService.createSale(saleData)
      toast.success('Sale created successfully')
      navigate('/sales')
    } catch (error: any) {
      toast.error('Failed to create sale: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Sale</h1>
          <p className="text-muted-foreground">Create a new sale or quotation</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/sales')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
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
                    Items
                  </CardTitle>
                  <CardDescription>Add products to the sale</CardDescription>
                </div>
                <Button onClick={() => setIsProductDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No items added yet</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setIsProductDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-center w-32">Qty</TableHead>
                      <TableHead className="text-right">Total</TableHead>
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
                          {formatCurrency(item.unitPrice)}
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
                          {formatCurrency(item.total)}
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
                Customer Information
              </CardTitle>
              <CardDescription>Optional customer details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Name</Label>
                  <Input
                    id="customerName"
                    placeholder="Customer name"
                    value={customer.name}
                    onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerPhone">Phone</Label>
                  <Input
                    id="customerPhone"
                    placeholder="Phone number"
                    value={customer.phone}
                    onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerEmail">Email</Label>
                  <Input
                    id="customerEmail"
                    placeholder="Email address"
                    value={customer.email}
                    onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes Card */}
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
              <CardDescription>Additional information about this sale</CardDescription>
            </CardHeader>
            <CardContent>
              <textarea
                className="w-full min-h-[100px] p-3 rounded-md border border-input bg-background text-sm"
                placeholder="Enter any notes here..."
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
                Sale Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatCurrency(totals.tax)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span>-{formatCurrency(totals.discount)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(totals.total)}</span>
                </div>
              </div>

              <Separator />

              {/* Tax Rate Input */}
              <div className="space-y-2">
                <Label htmlFor="taxRate">Tax Rate (%)</Label>
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
                <Label htmlFor="discountAmount">Discount Amount</Label>
                <Input
                  id="discountAmount"
                  type="number"
                  min={0}
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                />
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-2">
              <Button
                className="w-full"
                size="lg"
                onClick={handleSubmit}
                disabled={isLoading || items.length === 0}
              >
                <Receipt className="h-5 w-5 mr-2" />
                {isLoading ? 'Creating...' : 'Create Sale'}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/sales')}
              >
                Cancel
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Product Selection Dialog */}
      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Add Product</DialogTitle>
            <DialogDescription>Search and select a product to add</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products by name or SKU..."
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
                      {formatCurrency(selectedProduct.sellingPrice || selectedProduct.price || 0)}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedProduct(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-4 flex items-center gap-4">
                  <Label>Quantity:</Label>
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
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No products found
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
                            {formatCurrency(product.sellingPrice || product.price || 0)}
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
              Cancel
            </Button>
            {selectedProduct && (
              <Button onClick={handleConfirmAddItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
