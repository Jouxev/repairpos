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
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Plus,
  Trash2,
  ArrowLeft,
  ShoppingCart,
  Calendar,
  Package,
  DollarSign,
  Search,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'
import { supplierService, Supplier } from '@/services/supplierService'
import { productService, Product } from '@/services/productService'
import { purchaseService, CreatePurchaseData, PurchaseItem } from '@/services/purchaseService'

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
  const [isLoading, setIsLoading] = useState(false)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [searchProductQuery, setSearchProductQuery] = useState('')

  // Form data
  const [formData, setFormData] = useState({
    supplierId: '',
    invoiceNumber: '',
    orderedAt: new Date().toISOString().split('T')[0],
    expectedDeliveryDate: '',
    notes: '',
    taxRate: 0,
  })

  const [items, setItems] = useState<FormItem[]>([])

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + item.total, 0)
  const taxAmount = subtotal * (formData.taxRate / 100)
  const total = subtotal + taxAmount

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [suppliersData, productsData] = await Promise.all([
        supplierService.getSuppliers({ isActive: true }),
        productService.getProducts(),
      ])
      setSuppliers(suppliersData || [])
      setProducts(productsData || [])
    } catch (error: any) {
      toast.error('Failed to load data: ' + error.message)
      setSuppliers([])
      setProducts([])
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

    toast.success(`${product.name} added to purchase`)
  }

  const handleRemoveItem = (itemId: string) => {
    setItems(items.filter((item) => item.id !== itemId))
  }

  const handleUpdateItemQuantity = (itemId: string, quantity: number) => {
    if (quantity < 1) return

    setItems(
      items.map((item) =>
        item.id === itemId
          ? { ...item, quantity, total: quantity * item.unitCost }
          : item
      )
    )
  }

  const handleUpdateItemCost = (itemId: string, unitCost: number) => {
    if (unitCost < 0) return

    setItems(
      items.map((item) =>
        item.id === itemId
          ? { ...item, unitCost, total: item.quantity * unitCost }
          : item
      )
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.supplierId) {
      toast.error('Please select a supplier')
      return
    }

    if (!formData.invoiceNumber.trim()) {
      toast.error('Please enter an invoice number')
      return
    }

    if (items.length === 0) {
      toast.error('Please add at least one item')
      return
    }

    try {
      setIsLoading(true)

      const purchaseData: CreatePurchaseData = {
        supplierId: formData.supplierId,
        invoiceNumber: formData.invoiceNumber,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitCost: item.unitCost,
          total: item.total,
        })),
        subtotal,
        taxAmount,
        total,
        orderedAt: new Date(formData.orderedAt),
        expectedDeliveryDate: formData.expectedDeliveryDate
          ? new Date(formData.expectedDeliveryDate)
          : undefined,
        notes: formData.notes,
      }

      await purchaseService.createPurchase(purchaseData)
      toast.success('Purchase order created successfully')
      navigate('/purchases')
    } catch (error: any) {
      toast.error('Failed to create purchase: ' + error.message)
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

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">New Purchase Order</h1>
          <p className="text-muted-foreground">
            Create a new purchase order from a supplier
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/purchases')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Purchases
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Purchase Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplier">Supplier *</Label>
                <Select
                  value={formData.supplierId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, supplierId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a supplier" />
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
                <Label htmlFor="invoiceNumber">Invoice Number *</Label>
                <Input
                  id="invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, invoiceNumber: e.target.value })
                  }
                  placeholder="Enter invoice number"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="orderedAt">Order Date</Label>
                <Input
                  id="orderedAt"
                  type="date"
                  value={formData.orderedAt}
                  onChange={(e) =>
                    setFormData({ ...formData, orderedAt: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expectedDeliveryDate">Expected Delivery</Label>
                <Input
                  id="expectedDeliveryDate"
                  type="date"
                  value={formData.expectedDeliveryDate}
                  onChange={(e) =>
                    setFormData({ ...formData, expectedDeliveryDate: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Additional notes about this purchase order"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Purchase Items
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add Item */}
            <div className="p-4 border rounded-lg bg-muted/50">
              <h4 className="font-medium mb-3">Add Product</h4>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search products by name or SKU..."
                  value={searchProductQuery}
                  onChange={(e) => setSearchProductQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {searchProductQuery && (
                <ScrollArea className="h-48 border rounded-md">
                  <div className="p-2 space-y-1">
                    {filteredProducts.length === 0 ? (
                      <p className="text-sm text-muted-foreground p-2">No products found</p>
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
                              <p className="text-xs text-muted-foreground">In stock: {product.quantity}</p>
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
              <div>
                <h4 className="font-medium mb-3">Items ({items.length})</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium">{item.productName}</div>
                          <div className="text-xs text-muted-foreground">{item.sku}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateItemQuantity(item.id, parseInt(e.target.value) || 1)
                            }
                            className="w-20 text-right"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitCost}
                            onChange={(e) =>
                              handleUpdateItemCost(item.id, parseFloat(e.target.value) || 0)
                            }
                            className="w-24 text-right"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.total)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Summary */}
            {items.length > 0 && (
              <div className="flex justify-end">
                <div className="w-80 space-y-2 p-4 bg-muted rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.taxRate}
                        onChange={(e) =>
                          setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })
                        }
                        className="w-16 text-right"
                      />
                      <span>%</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax Amount</span>
                    <span>{formatCurrency(taxAmount)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium text-lg">
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/purchases')}
              disabled={isLoading}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || items.length === 0 || !formData.supplierId}
            >
              {isLoading ? (
                'Creating...'
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Create Purchase Order
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
