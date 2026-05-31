import { useState, useEffect, useMemo, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
  Tag,
  Check,
  X,
  FileText,
  AlertTriangle,
  Barcode,
  Keyboard,
  MapPin,
  Truck,
  LayoutGrid,
  List,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { activityLogService } from '@/services/activityLogService'
import { cn } from '@/lib/utils'
import { PrintDocumentType } from '@/types/printing'
import { printingManagementService } from '@/modules/printing/printingManagementService'
import { mergePrintPayload, renderTemplateHtml } from '@/modules/printing/engine'
import { cashRegisterService } from '@/services/cashRegisterService'
import { buildReceiptDocument, executePreparedPrintDocument, PreparedPrintDocument } from '@/services/printHelper'
import { Sale, salesService } from '@/services/salesService'
import { shopSettingsService } from '@/services/shopSettingsService'
import { getImageUrl } from '@/utils/imageUpload'
import CustomerSearch from '@/components/CustomerSearch'
import OpenRegisterDialog from '@/components/cash-register/OpenRegisterDialog'
import { Client } from '@/services/clientService'
import { productService } from '@/services/productService'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { useLocaleFormatters } from '@/hooks/useLocaleFormatters'

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
  returnableQuantity?: number
}

interface Cart {
  id: string
  name: string
  items: CartItem[]
  customer: Client | null
  notes: string
  cartDiscount: Discount | null
  itemDiscounts: Record<string, Discount>
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
  image?: string
  location?: string
  categoryName?: string
  supplierName?: string
  minStockAlert?: number
}

