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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { supplierService, Supplier } from '@/services/supplierService'
import { productService, Product } from '@/services/productService'
import { purchaseService, CreatePurchaseData, PurchaseItem } from '@/services/purchaseService'
import NewProduct from '@/pages/products/NewProduct'

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
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false)

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

    toast.success(`Added ${product.name} to purchase`)
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
      toast.error('Please select a supplier')
      return
    }

    if (items.length === 0) {
      toast.error('Please add at least one item')
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
        paidAmount: 0,
        dueAmount: total,
        notes: formData.notes,
        orderedAt: new Date(formData.orderedAt),
        expectedDeliveryDate: formData.expectedDeliveryDate
          ? new Date(formData.expectedDeliveryDate)
          : undefined,
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

  // Handle product created from dialog
  const handleProductCreated = (product: Product) => {
    setProducts((prev) => [...prev, product])
    handleAddItem(product)
    setIsProductDialogOpen(false)
  }

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
          Back
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
                  Order Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier">Supplier *</Label>
                  <Select
                    value={formData.supplierId}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, supplierId: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
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
                  <Label htmlFor="invoiceNumber">Invoice Number</Label>
                  <Input
                    id="invoiceNumber"
                    value={formData.invoiceNumber}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, invoiceNumber: e.target.value }))
                    }
                    placeholder="Enter invoice number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orderedAt">Order Date</Label>
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
                  <Label htmlFor="expectedDeliveryDate">Expected Delivery</Label>
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
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    placeholder="Add any additional notes..."
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
                  Purchase Items
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add Item */}
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Add Product</h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsProductDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Create New
                    </Button>
                  </div>
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
                                    ${(product.costPrice || product.price * 0.6).toFixed(2)}
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
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead className="text-right">Unit Cost</TableHead>
                          <TableHead className="text-right">Total</TableHead>
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
                              ${item.total.toFixed(2)}
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
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax ({formData.taxRate}%)</span>
                      <span>${taxAmount.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit Buttons */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/purchases')}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || items.length === 0}>
                <Check className="h-4 w-4 mr-2" />
                {isLoading ? 'Creating...' : 'Create Purchase Order'}
              </Button>
            </div>
          </div>
        </div>
      </form>

      {/* Product Creation Dialog */}
      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Product</DialogTitle>
            <DialogDescription>
              Add a new product and it will be automatically added to your purchase.
            </DialogDescription>
          </DialogHeader>
          <NewProduct
            inDialog={true}
            onProductCreated={handleProductCreated}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
