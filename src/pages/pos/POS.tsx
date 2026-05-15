import { useState, useEffect, useCallback, useRef } from 'react'
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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
  Scan,
  Keyboard,
  Trash,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { activityLogService } from '@/services/activityLogService'
import { printReceipt } from '@/services/printHelper'
import CustomerSearch from '@/components/CustomerSearch'
import { Client } from '@/services/clientService'
import { productService } from '@/services/productService'

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  originalPrice?: number
  discount?: number
  discountType?: 'percentage' | 'fixed'
  stock?: number
  sku?: string
}

interface Cart {
  id: string
  name: string
  items: CartItem[]
  customer: Client | null
  createdAt: Date
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

interface Product {
  id: string
  name: string
  price: number
  sku: string
  quantity: number
  barcode?: string
}

export default function POS() {
  const { user } = useAuthStore()
  
  // Multi-cart state
  const [carts, setCarts] = useState<Cart[]>([
    { id: '1', name: 'Cart 1', items: [], customer: null, createdAt: new Date() }
  ])
  const [activeCartId, setActiveCartId] = useState<string>('1')
  const [isMultiCartEnabled, setIsMultiCartEnabled] = useState(false)
  
  // Search/Scan mode
  const [searchMode, setSearchMode] = useState<'search' | 'barcode'>('search')
  const [searchQuery, setSearchQuery] = useState('')
  const [barcodeInput, setBarcodeInput] = useState('')
  const [barcodeQty, setBarcodeQty] = useState<number>(1)
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  
  // Refs for keyboard handling
  const barcodeInputRef = useRef<HTMLInputElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const qtyInputRef = useRef<HTMLInputElement>(null)
  const barcodeScanTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Other states
  const [activeTab, setActiveTab] = useState('products')
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [isReturnMode, setIsReturnMode] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('cash')
  const [notes, setNotes] = useState('')
  const [printReceipt, setPrintReceipt] = useState(true)
  const [amountReceived, setAmountReceived] = useState<string>('')
  const [selectedCustomer, setSelectedCustomer] = useState<Client | null>(null)
  
  // Discount states
  const [cartDiscount, setCartDiscount] = useState<Discount | null>(null)
  const [itemDiscounts, setItemDiscounts] = useState<Record<string, Discount>>({})
  const [isDiscountDialogOpen, setIsDiscountDialogOpen] = useState(false)
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [discountValue, setDiscountValue] = useState('')
  const [discountReason, setDiscountReason] = useState('')
  const [discountTarget, setDiscountTarget] = useState<'cart' | string>('cart')
  
  const [taxes, setTaxes] = useState<Tax[]>([
    { name: 'VAT', rate: 10, enabled: true },
    { name: 'Service Tax', rate: 5, enabled: false },
  ])

  const paymentMethods: PaymentMethod[] = [
    { id: 'cash', name: 'Cash', icon: <Banknote className="h-5 w-5" />, enabled: true },
    { id: 'card', name: 'Credit Card', icon: <CreditCard className="h-5 w-5" />, enabled: true },
    { id: 'mobile', name: 'Mobile Payment', icon: <Smartphone className="h-5 w-5" />, enabled: true },
    { id: 'qr', name: 'QR Code', icon: <QrCode className="h-5 w-5" />, enabled: true },
  ]

  const quickAmounts = [10, 20, 50, 100, 200, 500]

  // Load products from database
  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      const result = await productService.getProducts()
      // Handle both array response and object with data property
      const data = Array.isArray(result) ? result : result?.data || []
      setProducts(data.map((p: any) => ({
        id: p.id,
        name: p.name,
        price: p.salePrice || 0,
        sku: p.sku || '',
        quantity: p.quantity || 0,
        barcode: p.barcode
      })))
    } catch (error) {
      console.error('Failed to load products:', error)
      toast.error('Failed to load products')
    }
  }

  // Filter products based on search
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredProducts(filtered)
    } else {
      setFilteredProducts(products)
    }
  }, [searchQuery, products])

  // Keyboard event handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F2 - Toggle between search and barcode
      if (e.key === 'F2') {
        e.preventDefault()
        setSearchMode(prev => prev === 'search' ? 'barcode' : 'search')
        toast.info(`Switched to ${searchMode === 'search' ? 'barcode' : 'search'} mode`)
      }

      // Number keys 0-9 for quantity when in barcode mode
      if (searchMode === 'barcode' && /^[0-9]$/.test(e.key) && document.activeElement !== barcodeInputRef.current) {
        e.preventDefault()
        setBarcodeQty(prev => {
          const newQty = parseInt(prev.toString() + e.key)
          return newQty > 999 ? 999 : newQty
        })
      }

      // + and - keys for quantity
      if (searchMode === 'barcode' && (e.key === '+' || e.key === '-')) {
        e.preventDefault()
        setBarcodeQty(prev => {
          if (e.key === '+') return prev < 999 ? prev + 1 : 999
          return prev > 1 ? prev - 1 : 1
        })
      }

      // Enter key handling
      if (e.key === 'Enter') {
        if (searchMode === 'barcode' && barcodeInputRef.current === document.activeElement) {
          e.preventDefault()
          handleBarcodeScan()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [searchMode, barcodeInput, barcodeQty])

  // Focus management
  useEffect(() => {
    if (searchMode === 'barcode' && barcodeInputRef.current) {
      barcodeInputRef.current.focus()
    } else if (searchMode === 'search' && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [searchMode])

  // Get active cart
  const activeCart = carts.find(c => c.id === activeCartId) || carts[0]

  // Cart operations
  const addToCart = (product: Product, quantity: number = 1) => {
    if (isReturnMode) {
      toast.error('Cannot add items in return mode')
      return
    }

    // Check stock
    if (product.quantity < quantity) {
      toast.error(`Insufficient stock. Only ${product.quantity} available.`)
      return
    }

    setCarts(prev => prev.map(cart => {
      if (cart.id !== activeCartId) return cart
      
      const existing = cart.items.find((item) => item.id === product.id)
      if (existing) {
        const newQuantity = existing.quantity + quantity
        if (newQuantity > product.quantity) {
          toast.error(`Cannot add more. Stock limit: ${product.quantity}`)
          return cart
        }
        return {
          ...cart,
          items: cart.items.map((item) =>
            item.id === product.id
              ? { ...item, quantity: newQuantity }
              : item
          )
        }
      }
      return {
        ...cart,
        items: [...cart.items, { 
          id: product.id, 
          name: product.name, 
          price: product.price, 
          quantity,
          stock: product.quantity,
          sku: product.sku
        }]
      }
    }))
    
    toast.success(`${product.name} (${quantity}x) added to cart`)
  }

  const removeFromCart = (id: string) => {
    setCarts(prev => prev.map(cart => {
      if (cart.id !== activeCartId) return cart
      return {
        ...cart,
        items: cart.items.filter((item) => item.id !== id)
      }
    }))
    
    setItemDiscounts((prev) => {
      const newDiscounts = { ...prev }
      delete newDiscounts[id]
      return newDiscounts
    })
  }

  const updateQuantity = (id: string, delta: number) => {
    setCarts(prev => prev.map(cart => {
      if (cart.id !== activeCartId) return cart
      return {
        ...cart,
        items: cart.items.map((item) => {
          if (item.id === id) {
            const newQuantity = Math.max(1, item.quantity + delta)
            if (item.stock && newQuantity > item.stock) {
              toast.error(`Cannot exceed stock of ${item.stock}`)
              return item
            }
            return { ...item, quantity: newQuantity }
          }
          return item
        })
      }
    }))
  }

  const setItemQuantity = (id: string, quantity: number) => {
    if (quantity < 1) return
    setCarts(prev => prev.map(cart => {
      if (cart.id !== activeCartId) return cart
      return {
        ...cart,
        items: cart.items.map((item) => {
          if (item.id === id) {
            if (item.stock && quantity > item.stock) {
              toast.error(`Cannot exceed stock of ${item.stock}`)
              return item
            }
            return { ...item, quantity }
          }
          return item
        })
      }
    }))
  }

  // Barcode scanning
  const handleBarcodeScan = async (scanValue?: string) => {
    const barcode = scanValue || barcodeInput
    
    if (!barcode.trim()) {
      toast.error('Please enter a barcode')
      return
    }

    try {
      // Search for product by barcode
      const product = products.find(p => 
        p.barcode === barcode.trim() || 
        p.sku === barcode.trim() ||
        p.id === barcode.trim()
      )

      if (!product) {
        console.log('Product not found for barcode:', barcode)
        toast.error(`Item not found for barcode: ${barcode}`, {
          icon: <AlertTriangle className="h-4 w-4" />,
          duration: 5000,
          important: true
        })
        // Reset input after not found
        setBarcodeInput('')
        setBarcodeQty(1)
        if (barcodeInputRef.current) {
          barcodeInputRef.current.focus()
        }
        return
      }

      // Check stock availability before adding
      if (product.quantity < barcodeQty) {
        console.log('Insufficient stock:', { product: product.name, available: product.quantity, requested: barcodeQty })
        toast.error(
          <div className="flex flex-col gap-1">
            <span className="font-semibold">Insufficient Stock</span>
            <span>"{product.name}"</span>
            <span className="text-sm text-muted-foreground">
              Available: {product.quantity} | Requested: {barcodeQty}
            </span>
          </div>,
          {
            icon: <AlertTriangle className="h-5 w-5 text-destructive" />,
            duration: 5000,
            important: true
          }
        )
        return
      }

      // Add to cart with specified quantity
      addToCart(product, barcodeQty)
      
      // Reset inputs
      setBarcodeInput('')
      setBarcodeQty(1)
      
      // Refocus barcode input
      if (barcodeInputRef.current) {
        barcodeInputRef.current.focus()
      }
    } catch (error) {
      console.error('Barcode scan error:', error)
      toast.error('Error processing barcode')
    }
  }

  // Multi-cart operations
  const createNewCart = () => {
    const newCartId = Date.now().toString()
    const cartNumber = carts.length + 1
    setCarts(prev => [...prev, {
      id: newCartId,
      name: `Cart ${cartNumber}`,
      items: [],
      customer: null,
      createdAt: new Date()
    }])
    setActiveCartId(newCartId)
    toast.success(`Created Cart ${cartNumber}`)
  }

  const closeCart = (cartId: string) => {
    if (carts.length <= 1) {
      toast.error('Cannot close the only cart')
      return
    }
    
    const cartToClose = carts.find(c => c.id === cartId)
    if (cartToClose && cartToClose.items.length > 0) {
      const confirm = window.confirm(`Cart "${cartToClose.name}" has items. Are you sure you want to close it?`)
      if (!confirm) return
    }
    
    setCarts(prev => prev.filter(c => c.id !== cartId))
    if (activeCartId === cartId) {
      const remainingCarts = carts.filter(c => c.id !== cartId)
      setActiveCartId(remainingCarts[0]?.id || '')
    }
    toast.info('Cart closed')
  }

  const renameCart = (cartId: string, newName: string) => {
    setCarts(prev => prev.map(c => 
      c.id === cartId ? { ...c, name: newName } : c
    ))
  }

  // Existing functions
  const clearCart = () => {
    setCarts(prev => prev.map(cart => 
      cart.id === activeCartId 
        ? { ...cart, items: [], customer: null }
        : cart
    ))
    setCartDiscount(null)
    setItemDiscounts({})
    setSelectedCustomer(null)
    toast.info('Cart cleared')
  }

  const openDiscountDialog = (target: 'cart' | string) => {
    setDiscountTarget(target)
    setIsDiscountDialogOpen(true)
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
      setCarts(prev => prev.map(cart => {
        if (cart.id !== activeCartId) return cart
        return {
          ...cart,
          items: cart.items.map((item) => {
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
        }
      }))
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
      setCarts(prev => prev.map(cart => {
        if (cart.id !== activeCartId) return cart
        return {
          ...cart,
          items: cart.items.map((item) => {
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
        }
      }))
    }
    toast.info('Discount removed')
  }

  const calculateTotals = () => {
    const cart = activeCart
    const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    
    let cartDiscountAmount = 0
    if (cartDiscount) {
      cartDiscountAmount = cartDiscount.type === 'percentage'
        ? subtotal * (cartDiscount.value / 100)
        : cartDiscount.value
    }

    const taxableAmount = subtotal - cartDiscountAmount
    const enabledTaxes = taxes.filter((t) => t.enabled)
    const taxAmount = enabledTaxes.reduce((sum, tax) => {
      return sum + (taxableAmount * tax.rate) / 100
    }, 0)

    const total = taxableAmount + taxAmount

    return {
      subtotal: cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      cartDiscountAmount,
      taxableAmount,
      taxAmount,
      taxes: enabledTaxes,
      total,
    }
  }

  const handleCheckout = async () => {
    const cart = activeCart
    if (cart.items.length === 0) {
      toast.error('Cart is empty')
      return
    }

    const totals = calculateTotals()

    try {
      await activityLogService.logActivity('CREATE', 'SALE', {
        description: `Created sale #${Date.now()} for $${totals.total.toFixed(2)}`,
        entityType: 'sale',
        newValue: {
          total: totals.total,
          items: cart.items.length,
          paymentMethod: selectedPaymentMethod,
          customerId: selectedCustomer?.id,
          customerName: selectedCustomer?.fullName,
        },
      })

      if (printReceipt) {
        try {
          await printReceipt({
            shopName: 'RepairPro Shop',
            shopAddress: '123 Repair Street',
            shopPhone: '+1 234 567 890',
            receiptNumber: `R${Date.now()}`,
            date: new Date().toLocaleString(),
            customerName: selectedCustomer?.fullName || 'Walk-in Customer',
            items: cart.items.map((item) => ({
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
        } catch (error) {
          console.error('Error printing receipt:', error)
          toast.error('Failed to print receipt')
        }
      }

      toast.success('Sale completed successfully!')

      // Update stock for sold items
      for (const item of cart.items) {
        try {
          await productService.updateStock(item.id, -item.quantity)
        } catch (error) {
          console.error(`Failed to update stock for ${item.name}:`, error)
        }
      }

      // Clear cart after successful sale
      setCarts(prev => prev.map(c => 
        c.id === activeCartId 
          ? { ...c, items: [], customer: null }
          : c
      ))
      setIsCheckoutOpen(false)
      setCartDiscount(null)
      setItemDiscounts({})
      setSelectedCustomer(null)
      
      // Refresh products to get updated stock
      loadProducts()
    } catch (error) {
      console.error('Checkout error:', error)
      toast.error('Failed to complete sale')
    }
  }

  const totals = calculateTotals()
  const changeDue = parseFloat(amountReceived || '0') - totals.total

  return (
    <div className="h-[calc(100vh-8rem)]">
      {/* Cart Tabs */}
      {isMultiCartEnabled && carts.length > 1 && (
        <div className="mb-2 flex items-center gap-2">
          <div className="flex gap-1">
            {carts.map(cart => (
              <Button
                key={cart.id}
                variant={activeCartId === cart.id ? 'default' : 'outline'}
                size="sm"
                className="relative"
                onClick={() => setActiveCartId(cart.id)}
              >
                {cart.name}
                {cart.items.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {cart.items.length}
                  </Badge>
                )}
                {carts.length > 1 && (
                  <button
                    className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full text-white text-xs flex items-center justify-center"
                    onClick={(e) => {
                      e.stopPropagation()
                      closeCart(cart.id)
                    }}
                  >
                    ×
                  </button>
                )}
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={createNewCart}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="flex h-full gap-4">
        {/* Products Section */}
        <div className="flex-1 flex flex-col">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Point of Sale</h1>
              <p className="text-muted-foreground">Select products or scan barcode</p>
            </div>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isMultiCartEnabled ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setIsMultiCartEnabled(!isMultiCartEnabled)}
                    >
                      <ShoppingCart className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Multi-cart mode</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
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

          {/* Search/Barcode Toggle */}
          <div className="mb-4 flex items-center gap-2">
            <Button
              variant={searchMode === 'search' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSearchMode('search')}
              className="gap-2"
            >
              <Search className="h-4 w-4" />
              Search
            </Button>
            <Button
              variant={searchMode === 'barcode' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSearchMode('barcode')}
              className="gap-2"
            >
              <Barcode className="h-4 w-4" />
              Scan Barcode
            </Button>
            <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
              <Keyboard className="h-4 w-4" />
              <span>Press F2 to switch</span>
            </div>
          </div>

          {/* Search/Barcode Input Area */}
          {searchMode === 'search' ? (
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="Search by name or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          ) : (
            <div className="flex gap-2 mb-4">
              <div className="flex-1 relative">
                <Barcode className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={barcodeInputRef}
                  placeholder="Scan or type barcode..."
                  value={barcodeInput}
                  onChange={(e) => {
                    const value = e.target.value
                    setBarcodeInput(value)
                    
                    // Clear any existing timeout
                    if (barcodeScanTimeoutRef.current) {
                      clearTimeout(barcodeScanTimeoutRef.current)
                    }
                    
                    // Auto-scan after user stops typing for 500ms
                    // This allows barcode scanners to send all characters before scanning
                    if (value.length >= 3) {
                      barcodeScanTimeoutRef.current = setTimeout(() => {
                        handleBarcodeScan(value)
                      }, 500)
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleBarcodeScan(barcodeInput)
                    }
                  }}
                  className="pl-10"
                  autoFocus
                />
              </div>
              <div className="w-24">
                <Input
                  ref={qtyInputRef}
                  type="number"
                  min={1}
                  max={999}
                  value={barcodeQty}
                  onChange={(e) => setBarcodeQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="text-center"
                  placeholder="Qty"
                />
              </div>
              <Button onClick={handleBarcodeScan}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Products Grid */}
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
              <ScrollArea className="flex-1">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
                  {filteredProducts.map((product) => (
                    <Card
                      key={product.id}
                      className="cursor-pointer hover:bg-accent transition-colors group"
                      onClick={() => addToCart(product, 1)}
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
                          <Badge 
                            variant={product.quantity > 10 ? 'default' : product.quantity > 0 ? 'secondary' : 'destructive'} 
                            className="text-xs"
                          >
                            {product.quantity} in stock
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
                      const quickItem: Product = {
                        id: `quick-${amount}-${Date.now()}`,
                        name: `Quick Sale $${amount}`,
                        price: amount,
                        sku: `QUICK-${amount}`,
                        quantity: 999
                      }
                      addToCart(quickItem, 1)
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
                {isReturnMode ? 'Return Items' : activeCart.name}
              </CardTitle>
              <div className="flex items-center gap-1">
                {activeCart.items.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearCart}
                    className="h-8 w-8 text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-0">
            {/* Customer Info */}
            <div className="px-4 py-3 border-b space-y-3">
              {selectedCustomer ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{selectedCustomer.fullName}</p>
                      <p className="text-xs text-muted-foreground">{selectedCustomer.phone}</p>
                    </div>
                  </div>
                  <CustomerSearch onSelect={setSelectedCustomer}>
                    <Button variant="outline" size="sm" className="w-full">
                      Change Customer
                    </Button>
                  </CustomerSearch>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span className="text-sm">No customer selected</span>
                  </div>
                  <CustomerSearch onSelect={setSelectedCustomer}>
                    <Button variant="outline" size="sm" className="w-full">
                      <Search className="mr-2 h-4 w-4" />
                      Select Customer
                    </Button>
                  </CustomerSearch>
                </div>
              )}
            </div>

            {/* Cart Items */}
            <ScrollArea className="flex-1 px-4 py-2">
              {activeCart.items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-8">
                  <ShoppingCart className="h-12 w-12 mb-3 opacity-50" />
                  <p className="text-sm">Your cart is empty</p>
                  <p className="text-xs">
                    {searchMode === 'barcode' 
                      ? 'Scan a barcode or press F2 to search' 
                      : 'Search for products or press F2 to scan'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeCart.items.map((item) => (
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
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => setItemQuantity(item.id, parseInt(e.target.value) || 1)}
                          className="w-12 h-6 text-center text-sm p-0"
                        />
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
            {activeCart.items.length > 0 && (
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
                  {activeCart.items.map((item) => (
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
                activeCart.items.length === 0 ||
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