export default function POS() {
  const { user } = useAuthStore()
  const { t } = useAppSettings()
  const { formatCurrency, formatDateTime } = useLocaleFormatters()
  
  const [carts, setCarts] = useState<Cart[]>([
    {
      id: '1',
      name: 'Cart 1',
      items: [],
      customer: null,
      notes: '',
      cartDiscount: null,
      itemDiscounts: {},
      createdAt: new Date(),
    }
  ])
  const [activeCartId, setActiveCartId] = useState<string>('1')
  const [isMultiCartEnabled, setIsMultiCartEnabled] = useState(false)
  
  const [searchMode, setSearchMode] = useState<'search' | 'barcode'>('search')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all')
  const [barcodeInput, setBarcodeInput] = useState('')
  const [barcodeQty, setBarcodeQty] = useState<number>(1)
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [returnSales, setReturnSales] = useState<Sale[]>([])
  const [selectedReturnSale, setSelectedReturnSale] = useState<Sale | null>(null)
  const [returnSaleSearchQuery, setReturnSaleSearchQuery] = useState('')
  const [isLoadingReturnSales, setIsLoadingReturnSales] = useState(false)
  
  const barcodeInputRef = useRef<HTMLInputElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const qtyInputRef = useRef<HTMLInputElement>(null)
  const barcodeScanTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const [productViewMode, setProductViewMode] = useState<'card' | 'list'>('list')
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [isReturnMode, setIsReturnMode] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('cash')
  const [shouldPrintReceipt, setShouldPrintReceipt] = useState(true)
  const [amountReceived, setAmountReceived] = useState<string>('')
  const [selectedReceiptSize, setSelectedReceiptSize] = useState<'58mm' | '80mm' | 'A4'>('80mm')
  const [isCheckoutPreviewOpen, setIsCheckoutPreviewOpen] = useState(false)
  const [checkoutPreviewHtml, setCheckoutPreviewHtml] = useState('')
  const [checkoutPreviewTitle, setCheckoutPreviewTitle] = useState(t('preview'))
  const [checkoutPreviewDescription, setCheckoutPreviewDescription] = useState(t('preview'))
  const [preparedCheckoutDocument, setPreparedCheckoutDocument] = useState<PreparedPrintDocument | null>(null)
  const [isPrintingCheckoutDocument, setIsPrintingCheckoutDocument] = useState(false)
  const [isCheckingRegisterStatus, setIsCheckingRegisterStatus] = useState(true)
  const [isOpenRegisterDialogOpen, setIsOpenRegisterDialogOpen] = useState(false)
  const [isCustomItemDialogOpen, setIsCustomItemDialogOpen] = useState(false)
  const [customItemName, setCustomItemName] = useState('Divers')
  const [customItemPrice, setCustomItemPrice] = useState('')
  const [customItemQuantity, setCustomItemQuantity] = useState(1)
  
  const [isDiscountDialogOpen, setIsDiscountDialogOpen] = useState(false)
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('fixed')
  const [discountValue, setDiscountValue] = useState('')
  const [discountReason, setDiscountReason] = useState('')
  const [discountTarget, setDiscountTarget] = useState<'cart' | string>('cart')
  
  const [taxes, setTaxes] = useState<Tax[]>([
    { name: 'VAT', rate: 10, enabled: false },
    { name: 'Service Tax', rate: 5, enabled: false },
  ])

  const paymentMethods: PaymentMethod[] = [
    { id: 'cash', name: 'Cash', icon: <Banknote className="h-5 w-5" />, enabled: true },
    { id: 'card', name: 'Card', icon: <CreditCard className="h-5 w-5" />, enabled: true },
    { id: 'transfer', name: 'Transfer', icon: <Smartphone className="h-5 w-5" />, enabled: true },
    { id: 'credit', name: 'Credit', icon: <QrCode className="h-5 w-5" />, enabled: true },
  ]

  const quickAmounts = [100, 200, 500, 1000, 2000, 5000]
  const posCategories = useMemo(
    () => ['all', ...Array.from(new Set(products.map((product) => product.categoryName).filter(Boolean)))],
    [products],
  )

  useEffect(() => {
    loadProducts()
  }, [])

  useEffect(() => {
    const checkRegisterStatus = async () => {
      try {
        const register = await cashRegisterService.getOpenRegister()
        setIsOpenRegisterDialogOpen(!register?.id)
      } catch (error) {
        console.error('Failed to check cash register status:', error)
        toast.error(t('cashRegister'))
      } finally {
        setIsCheckingRegisterStatus(false)
      }
    }

    checkRegisterStatus()
  }, [])

  useEffect(() => {
    const loadPrintPreferences = async () => {
      try {
        const preferences = await printingManagementService.getPreferences()
        setShouldPrintReceipt(preferences.autoPrintPos)
      } catch (error) {
        console.error('Failed to load POS print preferences:', error)
      }
    }

    loadPrintPreferences()
  }, [])

  useEffect(() => {
    if (!isCheckoutOpen) {
      return
    }

    if (selectedPaymentMethod === 'credit') {
      setAmountReceived((current) => current || '0')
      return
    }

    const nextTotals = calculateTotals()
    setAmountReceived(nextTotals.total.toFixed(2))
  }, [isCheckoutOpen, selectedPaymentMethod, carts, activeCartId, taxes])

  const loadProducts = async () => {
    try {
      const data = await productService.getProducts()
      setProducts(data.map((p: any) => ({
        id: p.id,
        name: p.name,
        price: p.salePrice || p.price || 0,
        sku: p.sku || '',
        location: p.location || '',
        image: p.image || '',
        categoryName: p.category?.name || '',
        supplierName: p.supplier?.name || '',
        minStockAlert: p.minStockAlert || 0,
        quantity: p.quantity || 0,
        barcode: p.barcode
      })))
    } catch (error) {
      console.error('Failed to load products:', error)
      toast.error(t('products'))
    }
  }

  useEffect(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()
    const filtered = products.filter((product) => {
      const matchesSearch =
        !normalizedQuery ||
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.sku.toLowerCase().includes(normalizedQuery) ||
        product.barcode?.toLowerCase().includes(normalizedQuery) ||
        product.location?.toLowerCase().includes(normalizedQuery)
      const matchesCategory =
        selectedCategoryFilter === 'all' || product.categoryName === selectedCategoryFilter

      return matchesSearch && matchesCategory
    })

    setFilteredProducts(filtered)
  }, [searchQuery, products, selectedCategoryFilter])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault()
        setSearchMode(prev => prev === 'search' ? 'barcode' : 'search')
        toast.info(searchMode === 'search' ? t('scanBarcode') : t('searchProducts'))
      }

      if (searchMode === 'barcode' && /^[0-9]$/.test(e.key) && document.activeElement !== barcodeInputRef.current) {
        e.preventDefault()
        setBarcodeQty(prev => {
          const newQty = parseInt(prev.toString() + e.key)
          return newQty > 999 ? 999 : newQty
        })
      }

      if (searchMode === 'barcode' && (e.key === '+' || e.key === '-')) {
        e.preventDefault()
        setBarcodeQty(prev => {
          if (e.key === '+') return prev < 999 ? prev + 1 : 999
          return prev > 1 ? prev - 1 : 1
        })
      }

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

  useEffect(() => {
    if (searchMode === 'barcode' && barcodeInputRef.current) {
      barcodeInputRef.current.focus()
    } else if (searchMode === 'search' && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [searchMode])

  const activeCart = carts.find(c => c.id === activeCartId) || carts[0]
  const updateActiveCart = (updater: (cart: Cart) => Cart) => {
    setCarts((prev) => prev.map((cart) => (cart.id === activeCartId ? updater(cart) : cart)))
  }
  const clearActiveCartState = () => {
    setCarts((prev) =>
      prev.map((cart) =>
        cart.id === activeCartId
          ? { ...cart, items: [], customer: null, notes: '', cartDiscount: null, itemDiscounts: {} }
          : cart,
      ),
    )
  }

  const filteredReturnSales = useMemo(() => {
    const normalizedQuery = returnSaleSearchQuery.trim().toLowerCase()
    return returnSales.filter((sale) => {
      if (!normalizedQuery) {
        return true
      }

      return (
        sale.invoiceNumber.toLowerCase().includes(normalizedQuery) ||
        sale.customerName?.toLowerCase().includes(normalizedQuery) ||
        sale.customerPhone?.toLowerCase().includes(normalizedQuery)
      )
    })
  }, [returnSales, returnSaleSearchQuery])

  const loadReturnSales = async () => {
    try {
      setIsLoadingReturnSales(true)
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 90)
      const sales = await salesService.getSales({ startDate })
      setReturnSales(
        sales.filter((sale) => sale.status !== 'REFUNDED' && (sale.items?.length || 0) > 0),
      )
    } catch (error) {
      console.error('Failed to load return sales:', error)
      toast.error(t('returnItems'))
    } finally {
      setIsLoadingReturnSales(false)
    }
  }

  const toggleReturnMode = async () => {
    const nextMode = !isReturnMode
    setIsReturnMode(nextMode)
    setSelectedReturnSale(null)
    setReturnSaleSearchQuery('')
    clearActiveCartState()

    if (nextMode) {
      await loadReturnSales()
      toast.info(t('returnModeActiveHelp'))
    } else {
      toast.info(t('returnItems'))
    }
  }

  const loadReturnSaleToCart = async (sale: Sale) => {
    try {
      const previousReturns = await salesService.getReturnsForSourceSale(sale.id)
      const refundedByProductId = new Map<string, number>()

      previousReturns.forEach((returnSale) => {
        returnSale.items?.forEach((item) => {
          refundedByProductId.set(item.productId, (refundedByProductId.get(item.productId) || 0) + item.quantity)
        })
      })

      const returnableItems = (sale.items || [])
        .map((item) => {
          const remainingQuantity = item.quantity - (refundedByProductId.get(item.productId) || 0)
          if (remainingQuantity <= 0) {
            return null
          }

          return {
            id: item.productId,
            name: item.product?.name || item.productId,
            price:
              item.unitPrice ||
              (item.product as any)?.salePrice ||
              (item.product as any)?.price ||
              0,
            quantity: remainingQuantity,
            stock: remainingQuantity,
            sku: item.product?.sku || '',
            returnableQuantity: remainingQuantity,
          } as CartItem
        })
        .filter(Boolean) as CartItem[]

      if (returnableItems.length === 0) {
        toast.error(t('noEligibleSalesForReturn'))
        return
      }

      setSelectedReturnSale(sale)
      updateActiveCart((cart) => ({
        ...cart,
        items: returnableItems,
        customer: sale.customer
          ? {
              id: sale.customer.id,
              fullName: sale.customer.name,
              phone: sale.customer.phone || '',
              email: sale.customer.email,
              address: '',
              notes: '',
              balance: 0,
              isActive: true,
              loyaltyPoints: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
            }
          : cart.customer,
        notes: `${t('returnItems')} ${sale.invoiceNumber}`,
        cartDiscount: null,
        itemDiscounts: {},
      }))
      toast.success(`${t('returningAgainst')} ${sale.invoiceNumber}`)
    } catch (error) {
      console.error('Failed to load return sale:', error)
      toast.error(t('returnSourceSale'))
    }
  }

  const addToCart = (product: Product, quantity: number = 1) => {
    if (isReturnMode) {
      toast.error(t('returnModeActiveHelp'))
      return
    }

    if (!isReturnMode && product.quantity < quantity) {
      toast.error(`${t('lowStockCount', { count: product.quantity })}`)
      return
    }

    setCarts(prev => prev.map(cart => {
      if (cart.id !== activeCartId) return cart
      
      const existing = cart.items.find((item) => item.id === product.id)
      if (existing) {
        const newQuantity = existing.quantity + quantity
        if (!isReturnMode && newQuantity > product.quantity) {
          toast.error(`${t('stockLevel')}: ${product.quantity}`)
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
    
    toast.success(`${product.name} (${quantity}x) ${t('add')}`)
  }

  const removeFromCart = (id: string) => {
    setCarts(prev => prev.map(cart => {
      if (cart.id !== activeCartId) return cart
      return {
        ...cart,
        items: cart.items.filter((item) => item.id !== id)
      }
    }))

    updateActiveCart((cart) => {
      const newDiscounts = { ...cart.itemDiscounts }
      delete newDiscounts[id]
      return {
        ...cart,
        itemDiscounts: newDiscounts,
      }
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
            const maxAllowedQuantity = isReturnMode ? item.returnableQuantity : item.stock
            if (maxAllowedQuantity && newQuantity > maxAllowedQuantity) {
              toast.error(`${t('stockLevel')}: ${item.stock}`)
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
            const maxAllowedQuantity = isReturnMode ? item.returnableQuantity : item.stock
            if (maxAllowedQuantity && quantity > maxAllowedQuantity) {
              toast.error(`${isReturnMode ? t('returnItems') : t('stockLevel')}: ${maxAllowedQuantity}`)
              return item
            }
            return { ...item, quantity }
          }
          return item
        })
      }
    }))
  }

  const handleBarcodeScan = async (scanValue?: string) => {
    if (isReturnMode) {
      toast.error(t('returnSourceSale'))
      return
    }

    const barcode = scanValue || barcodeInput
    
    if (!barcode.trim()) {
      toast.error(t('scanBarcode'))
      return
    }

    try {
      const product = products.find(p => 
        p.barcode === barcode.trim() || 
        p.sku === barcode.trim() ||
        p.id === barcode.trim()
      )

      if (!product) {
        toast.error(`${t('barcode')}: ${barcode}`, {
          icon: <AlertTriangle className="h-4 w-4" />
        })
        setBarcodeInput('')
        setBarcodeQty(1)
        if (barcodeInputRef.current) {
          barcodeInputRef.current.focus()
        }
        return
      }

      if (!isReturnMode && product.quantity < barcodeQty) {
        toast.error(
          <div className="flex flex-col gap-1">
            <span className="font-semibold">{t('outOfStock')}</span>
            <span>"{product.name}"</span>
            <span className="text-sm text-muted-foreground">
              {t('inStockCount', { count: product.quantity })} | {t('quantity')}: {barcodeQty}
            </span>
          </div>,
          {
            icon: <AlertTriangle className="h-5 w-5 text-destructive" />,
            duration: 5000,
          }
        )
        return
      }

      addToCart(product, barcodeQty)
      
      setBarcodeInput('')
      setBarcodeQty(1)
      
      if (barcodeInputRef.current) {
        barcodeInputRef.current.focus()
      }
    } catch (error) {
      console.error('Barcode scan error:', error)
      toast.error(t('scanBarcode'))
    }
  }

  const createNewCart = () => {
    const newCartId = Date.now().toString()
    const cartNumber = carts.length + 1
    setCarts(prev => [...prev, {
      id: newCartId,
      name: `Cart ${cartNumber}`,
      items: [],
      customer: null,
      notes: '',
      cartDiscount: null,
      itemDiscounts: {},
      createdAt: new Date()
    }])
    setActiveCartId(newCartId)
    toast.success(`Cart ${cartNumber}`)
  }

  const closeCart = (cartId: string) => {
    if (carts.length <= 1) {
      toast.error(t('cartDiscount'))
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
    toast.info(t('closeApplication'))
  }

  const clearCart = () => {
    clearActiveCartState()
    if (isReturnMode) {
      setSelectedReturnSale(null)
    }
    toast.info(t('cancel'))
  }

  const resetCustomItemForm = () => {
    setCustomItemName('Divers')
    setCustomItemPrice('')
    setCustomItemQuantity(1)
  }

  const handleAddCustomItem = () => {
    if (isReturnMode) {
      toast.error(t('addCustomItem'))
      return
    }

    const normalizedName = customItemName.trim() || 'Divers'
    const normalizedPrice = Number.parseFloat(customItemPrice)

    if (!Number.isFinite(normalizedPrice) || normalizedPrice <= 0) {
      toast.error(t('enterAmount'))
      return
    }

    const normalizedQuantity = Math.max(1, customItemQuantity || 1)

    setCarts((prev) =>
      prev.map((cart) => {
        if (cart.id !== activeCartId) return cart

        return {
          ...cart,
          items: [
            ...cart.items,
            {
              id: `custom-${Date.now()}`,
              name: normalizedName,
              price: normalizedPrice,
              quantity: normalizedQuantity,
              stock: 999999,
              sku: 'CUSTOM',
            },
          ],
        }
      }),
    )

    setIsCustomItemDialogOpen(false)
    resetCustomItemForm()
    toast.success(`${normalizedName} ${t('add')}`)
  }

  const openDiscountDialog = (target: 'cart' | string) => {
    if (isReturnMode) {
      toast.error(t('discounts'))
      return
    }

    setDiscountTarget(target)
    setIsDiscountDialogOpen(true)
  }

  const applyDiscount = () => {
    const value = parseFloat(discountValue)
    if (isNaN(value) || value <= 0) {
      toast.error(t('discountValue'))
      return
    }

    if (discountType === 'percentage' && value > 100) {
      toast.error(t('percentage'))
      return
    }

    const discount: Discount = {
      type: discountType,
      value,
      reason: discountReason,
    }

    if (discountTarget === 'cart') {
      updateActiveCart((cart) => ({ ...cart, cartDiscount: discount }))
    } else {
      setCarts(prev => prev.map(cart => {
        if (cart.id !== activeCartId) {
          return cart
        }
        return {
          ...cart,
          itemDiscounts: {
            ...cart.itemDiscounts,
            [discountTarget]: discount,
          },
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
    toast.success(t('applyDiscountTitle'))
  }

  const removeDiscount = (target: 'cart' | string) => {
    if (target === 'cart') {
      updateActiveCart((cart) => ({ ...cart, cartDiscount: null }))
    } else {
      setCarts(prev => prev.map(cart => {
        if (cart.id !== activeCartId) return cart
        const newDiscounts = { ...cart.itemDiscounts }
        delete newDiscounts[target]
        return {
          ...cart,
          itemDiscounts: newDiscounts,
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
    toast.info(t('discount'))
  }

  const calculateTotals = () => {
    const cart = activeCart
    const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    
    let cartDiscountAmount = 0
    if (cart?.cartDiscount) {
      cartDiscountAmount = cart.cartDiscount.type === 'percentage'
        ? subtotal * (cart.cartDiscount.value / 100)
        : cart.cartDiscount.value
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

  const getPaymentDisplayName = (paymentMethod: string) => {
    switch (paymentMethod) {
      case 'cash':
        return t('cashIn').replace(' In', '')
      case 'card':
        return t('paymentMethods')
      case 'transfer':
        return t('method')
      case 'credit':
        return t('clientPayment')
      default:
        return t('cashIn').replace(' In', '')
    }
  }

  const handleAmountKeypad = (value: string) => {
    if (value === 'C') {
      setAmountReceived('')
      return
    }

    setAmountReceived((current) => {
      if (value === '.') {
        if (current.includes('.')) {
          return current
        }
        return current ? `${current}.` : '0.'
      }

      const next = current === '0' ? value : `${current}${value}`
      const [integerPart, decimalPart] = next.split('.')
      if (decimalPart && decimalPart.length > 2) {
        return current
      }
      if (integerPart.length > 7) {
        return current
      }
      return next
    })
  }

  const normalizeAmountValue = (value: string) => {
    const parsed = Number.parseFloat(value || '0')
    return Number.isFinite(parsed) ? parsed : 0
  }

  const buildCheckoutDocument = async () => {
    const shopSettings = await shopSettingsService.getSettings()
    const templates = await printingManagementService.getTemplates()
    const printers = await printingManagementService.getPrinters()
    const targetDocumentType: PrintDocumentType =
      selectedReceiptSize === 'A4' ? 'A4_INVOICE' : 'POS_INVOICE'

    const fallbackConfiguration = await printingManagementService.resolveDocumentConfiguration(targetDocumentType)
    const selectedTemplate =
      templates.find(
        (template) =>
          template.documentType === targetDocumentType &&
          template.paperSize === selectedReceiptSize &&
          template.isEnabled !== false &&
          template.isDefault,
      ) ||
      templates.find(
        (template) =>
          template.documentType === targetDocumentType &&
          template.paperSize === selectedReceiptSize &&
          template.isEnabled !== false,
      ) ||
      fallbackConfiguration.template

    const selectedPrinter =
      printers.find((printer) => printer.id === selectedTemplate.preferredPrinterId) ||
      fallbackConfiguration.printer

    const payload = mergePrintPayload(selectedTemplate.sampleData as Record<string, unknown> | undefined, {
      shop: {
        name: shopSettings.shopName,
        address: shopSettings.shopAddress,
        phone: shopSettings.shopPhone,
        email: shopSettings.shopEmail,
        currency: shopSettings.currencySymbol,
      },
      sale: {
        invoiceNumber: isReturnMode
          ? `RETURN-${selectedReturnSale?.invoiceNumber || Date.now()}`
          : `PREVIEW-${Date.now()}`,
        date: new Date().toLocaleString(),
        subtotal: totals.subtotal.toFixed(2),
        tax: totals.taxAmount.toFixed(2),
        total: totals.total.toFixed(2),
      },
      payment: {
        method: getPaymentDisplayName(selectedPaymentMethod),
        amount: effectivePaidAmount.toFixed(2),
      },
      customer: {
        name: activeCart.customer?.fullName || t('customerInformation'),
        phone: activeCart.customer?.phone,
        email: activeCart.customer?.email,
      },
      items: activeCart.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price.toFixed(2),
        total: (item.price * item.quantity).toFixed(2),
      })),
    })

    return {
      html: renderTemplateHtml(selectedTemplate, payload),
      title: isReturnMode
        ? selectedReceiptSize === 'A4'
          ? `${t('preview')} A4`
          : `${t('preview')} POS`
        : selectedReceiptSize === 'A4'
          ? `${t('preview')} A4`
          : `${t('preview')} POS`,
      templateId: selectedTemplate.id,
      printerId: selectedPrinter?.id,
      printer: selectedPrinter,
      targetDocumentType,
      payload,
    }
  }

  const handlePreviewCheckout = async () => {
    try {
      const document = await buildCheckoutDocument()
      setPreparedCheckoutDocument({
        html: document.html,
        title: document.title,
        printer: document.printer,
        documentType: document.targetDocumentType,
        templateId: document.templateId,
        payload: document.payload,
        silent: false,
      })
      setCheckoutPreviewHtml(document.html)
      setCheckoutPreviewTitle(document.title)
      setCheckoutPreviewDescription(
        isReturnMode
          ? t('preview')
          : t('preview'),
      )
      setIsCheckoutPreviewOpen(true)
    } catch (error) {
      console.error('Failed to build checkout preview:', error)
      toast.error(t('preview'))
    }
  }

  const handlePrintCheckoutPreview = async () => {
    if (!preparedCheckoutDocument) {
      toast.error(t('printTicket'))
      return
    }

    try {
      setIsPrintingCheckoutDocument(true)
      await executePreparedPrintDocument(preparedCheckoutDocument)
      toast.success(t('printTicket'))
    } catch (error) {
      console.error('Error printing checkout preview:', error)
      toast.error(t('printTicket'))
    } finally {
      setIsPrintingCheckoutDocument(false)
    }
  }

  const handleCheckout = async () => {
    const cart = activeCart
    if (cart.items.length === 0) {
      toast.error(t('yourCartIsEmpty'))
      return
    }

    const totals = calculateTotals()

    try {
      if (!user?.id) {
        toast.error(t('signIn'))
        return
      }

      const openRegister = await cashRegisterService.getOpenRegister()
      if (!openRegister?.id) {
        toast.error(t('openRegister'))
        return
      }

      if (selectedPaymentMethod === 'credit' && !activeCart.customer?.id) {
        toast.error(t('selectCustomer'))
        return
      }

      if (isReturnMode && !selectedReturnSale) {
        toast.error(t('returnSourceSale'))
        return
      }

      const sale = isReturnMode
        ? (
            await salesService.processReturn({
              sourceSaleId: selectedReturnSale.id,
              customerId: activeCart.customer?.id,
              customerName: activeCart.customer?.fullName || t('customerInformation'),
              customerPhone: activeCart.customer?.phone,
              customerEmail: activeCart.customer?.email,
              items: cart.items.map((item) => ({
                productId: item.id,
                quantity: item.quantity,
                unitPrice: item.price,
                discount: 0,
                tax: 0,
              })),
              discountAmount: totals.cartDiscountAmount,
              taxAmount: totals.taxAmount,
              refundAmount: totals.total,
              paymentMethod: selectedPaymentMethod,
              notes: activeCart.notes || t('returnItems'),
              sellerId: user.id,
              cashRegisterId: openRegister.id,
            })
          ).refundSale
        : await salesService.createSale({
            customerId: activeCart.customer?.id,
            customerName: activeCart.customer?.fullName || t('customerInformation'),
            customerPhone: activeCart.customer?.phone,
            customerEmail: activeCart.customer?.email,
            status: 'CONFIRMED',
            items: cart.items.map((item) => ({
              productId: item.id,
              quantity: item.quantity,
              unitPrice: item.price,
              discount: 0,
              tax: 0,
            })),
            discountAmount: totals.cartDiscountAmount,
            taxAmount: totals.taxAmount,
            total: totals.total,
            paidAmount: effectivePaidAmount,
            paymentMethod: selectedPaymentMethod,
            notes: activeCart.notes || undefined,
            saleDate: new Date(),
            sellerId: user.id,
            cashRegisterId: openRegister.id,
          })

      if (isReturnMode) {
        await cashRegisterService.recordRefund(openRegister.id, totals.total)
      }

      await activityLogService.logActivity('CREATE', 'SALE', {
        description: `${isReturnMode ? 'Processed return' : 'Created sale'} ${sale.invoiceNumber} for ${formatCurrency(totals.total)}`,
        entityId: sale.id,
        entityType: 'sale',
        newValue: {
          invoiceNumber: sale.invoiceNumber,
          total: totals.total,
          items: cart.items.length,
          paymentMethod: selectedPaymentMethod,
          customerId: activeCart.customer?.id,
          customerName: activeCart.customer?.fullName,
          mode: isReturnMode ? 'return' : 'sale',
          sourceInvoiceNumber: selectedReturnSale?.invoiceNumber,
        },
      })

      if (isReturnMode) {
        for (const item of cart.items) {
          try {
            await productService.adjustQuantity(item.id, item.quantity)
          } catch (error) {
            console.error(`Failed to update stock for ${item.name}:`, error)
          }
        }
      }

      clearActiveCartState()
      setSelectedReturnSale(null)
      setIsCheckoutOpen(false)
      setAmountReceived('')
      
      loadProducts()
      toast.success(isReturnMode ? t('processReturn') : t('completeSale'))

      if (shouldPrintReceipt) {
        const receiptPayload = {
          shopName: 'RepairPro Shop',
          shopAddress: '123 Repair Street',
          shopPhone: '+1 234 567 890',
          receiptNumber: sale.invoiceNumber,
          date: new Date(sale.saleDate || new Date()).toLocaleString(),
          customerName: activeCart.customer?.fullName || t('customerInformation'),
          items: cart.items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          })),
          subtotal: totals.subtotal,
          tax: totals.taxAmount,
          discount: totals.cartDiscountAmount,
          total: totals.total,
          paymentMethod: getPaymentDisplayName(selectedPaymentMethod),
          footer: isReturnMode ? t('processReturn') : t('safeClosing'),
        }
        const receiptDocument = await buildReceiptDocument(
          receiptPayload,
          selectedReceiptSize === 'A4' ? 'A4_INVOICE' : 'POS_INVOICE',
        )
        setPreparedCheckoutDocument(receiptDocument)
        setCheckoutPreviewHtml(receiptDocument.html)
        setCheckoutPreviewTitle(receiptDocument.title)
        setCheckoutPreviewDescription(
          isReturnMode
            ? t('preview')
            : t('preview'),
        )
        setIsCheckoutPreviewOpen(true)
      }
    } catch (error) {
      console.error('Checkout error:', error)
      toast.error(error instanceof Error ? error.message : t('completeSale'))
    }
  }

  const totals = calculateTotals()
  const enteredAmount = normalizeAmountValue(amountReceived)
  const effectivePaidAmount = selectedPaymentMethod === 'credit'
    ? Math.min(enteredAmount, totals.total)
    : totals.total
  const balanceDue = Math.max(0, totals.total - effectivePaidAmount)
  const changeDue = selectedPaymentMethod === 'cash' ? Math.max(0, enteredAmount - totals.total) : 0
  const paymentStatus = balanceDue === 0 ? 'PAID' : effectivePaidAmount > 0 ? 'PARTIAL' : 'PENDING'

  if (isCheckingRegisterStatus) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <div>
            <p className="font-medium">{t('cashRegister')}</p>
            <p className="text-sm text-muted-foreground">{t('pointOfSale')}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <OpenRegisterDialog
        open={isOpenRegisterDialogOpen}
        onOpenChange={setIsOpenRegisterDialogOpen}
        allowSkip
        onSkip={() => toast.info(t('skip'))}
        onOpened={() => {
          setIsOpenRegisterDialogOpen(false)
          toast.success(t('openRegister'))
        }}
      />
      <div className="h-[calc(100vh-8rem)]">
        {/* Quick Status Bar */}
        <div className="mb-3 flex items-center justify-between rounded-2xl border border-border/50 bg-gradient-to-r from-muted/30 via-muted/20 to-muted/30 px-4 py-2.5 text-xs text-muted-foreground backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Package className="h-3.5 w-3.5" />
              {products.length} {t('products')}
            </span>
            {activeCart.customer && (
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {activeCart.customer.fullName}
              </span>
            )}
            <span className={cn("flex items-center gap-1", isReturnMode && "text-amber-600")}>
              {isReturnMode ? (
                <><RotateCcw className="h-3.5 w-3.5" />{t('returnMode')}</>
              ) : (
                <><ShoppingCart className="h-3.5 w-3.5" />{t('sale')}</>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {searchMode === 'barcode' && (
              <Badge variant="outline" className="text-[10px] gap-1">
                <Barcode className="h-3 w-3" />
                {t('scanMode')}: x{barcodeQty}
              </Badge>
            )}
            <Badge variant="secondary" className="text-[10px]">
              {activeCart.items.length} {t('items')}
            </Badge>
          </div>
        </div>
      {isMultiCartEnabled && (
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
        <div className="flex-1 flex flex-col">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{t('pointOfSale')}</h1>
              <p className="text-muted-foreground">{t('selectProductsOrScanBarcode')}</p>
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
                    <p>{t('multiCartMode')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsCustomItemDialogOpen(true)}
                      disabled={isReturnMode}
                    >
                      <Tag className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('addCustomItem')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <Button
                variant={isReturnMode ? 'default' : 'outline'}
                onClick={toggleReturnMode}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                {isReturnMode ? t('back') : t('returnItems')}
              </Button>
            </div>
          </div>

          <div className="mb-4 flex items-center gap-2">
            <Button
              variant={searchMode === 'search' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSearchMode('search')}
              className="gap-2"
            >
              <Search className="h-4 w-4" />
              {t('searchProducts')}
            </Button>
            <Button
              variant={searchMode === 'barcode' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSearchMode('barcode')}
              className="gap-2"
            >
              <Barcode className="h-4 w-4" />
              {t('scanBarcode')}
            </Button>
            <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
              <Keyboard className="h-4 w-4" />
              <span>{t('pressF2ToSwitch')}</span>
            </div>
          </div>

          {searchMode === 'search' ? (
            <div className="mb-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  placeholder={t('searchProductsPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {posCategories.map((category) => (
                  <Button
                    key={category}
                    type="button"
                    size="sm"
                    variant={selectedCategoryFilter === category ? 'default' : 'outline'}
                    className="h-8 rounded-full px-4"
                    onClick={() => setSelectedCategoryFilter(category)}
                  >
                    {category === 'all' ? t('allCategories') : category}
                  </Button>
                ))}
              </div>
              <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                <span>{t('availableProductsCount', { count: filteredProducts.length })}</span>
                <div className="flex items-center gap-2">
                  <span>
                    {t('filterLabel')}: {selectedCategoryFilter === 'all' ? t('allCategories') : selectedCategoryFilter}
                  </span>
                  <div className="flex items-center gap-1 rounded-lg border bg-background p-1">
                    <Button
                      type="button"
                      size="sm"
                      variant={productViewMode === 'card' ? 'default' : 'ghost'}
                      className="h-7 px-2"
                      onClick={() => setProductViewMode('card')}
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={productViewMode === 'list' ? 'default' : 'ghost'}
                      className="h-7 px-2"
                      onClick={() => setProductViewMode('list')}
                    >
                      <List className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
              {isReturnMode && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  {t('returnModeActiveHelp')}
                </div>
              )}
            </div>
          ) : (
            <div className="flex gap-2 mb-4">
              <div className="flex-1 relative">
                <Barcode className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={barcodeInputRef}
                  placeholder={t('scanOrTypeBarcode')}
                  value={barcodeInput}
                  onChange={(e) => {
                    const value = e.target.value
                    setBarcodeInput(value)
                    
                    if (barcodeScanTimeoutRef.current) {
                      clearTimeout(barcodeScanTimeoutRef.current)
                    }
                    
                    if (value.length >= 6) {
                      barcodeScanTimeoutRef.current = setTimeout(() => {
                        handleBarcodeScan(value)
                      }, 100)
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (barcodeScanTimeoutRef.current) {
                        clearTimeout(barcodeScanTimeoutRef.current)
                      }
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
                  placeholder={t('qty')}
                />
              </div>
              <Button onClick={() => handleBarcodeScan()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="mt-4 flex-1">
            <ScrollArea className="h-full">
                {productViewMode === 'card' ? (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
                    {filteredProducts.map((product) => (
                      (() => {
                        const isOutOfStock = product.quantity <= 0
                        const isLowStock = !isOutOfStock && product.quantity <= Math.max(3, product.minStockAlert || 0)
                        return (
                      <Card
                        key={product.id}
                        className={cn(
                          'cursor-pointer overflow-hidden border-border/60 transition-all duration-200 group hover:-translate-y-0.5 hover:shadow-md',
                          isOutOfStock && 'border-destructive/40 bg-destructive/5 opacity-80',
                          isLowStock && 'border-amber-500/40 bg-amber-50/50',
                          isReturnMode && 'cursor-not-allowed opacity-70',
                          !isOutOfStock && !isLowStock && 'hover:border-primary/30',
                        )}
                        onClick={() => !isOutOfStock && !isReturnMode && addToCart(product, 1)}
                      >
                        <CardContent className="p-3">
                          <div className="relative mb-3 aspect-square overflow-hidden rounded-xl bg-muted">
                            {getImageUrl(product.image) ? (
                              <img
                                src={getImageUrl(product.image) || ''}
                                alt={product.name}
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <Package className="h-8 w-8 text-muted-foreground" />
                              </div>
                            )}
                            <div className="absolute left-2 top-2">
                              <Badge
                                variant={isOutOfStock ? 'destructive' : isLowStock ? 'secondary' : 'default'}
                                className="text-[10px]"
                              >
                                {isOutOfStock ? t('outOfStock') : isLowStock ? t('lowStockCount', { count: product.quantity }) : t('inStockCount', { count: product.quantity })}
                              </Badge>
                            </div>
                            {product.categoryName && (
                              <div className="absolute right-2 top-2">
                                <Badge variant="outline" className="bg-background/90 text-[10px] backdrop-blur">
                                  {product.categoryName}
                                </Badge>
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <h3 className="line-clamp-1 font-medium">{product.name}</h3>
                            <p className="text-xs text-muted-foreground truncate">{product.sku || t('noSku')}</p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5" />
                              <span className="truncate">{product.location || t('noLocationSet')}</span>
                            </div>
                            {product.supplierName && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Truck className="h-3.5 w-3.5" />
                                <span className="truncate">{product.supplierName}</span>
                              </div>
                            )}
                            {isLowStock && (
                              <p className="text-xs font-medium text-amber-700">
                                {t('reorderSoon')}
                              </p>
                            )}
                            {isOutOfStock && (
                              <p className="text-xs font-medium text-destructive">
                                {t('currentlyUnavailableForSale')}
                              </p>
                            )}
                          </div>
                          <div className="mt-3 flex items-center justify-between">
                            <p className="text-lg font-bold text-primary">
                              {formatCurrency(product.price)}
                            </p>
                            <Button size="sm" className="h-8 px-3" disabled={isOutOfStock || isReturnMode} onClick={(event) => {
                              event.stopPropagation()
                              if (!isOutOfStock && !isReturnMode) {
                                addToCart(product, 1)
                              }
                            }}>
                              <Plus className="mr-1 h-3.5 w-3.5" />
                              {isReturnMode ? t('returnItems') : isOutOfStock ? t('unavailable') : t('add')}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )})()
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3 pb-4">
                    {filteredProducts.map((product) => {
                      const isOutOfStock = product.quantity <= 0
                      const isLowStock = !isOutOfStock && product.quantity <= Math.max(3, product.minStockAlert || 0)

                      return (
                        <Card
                          key={product.id}
                          className={cn(
                            'cursor-pointer border-border/60 transition-colors hover:border-primary/30',
                            isOutOfStock && 'border-destructive/40 bg-destructive/5 opacity-80',
                            isLowStock && 'border-amber-500/40 bg-amber-50/50',
                            isReturnMode && 'cursor-not-allowed opacity-70',
                          )}
                          onClick={() => !isOutOfStock && !isReturnMode && addToCart(product, 1)}
                        >
                          <CardContent className="flex items-center gap-4 p-4">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
                              {getImageUrl(product.image) ? (
                                <img
                                  src={getImageUrl(product.image) || ''}
                                  alt={product.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <Package className="h-7 w-7 text-muted-foreground" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <h3 className="truncate font-medium">{product.name}</h3>
                                <Badge
                                  variant={isOutOfStock ? 'destructive' : isLowStock ? 'secondary' : 'outline'}
                                  className="text-[10px]"
                                >
                                  {isOutOfStock ? t('outOfStock') : isLowStock ? t('lowStockCount', { count: product.quantity }) : t('inStockCount', { count: product.quantity })}
                                </Badge>
                                {product.categoryName && (
                                  <Badge variant="outline" className="text-[10px]">
                                    {product.categoryName}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                <span>{product.sku || t('noSku')}</span>
                                <span>{product.location || t('noLocationSet')}</span>
                                {product.supplierName && <span>{product.supplierName}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <p className="text-lg font-bold text-primary">{formatCurrency(product.price)}</p>
                              <Button
                                size="sm"
                                disabled={isOutOfStock || isReturnMode}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  if (!isOutOfStock && !isReturnMode) {
                                    addToCart(product, 1)
                                  }
                                }}
                              >
                                <Plus className="mr-1 h-3.5 w-3.5" />
                                {isReturnMode ? t('returnItems') : isOutOfStock ? t('unavailable') : t('add')}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
            </ScrollArea>
          </div>
        </div>

        <Card className="w-[450px] flex flex-col border-border/50 shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
                  <ShoppingCart className="h-4 w-4 text-primary" />
                </div>
                {isReturnMode ? t('returnItems') : activeCart.name}
                {activeCart.items.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {activeCart.items.length}
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-1">
                {activeCart.items.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearCart}
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-0">
            <div className="px-4 py-3 border-b space-y-3">
              {isReturnMode && (
                <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-amber-900">{t('returnSourceSale')}</p>
                      <p className="text-xs text-amber-800">{t('returnModeActiveHelp')}</p>
                    </div>
                    <RotateCcw className="h-4 w-4 text-amber-700" />
                  </div>
                  <Input
                    placeholder={t('searchInvoiceCustomerPhone')}
                    value={returnSaleSearchQuery}
                    onChange={(event) => setReturnSaleSearchQuery(event.target.value)}
                    className="bg-white"
                  />
                  <div className="max-h-44 space-y-2 overflow-y-auto">
                    {isLoadingReturnSales ? (
                      <div className="rounded-lg border border-dashed bg-white px-3 py-4 text-center text-sm text-muted-foreground">
                        {t('loadingRecentSales')}
                      </div>
                    ) : filteredReturnSales.length > 0 ? (
                      filteredReturnSales.slice(0, 8).map((sale) => (
                        <button
                          key={sale.id}
                          type="button"
                          onClick={() => loadReturnSaleToCart(sale)}
                          className={cn(
                            'w-full rounded-lg border bg-white px-3 py-2 text-left transition-colors hover:border-primary/40 hover:bg-primary/5',
                            selectedReturnSale?.id === sale.id && 'border-primary bg-primary/5',
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium">{sale.invoiceNumber}</p>
                              <p className="text-xs text-muted-foreground">{sale.customerName || t('customerInformation')}</p>
                            </div>
                            <span className="text-xs font-medium text-amber-700">{formatCurrency(sale.total)}</span>
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {formatDateTime(sale.saleDate)}
                          </p>
                        </button>
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed bg-white px-3 py-4 text-center text-sm text-muted-foreground">
                        {t('noEligibleSalesForReturn')}
                      </div>
                    )}
                  </div>
                  {selectedReturnSale && (
                    <div className="rounded-lg border bg-white px-3 py-2 text-xs text-muted-foreground">
                      {t('returningAgainst')} <span className="font-medium text-foreground">{selectedReturnSale.invoiceNumber}</span>
                    </div>
                  )}
                </div>
              )}

              {activeCart.customer ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{activeCart.customer.fullName}</p>
                      <p className="text-xs text-muted-foreground">{activeCart.customer.phone}</p>
                    </div>
                  </div>
                  {isReturnMode ? (
                    <Button variant="outline" size="sm" className="w-full" disabled>
                      {t('customerLinkedToOriginalSale')}
                    </Button>
                  ) : (
                    <CustomerSearch onSelect={(customer) => updateActiveCart((cart) => ({ ...cart, customer }))}>
                      <Button variant="outline" size="sm" className="w-full">
                        {t('changeCustomer')}
                      </Button>
                    </CustomerSearch>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span className="text-sm">{t('noCustomerSelected')}</span>
                  </div>
                  {isReturnMode ? (
                    <Button variant="outline" size="sm" className="w-full" disabled>
                      {t('customerWillLoadFromSelectedSale')}
                    </Button>
                  ) : (
                    <CustomerSearch onSelect={(customer) => updateActiveCart((cart) => ({ ...cart, customer }))}>
                      <Button variant="outline" size="sm" className="w-full">
                        <Search className="mr-2 h-4 w-4" />
                        {t('selectCustomer')}
                      </Button>
                    </CustomerSearch>
                  )}
                </div>
              )}
            </div>

            <ScrollArea className="flex-1 px-4 py-2">
              {activeCart.items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-8">
                  <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-muted/50">
                    <ShoppingCart className="h-10 w-10 opacity-40" />
                  </div>
                  <p className="text-sm font-medium">{t('yourCartIsEmpty')}</p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    {searchMode === 'barcode' 
                      ? t('scanBarcodeHint')
                      : t('searchProductsHint')}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeCart.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 p-2.5 rounded-xl border bg-card/50 transition-all duration-200 hover:bg-accent/30"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(item.price)}
                          </p>
                          {item.originalPrice && (
                            <span className="text-xs text-green-600">
                              {t('discount')} {formatCurrency((item.originalPrice - item.price) * item.quantity)}
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

            {activeCart.items.length > 0 && (
              <div className="border-t p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('discounts')}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDiscountDialog('cart')}
                    className="gap-1"
                  >
                    <Percent className="h-3 w-3" />
                  {activeCart.cartDiscount ? t('editDiscount') : t('addDiscount')}
                  </Button>
                </div>

                {activeCart.cartDiscount && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {t('cartDiscount')}
                      {activeCart.cartDiscount.reason && ` (${activeCart.cartDiscount.reason})`}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">
                        -
                        {activeCart.cartDiscount.type === 'percentage'
                          ? `${activeCart.cartDiscount.value}%`
                          : formatCurrency(activeCart.cartDiscount.value)}
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

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('subtotal')}</span>
                  <span>{formatCurrency(totals.subtotal)}</span>
                </div>

                {totals.cartDiscountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('discount')}</span>
                    <span className="text-green-600">{formatCurrency(-totals.cartDiscountAmount)}</span>
                  </div>
                )}

                {totals.taxes.map((tax) => (
                  <div key={tax.name} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{tax.name} ({tax.rate}%)</span>
                    <span>{formatCurrency((totals.taxableAmount * tax.rate) / 100)}</span>
                  </div>
                ))}

                <div className="flex justify-between text-xl font-bold pt-2 border-t">
                  <span>{t('total')}</span>
                  <span className="text-primary">{formatCurrency(totals.total)}</span>
                </div>

                <Button
                  className="w-full h-14 text-lg font-semibold shadow-md transition-all duration-200 hover:shadow-lg"
                  size="lg"
                  onClick={() => setIsCheckoutOpen(true)}
                >
                  <Receipt className="h-5 w-5 mr-2" />
                  {isReturnMode ? t('processReturn') : t('checkout')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDiscountDialogOpen} onOpenChange={setIsDiscountDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('applyDiscountTitle')}</DialogTitle>
            <DialogDescription>
              {discountTarget === 'cart'
                ? t('applyDiscountCartDesc')
                : t('applyDiscountItemDesc')}
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
                {t('percentage')}
              </Button>
              <Button
                variant={discountType === 'fixed' ? 'default' : 'outline'}
                onClick={() => setDiscountType('fixed')}
                className="flex-1"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                {t('fixedAmount')}
              </Button>
            </div>

            <div className="space-y-2">
              <Label>{t('discountValue')}</Label>
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
              <Label>{t('reasonOptional')}</Label>
              <Input
                placeholder={t('discountReasonExample')}
                value={discountReason}
                onChange={(e) => setDiscountReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDiscountDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={applyDiscount}>{t('applyDiscountTitle')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isCustomItemDialogOpen}
        onOpenChange={(open) => {
          setIsCustomItemDialogOpen(open)
          if (!open) {
            resetCustomItemForm()
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('addCustomItemTitle')}</DialogTitle>
            <DialogDescription>
              {t('customItemHelp')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="custom-item-name">{t('itemName')}</Label>
              <Input
                id="custom-item-name"
                value={customItemName}
                onChange={(event) => setCustomItemName(event.target.value)}
                placeholder="Divers"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="custom-item-price">{t('price')}</Label>
                <Input
                  id="custom-item-price"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={customItemPrice}
                  onChange={(event) => setCustomItemPrice(event.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="custom-item-quantity">{t('quantity')}</Label>
                <Input
                  id="custom-item-quantity"
                  type="number"
                  min="1"
                  step="1"
                  value={customItemQuantity}
                  onChange={(event) => setCustomItemQuantity(Math.max(1, parseInt(event.target.value) || 1))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCustomItemDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleAddCustomItem}>{t('addItem')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-[860px] gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <DialogTitle className="text-left text-lg font-semibold">
                  {isReturnMode ? t('processReturn') : t('checkout')}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {activeCart.items.length} {t('items')} · {activeCart.customer?.fullName || t('customerInformation')}
                </DialogDescription>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('total')}</p>
                <p className="text-2xl font-semibold tracking-tight">{formatCurrency(totals.total)}</p>
              </div>
            </div>
          </DialogHeader>

          <div className="grid max-h-[calc(100vh-8rem)] grid-cols-1 overflow-y-auto lg:grid-cols-[1fr_220px]">
            <div className="space-y-5 px-5 py-4">
              <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">{t('amountPaid')}</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      onClick={() => setAmountReceived(totals.total.toFixed(2))}
                    >
                      {t('exact')}
                    </Button>
                  </div>
                  <Input
                    value={amountReceived}
                    onChange={(event) => setAmountReceived(event.target.value)}
                    inputMode="decimal"
                    placeholder="0.00"
                    className="h-12 rounded-xl text-2xl font-semibold"
                  />
                  <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
                    {quickAmounts.map((amount) => (
                      <Button
                        key={amount}
                        type="button"
                        variant="outline"
                        className="h-9 rounded-lg px-2 text-xs"
                        onClick={() => setAmountReceived(amount.toString())}
                      >
                        {amount}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-2 rounded-xl border bg-muted/20 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('status')}</span>
                    <span className={cn('font-medium', paymentStatus === 'PAID' ? 'text-green-600' : paymentStatus === 'PARTIAL' ? 'text-amber-600' : 'text-destructive')}>
                      {paymentStatus}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('change')}</span>
                    <span className="font-medium text-green-600">{formatCurrency(changeDue)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('balanceDue')}</span>
                    <span className={cn('font-medium', balanceDue > 0 ? 'text-amber-600' : 'text-foreground')}>{formatCurrency(balanceDue)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('method')}</span>
                    <span className="font-medium">{getPaymentDisplayName(selectedPaymentMethod)}</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_0.85fr]">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t('paymentMethods')}</Label>
                    <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
                      {paymentMethods.filter((method) => method.enabled).map((method) => (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setSelectedPaymentMethod(method.id)}
                          className={cn(
                            'flex h-10 items-center justify-center gap-2 rounded-xl border px-3 text-sm transition-colors',
                            selectedPaymentMethod === method.id
                              ? 'border-primary bg-primary/8 text-primary'
                              : 'border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground',
                          )}
                        >
                          <span className="flex h-4 w-4 items-center justify-center">{method.icon}</span>
                          <span className="truncate">{method.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t('receiptFormat')}</Label>
                    <div className="flex flex-wrap gap-2">
                      {(['58mm', '80mm', 'A4'] as const).map((size) => (
                        <Button
                          key={size}
                          type="button"
                          variant={selectedReceiptSize === size ? 'default' : 'outline'}
                          className="h-9 rounded-lg px-3 text-xs"
                          onClick={() => setSelectedReceiptSize(size)}
                        >
                          {size}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 rounded-xl border bg-background p-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('subtotal')}</span>
                      <span>{formatCurrency(totals.subtotal)}</span>
                    </div>
                    {totals.cartDiscountAmount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('discount')}</span>
                        <span className="text-green-600">{formatCurrency(-totals.cartDiscountAmount)}</span>
                      </div>
                    )}
                    {totals.taxes.map((tax) => (
                      <div key={tax.name} className="flex justify-between">
                        <span className="text-muted-foreground">{tax.name} ({tax.rate}%)</span>
                        <span>{formatCurrency((totals.taxableAmount * tax.rate) / 100)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t pt-2 text-sm font-semibold">
                      <span>{t('total')}</span>
                      <span>{formatCurrency(totals.total)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Switch
                      checked={shouldPrintReceipt}
                      onCheckedChange={setShouldPrintReceipt}
                      id="print-receipt"
                    />
                    <Label htmlFor="print-receipt" className="cursor-pointer text-sm">
                      {t('printReceiptAfterCheckout')}
                    </Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('notes')}</Label>
                <Textarea
                  placeholder={t('addPaymentOrderNotes')}
                  value={activeCart.notes}
                  onChange={(event) =>
                    updateActiveCart((cart) => ({ ...cart, notes: event.target.value }))
                  }
                  className="min-h-[84px] resize-none rounded-xl"
                />
              </div>
            </div>

            <div className="flex flex-col border-l bg-muted/10">
              <div className="grid grid-cols-3 gap-2 p-3">
                {['7', '8', '9', '4', '5', '6', '1', '2', '3', 'C', '0', '.'].map((key) => (
                  <Button
                    key={key}
                    type="button"
                    variant="outline"
                    className={cn(
                      'h-11 rounded-xl text-base font-medium',
                      key === 'C' && 'border-destructive/30 text-destructive hover:bg-destructive/10',
                    )}
                    onClick={() => handleAmountKeypad(key)}
                  >
                    {key}
                  </Button>
                ))}
              </div>

              <div className="mt-auto space-y-2 border-t p-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-full justify-center rounded-xl text-sm"
                  onClick={handlePreviewCheckout}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  {t('preview')}
                </Button>
                <Button
                  type="button"
                  className="h-11 w-full rounded-xl text-sm font-semibold"
                  onClick={handleCheckout}
                  disabled={
                    activeCart.items.length === 0 ||
                    (selectedPaymentMethod === 'cash' && enteredAmount < totals.total) ||
                    (selectedPaymentMethod === 'credit' && !activeCart.customer?.id)
                  }
                >
                  <Check className="mr-2 h-4 w-4" />
                  {isReturnMode ? t('processReturn') : t('completeSale')}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCheckoutPreviewOpen} onOpenChange={setIsCheckoutPreviewOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{checkoutPreviewTitle}</DialogTitle>
            <DialogDescription>{checkoutPreviewDescription}</DialogDescription>
          </DialogHeader>
          <iframe title={t('preview')} srcDoc={checkoutPreviewHtml} className="h-[70vh] w-full rounded-xl border bg-white" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCheckoutPreviewOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handlePrintCheckoutPreview} disabled={!preparedCheckoutDocument || isPrintingCheckoutDocument}>
              <Printer className="mr-2 h-4 w-4" />
              {isPrintingCheckoutDocument ? t('printing') : t('printTicket')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </>
  )
}
