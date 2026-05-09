import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Search,
  Percent,
  DollarSign,
  RotateCcw,
  Receipt,
  Printer,
  CreditCard,
  Banknote,
  Smartphone,
  QrCode,
  User,
  Package,
  History,
  Tag,
  Calculator,
  MoreHorizontal,
  Check,
  X,
  Save,
  FileText,
  AlertTriangle,
  ArrowLeft,
  Clock,
  Barcode,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import ActivityLogService from '@/services/activityLogService' 
import  printingService  from '@/services/printingService'

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  originalPrice?: number
  discount?: number
  
  discountType?: 'percentage' | 'fixed'
}

interface Discount {
  type: 'percentage' | 'fixed'
  value: number
  reason?: string
}

interface Tax {
  name: string
  rate: number
  enabled: boolean
}

interface PaymentMethod {
  id: string
  name: string
  icon: React.ReactNode
  enabled: boolean
}

interface SavedCart {
  id: string
  name: string
  items: CartItem[]
  createdAt: Date
}

interface ReturnItem {
  saleId: string
  itemId: string
  name: string
  originalQuantity: number
  returnQuantity: number
  price: number
  reason: string
}

export default function POS() {
  const { user } = useAuthStore()
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('products')
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [isReturnMode, setIsReturnMode] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('cash')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [savedCarts, setSavedCarts] = useState<SavedCart[]>([])
  const [isSaveCartDialogOpen, setIsSaveCartDialogOpen] = useState(false)
  const [isLoadCartDialogOpen, setIsLoadCartDialogOpen] = useState(false)
  const [cartName, setCartName] = useState('')
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([])
  const [selectedSaleForReturn, setSelectedSaleForReturn] = useState<string | null>(null)
  
  // Discount and tax states
  const [cartDiscount, setCartDiscount] = useState<Discount | null>(null)
  const [itemDiscounts, setItemDiscounts] = useState<Record<string, Discount>>({})
  const [taxes, setTaxes] = useState<Tax[]>([
    { name: 'VAT', rate: 10, enabled: true },
    { name: 'Service Tax', rate: 5, enabled: false },
  ])
  const [isDiscountDialogOpen, setIsDiscountDialogOpen] = useState(false)
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [discountValue, setDiscountValue] = useState('')
  const [discountReason, setDiscountReason] = useState('')
  const [discountTarget, setDiscountTarget] = useState<'cart' | string>('cart')

  const paymentMethods: PaymentMethod[] = [
    { id: 'cash', name: 'Cash', icon: <Banknote className="h-5 w-5" />, enabled: true },
    { id: 'card', name: 'Credit Card', icon: <CreditCard className="h-5 w-5" />, enabled: true },
    { id: 'mobile', name: 'Mobile Payment', icon: <Smartphone className="h-5 w-5" />, enabled: true },
    { id: 'qr', name: 'QR Code', icon: <QrCode className="h-5 w-5" />, enabled: true },
  ]

  // Load saved carts from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('pos_saved_carts')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setSavedCarts(parsed.map((c: any) => ({
          ...c,
          createdAt: new Date(c.createdAt)
        })))
      } catch (e) {
        console.error('Failed to load saved carts:', e)
      }
    }
  }, [])

  // Save carts to localStorage
  useEffect(() => {
    localStorage.setItem('pos_saved_carts', JSON.stringify(savedCarts))
  }, [savedCarts])

  const addToCart = (product: { id: string; name: string; price: number }) => {
    if (isReturnMode) {
      toast.error('Cannot add items in return mode')
      return
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id)
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { ...product, quantity: 1 }]
    })
    toast.success(`${product.name} added to cart`)
  }

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id))
    // Remove any item discount
    setItemDiscounts((prev) => {
      const newDiscounts = { ...prev }
      delete newDiscounts[id]
      return newDiscounts
    })
  }

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newQuantity = Math.max(1, item.quantity + delta)
          return { ...item, quantity: newQuantity }
        }
        return item
      })
    )
  }

  const clearCart = () => {
    setCart([])
    setCartDiscount(null)
    setItemDiscounts({})
    setCustomerName('')
    setCustomerPhone('')
    setNotes('')
    toast.info('Cart cleared')
  }

  const saveCart = () => {
    if (cart.length === 0) {
      toast.error('Cannot save empty cart')
      return
    }
    if (!cartName.trim()) {
      toast.error('Please enter a cart name')
      return
    }

    const newCart: SavedCart = {
      id: Date.now().toString(),
      name: cartName,
      items: [...cart],
      createdAt: new Date(),
    }

    setSavedCarts((prev) => [...prev, newCart])
    setCartName('')
    setIsSaveCartDialogOpen(false)
    toast.success('Cart saved successfully')
  }

  const loadCart = (savedCart: SavedCart) => {
    setCart(savedCart.items)
    setIsLoadCartDialogOpen(false)
    toast.success(`Cart "${savedCart.name}" loaded`)
  }

  const deleteSavedCart = (id: string) => {
    setSavedCarts((prev) => prev.filter((c) => c.id !== id))
    toast.info('Saved cart deleted')
  }

  const applyDiscount = () => {
    const value = parseFloat(discountValue)
    if (isNaN(value) || value <= 0) {
      toast.error('Please enter a valid discount value')
      return
    }

    if (discountType === 'percentage' && value > 100) {
      toast.error('Percentage discount cannot exceed 100%')
      return
    }

    const discount: Discount = {
      type: discountType,
      value,
      reason: discountReason,
    }

    if (discountTarget === 'cart') {
      setCartDiscount(discount)
    } else {
      setItemDiscounts((prev) => ({
        ...prev,
        [discountTarget]: discount,
      }))
      // Update item to show discount
      setCart((prev) =>
        prev.map((item) => {
          if (item.id === discountTarget) {
            const itemDiscount = discount.type === 'percentage'
              ? item.price * (discount.value / 100)
              : discount.value
            return {
              ...item,
              originalPrice: item.price,
              price: item.price - itemDiscount,
              discount: itemDiscount,
              discountType: discount.type,
            }
          }
          return item
        })
      )
    }

    setIsDiscountDialogOpen(false)
    setDiscountValue('')
    setDiscountReason('')
    toast.success('Discount applied successfully')
  }

  const removeDiscount = (target: 'cart' | string) => {
    if (target === 'cart') {
      setCartDiscount(null)
    } else {
      setItemDiscounts((prev) => {
        const newDiscounts = { ...prev }
        delete newDiscounts[target]
        return newDiscounts
      })
      // Restore original price
      setCart((prev) =>
        prev.map((item) => {
          if (item.id === target && item.originalPrice) {
            return {
              ...item,
              price: item.originalPrice,
              originalPrice: undefined,
              discount: undefined,
              discountType: undefined,
            }
          }
          return item
        })
      )
    }
    toast.info('Discount removed')
  }

  const calculateTotals = () => {
    let subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
    
    // Calculate cart-level discount
    let cartDiscountAmount = 0
    if (cartDiscount) {
      cartDiscountAmount = cartDiscount.type === 'percentage'
        ? subtotal * (cartDiscount.value / 100)
        : cartDiscount.value
      subtotal -= cartDiscountAmount
    }

    // Calculate taxes
    const enabledTaxes = taxes.filter((t) => t.enabled)
    const taxAmount = enabledTaxes.reduce((sum, tax) => {
      return sum + (subtotal * tax.rate) / 100
    }, 0)

    const total = subtotal + taxAmount

    return {
      subtotal: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
      cartDiscountAmount,
      taxableAmount: subtotal,
      taxAmount,
      taxes: enabledTaxes,
      total,
    }
  }

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty')
      return
    }

    const totals = calculateTotals()

    try {
      // Log the sale activity
      await ActivityLogService.logActivity('CREATE', 'SALE', {
        description: `Created sale #${Date.now()} for $${totals.total.toFixed(2)}`,
        entityType: 'sale',
        newValue: {
          total: totals.total,
          items: cart.length,
          paymentMethod: selectedPaymentMethod,
        },
      })

      // Print receipt if requested
      if (printReceipt) {
        await printingService.printThermalReceipt({
          shopName: 'RepairPro Shop',
          shopAddress: '123 Repair Street',
          shopPhone: '+1 234 567 890',
          receiptNumber: `R${Date.now()}`,
          date: new Date().toLocaleString(),
          customerName: customerName || 'Walk-in Customer',
          items: cart.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          })),
          subtotal: totals.subtotal,
          tax: totals.taxAmount,
          discount: totals.cartDiscountAmount,
          total: totals.total,
          paymentMethod:
            selectedPaymentMethod === 'cash'
              ? 'Cash'
              : selectedPaymentMethod === 'card'
              ? 'Credit Card'
              : 'Mobile Payment',
          footer: 'Thank you for your business!',
        })
      }

      toast.success('Sale completed successfully!')

      // Clear cart after successful sale
      clearCart()
      setIsCheckoutOpen(false)
      setCustomerName('')
      setCustomerPhone('')
      setNotes('')
    } catch (error) {
      console.error('Checkout error:', error)
      toast.error('Failed to complete sale')
    }
  }

  const [printReceipt, setPrintReceipt] = useState(true)
  const [quickAmount, setQuickAmount] = useState<string>('')
  const [amountReceived, setAmountReceived] = useState<string>('')

  const totals = calculateTotals()
  const changeDue = parseFloat(amountReceived || '0') - totals.total

  const quickAmounts = [10, 20, 50, 100, 200, 500]

  const openDiscountDialog = (target: 'cart' | string) => {
    setDiscountTarget(target)
    setIsDiscountDialogOpen(true)
  }

  // Mock products for demo
  const mockProducts = [
    { id: '1', name: 'iPhone Screen Protector', price: 15.99, sku: 'SCR-001', stock: 50 },
    { id: '2', name: 'Samsung Battery', price: 45.0, sku: 'BAT-001', stock: 25 },
    { id: '3', name: 'iPhone Charging Cable', price: 12.99, sku: 'CAB-001', stock: 100 },
    { id: '4', name: 'Screen Repair Kit', price: 89.99, sku: 'KIT-001', stock: 15 },
    { id: '5', name: 'Phone Case', price: 24.99, sku: 'CAS-001', stock: 75 },
    { id: '6', name: 'Earphones', price: 29.99, sku: 'EAR-001', stock: 40 },
    { id: '7', name: 'USB-C Adapter', price: 19.99, sku: 'ADA-001', stock: 60 },
    { id: '8', name: 'Wireless Charger', price: 34.99, sku: 'WCH-001', stock: 30 },
  ]

  const filteredProducts = mockProducts.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="h-[calc(100vh-8rem)]">
      <div className="flex h-full gap-4">
        {/* Products Section */}
        <div className="flex-1 flex flex-col">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Point of Sale</h1>
              <p className="text-muted-foreground">Select products to add to cart</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={isReturnMode ? 'default' : 'outline'}
                onClick={() => setIsReturnMode(!isReturnMode)}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                {isReturnMode ? 'Exit Return' : 'Return'}
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="products" className="gap-2">
                <Package className="h-4 w-4" />
                Products
              </TabsTrigger>
              <TabsTrigger value="quick" className="gap-2">
                <Tag className="h-4 w-4" />
                Quick Items
              </TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="flex-1 flex flex-col mt-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <ScrollArea className="flex-1">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
                  {filteredProducts.map((product) => (
                    <Card
                      key={product.id}
                      className="cursor-pointer hover:bg-accent transition-colors group"
                      onClick={() => addToCart(product)}
                    >
                      <CardContent className="p-4">
                        <div className="aspect-square rounded-lg bg-muted mb-3 flex items-center justify-center group-hover:bg-muted/80">
                          <Package className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="font-medium truncate">{product.name}</h3>
                        <p className="text-xs text-muted-foreground">{product.sku}</p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-lg font-bold text-primary">
                            ${product.price.toFixed(2)}
                          </p>
                          <Badge variant={product.stock > 10 ? 'default' : 'destructive'} className="text-xs">
                            {product.stock} in stock
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="quick" className="flex-1 mt-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[5, 10, 15, 20, 25, 50, 75, 100].map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    className="h-24 text-2xl font-bold"
                    onClick={() => {
                      addToCart({ id: `quick-${amount}`, name: `Quick Sale $${amount}`, price: amount })
                    }}
                  >
                    ${amount}
                  </Button>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Cart Section */}
        <Card className="w-[450px] flex flex-col">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShoppingCart className="h-5 w-5" />
                {isReturnMode ? 'Return Items' : 'Current Sale'}
              </CardTitle>
              <div className="flex items-center gap-1">
                {cart.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearCart}
                    className="h-8 w-8 text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Cart Options</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setIsSaveCartDialogOpen(true)}>
                      <Save className="h-4 w-4 mr-2" />
                      Save Cart
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsLoadCartDialogOpen(true)}>
                      <History className="h-4 w-4 mr-2" />
                      Load Cart
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setIsReturnMode(!isReturnMode)}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      {isReturnMode ? 'Exit Return Mode' : 'Process Return'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-0">
            {/* Customer Info */}
            <div className="px-4 pb-4 space-y-3 border-b">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Customer name (optional)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Phone number (optional)"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            {/* Cart Items */}
            <ScrollArea className="flex-1 px-4 py-2">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-8">
                  <ShoppingCart className="h-12 w-12 mb-3 opacity-50" />
                  <p className="text-sm">Your cart is empty</p>
                  <p className="text-xs">Select products to add them</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 p-2 rounded-lg border bg-card"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground">
                            ${item.price.toFixed(2)}
                          </p>
                          {item.originalPrice && (
                            <span className="text-xs text-green-600">
                              Saved ${((item.originalPrice - item.price) * item.quantity).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateQuantity(item.id, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center text-sm font-medium">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateQuantity(item.id, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openDiscountDialog(item.id)}
                        >
                          <Percent className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Totals Section */}
            {cart.length > 0 && (
              <div className="border-t p-4 space-y-3">
                {/* Discount Button */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Discounts</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDiscountDialog('cart')}
                    className="gap-1"
                  >
                    <Percent className="h-3 w-3" />
                    {cartDiscount ? 'Edit Discount' : 'Add Discount'}
                  </Button>
                </div>

                {/* Applied Discounts */}
                {cartDiscount && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      Cart Discount
                      {cartDiscount.reason && ` (${cartDiscount.reason})`}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">
                        -
                        {cartDiscount.type === 'percentage'
                          ? `${cartDiscount.value}%`
                          : `$${cartDiscount.value.toFixed(2)}`}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => removeDiscount('cart')}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}

                {Object.entries(itemDiscounts).map(([itemId, discount]) => {
                  const item = cart.find((i) => i.id === itemId)
                  if (!item) return null
                  return (
                    <div key={itemId} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground truncate max-w-[150px]">
                        {item.name} discount
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-green-600">
                          -
                          {discount.type === 'percentage'
                            ? `${discount.value}%`
                            : `$${discount.value.toFixed(2)}`}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => removeDiscount(itemId)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )
                })}

                <Separator />

                {/* Subtotal */}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${totals.subtotal.toFixed(2)}</span>
                </div>

                {/* Discount Amount */}
                {totals.cartDiscountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="text-green-600">-${totals.cartDiscountAmount.toFixed(2)}</span>
                  </div>
                )}

                {/* Taxes */}
                {totals.taxes.map((tax) => (
                  <div key={tax.name} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {tax.name} ({tax.rate}%)
                    </span>
                    <span>${(totals.taxableAmount * tax.rate / 100).toFixed(2)}</span>
                  </div>
                ))}

                {/* Total */}
                <div className="flex justify-between text-xl font-bold pt-2 border-t">
                  <span>Total</span>
                  <span className="text-primary">${totals.total.toFixed(2)}</span>
                </div>

                {/* Checkout Button */}
                <Button
                  className="w-full h-14 text-lg"
                  size="lg"
                  onClick={() => setIsCheckoutOpen(true)}
                >
                  <Receipt className="h-5 w-5 mr-2" />
                  {isReturnMode ? 'Process Return' : 'Checkout'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Discount Dialog */}
      <Dialog open={isDiscountDialogOpen} onOpenChange={setIsDiscountDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Apply Discount</DialogTitle>
            <DialogDescription>
              {discountTarget === 'cart'
                ? 'Apply a discount to the entire cart'
                : 'Apply a discount to this item'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Button
                variant={discountType === 'percentage' ? 'default' : 'outline'}
                onClick={() => setDiscountType('percentage')}
                className="flex-1"
              >
                <Percent className="h-4 w-4 mr-2" />
                Percentage
              </Button>
              <Button
                variant={discountType === 'fixed' ? 'default' : 'outline'}
                onClick={() => setDiscountType('fixed')}
                className="flex-1"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Fixed Amount
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Discount Value</Label>
              <div className="relative">
                {discountType === 'percentage' ? (
                  <Percent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                ) : (
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                )}
                <Input
                  type="number"
                  placeholder={discountType === 'percentage' ? '10' : '5.00'}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="pl-10"
                  min={0}
                  max={discountType === 'percentage' ? 100 : undefined}
                  step={discountType === 'percentage' ? 1 : 0.01}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Reason (Optional)</Label>
              <Input
                placeholder="e.g., Loyalty discount, damaged item..."
                value={discountReason}
                onChange={(e) => setDiscountReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDiscountDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={applyDiscount}>Apply Discount</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Cart Dialog */}
      <Dialog open={isSaveCartDialogOpen} onOpenChange={setIsSaveCartDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Cart</DialogTitle>
            <DialogDescription>
              Save the current cart for later use
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Cart Name</Label>
            <Input
              placeholder="e.g., Afternoon Sale, John Doe's Order..."
              value={cartName}
              onChange={(e) => setCartName(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveCartDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveCart}>Save Cart</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load Cart Dialog */}
      <Dialog open={isLoadCartDialogOpen} onOpenChange={setIsLoadCartDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Load Saved Cart</DialogTitle>
            <DialogDescription>
              Select a previously saved cart to load
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2 py-4">
              {savedCarts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No saved carts</p>
                </div>
              ) : (
                savedCarts.map((savedCart) => (
                  <div
                    key={savedCart.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{savedCart.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {savedCart.items.length} items · {savedCart.createdAt.toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => loadCart(savedCart)}
                      >
                        Load
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => deleteSavedCart(savedCart.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLoadCartDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              {isReturnMode ? 'Process Return' : 'Checkout'}
            </DialogTitle>
            <DialogDescription>
              {isReturnMode
                ? 'Process a return for selected items'
                : 'Review the order and select payment method'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-6">
            {/* Order Summary */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Order Summary
              </h3>
              
              <ScrollArea className="h-[200px] border rounded-lg p-3">
                <div className="space-y-2">
                  {cart.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="flex-1 truncate">
                        {item.quantity}× {item.name}
                      </span>
                      <span className="font-medium">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${totals.subtotal.toFixed(2)}</span>
                </div>
                {totals.cartDiscountAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="text-green-600">-${totals.cartDiscountAmount.toFixed(2)}</span>
                  </div>
                )}
                {totals.taxes.map((tax) => (
                  <div key={tax.name} className="flex justify-between">
                    <span className="text-muted-foreground">{tax.name} ({tax.rate}%)</span>
                    <span>${(totals.taxableAmount * tax.rate / 100).toFixed(2)}</span>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">${totals.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Payment Section */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Payment Method
              </h3>

              <div className="grid grid-cols-2 gap-2">
                {paymentMethods
                  .filter((m) => m.enabled)
                  .map((method) => (
                    <Button
                      key={method.id}
                      variant={selectedPaymentMethod === method.id ? 'default' : 'outline'}
                      className="h-16 flex flex-col items-center justify-center gap-1"
                      onClick={() => setSelectedPaymentMethod(method.id)}
                    >
                      {method.icon}
                      <span className="text-xs">{method.name}</span>
                    </Button>
                  ))}
              </div>

              {selectedPaymentMethod === 'cash' && (
                <div className="space-y-3 p-3 bg-muted rounded-lg">
                  <Label className="text-sm font-medium">Amount Received</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value)}
                      className="pl-10 text-lg"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {quickAmounts.map((amount) => (
                      <Button
                        key={amount}
                        variant="outline"
                        size="sm"
                        onClick={() => setAmountReceived(amount.toString())}
                      >
                        ${amount}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAmountReceived(totals.total.toFixed(2))}
                    >
                      Exact
                    </Button>
                  </div>
                  {parseFloat(amountReceived || '0') > 0 && (
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-sm font-medium">Change Due:</span>
                      <span className={`text-lg font-bold ${changeDue >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                        ${Math.abs(changeDue).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-sm font-medium">Notes (Optional)</Label>
                <Textarea
                  placeholder="Add any additional notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Switch
                  checked={printReceipt}
                  onCheckedChange={setPrintReceipt}
                  id="print-receipt"
                />
                <Label htmlFor="print-receipt" className="flex items-center gap-2 cursor-pointer">
                  <Printer className="h-4 w-4" />
                  Print receipt
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsCheckoutOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCheckout}
              disabled={
                cart.length === 0 ||
                (selectedPaymentMethod === 'cash' && parseFloat(amountReceived || '0') < totals.total)
              }
              className="gap-2"
            >
              <Check className="h-4 w-4" />
              {isReturnMode ? 'Process Return' : 'Complete Sale'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
