import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { categoryService, Category } from '@/services/categoryService'
import { productService, Product } from '@/services/productService'
import { printingManagementService } from '@/modules/printing/printingManagementService'
import { shopSettingsService } from '@/services/shopSettingsService'
import { supplierService, Supplier } from '@/services/supplierService'
import JsBarcode from 'jsbarcode'
import QRCode from 'qrcode'
import { ArrowLeft, Barcode, Eye, Package, Plus, Printer, Search, Tag, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PrintTemplate, PrinterRecord } from '@/types/printing'

type LayoutMode = 'simple' | 'classic' | 'compact'
type BarcodeMode = 'EAN13' | 'CODE128' | 'QR'

interface SelectedProduct extends Product {
  copies: number
}

interface LabelPreset {
  id: string
  label: string
  labelSize: string
  layoutMode: LayoutMode
  barcodeMode: BarcodeMode
  columnsPerRow: string
  showStoreName: boolean
  showPrice: boolean
  showSku: boolean
  showProductName: boolean
  productNameSize: number
  priceSize: number
  barcodeSize: number
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const labelPresets: LabelPreset[] = [
  {
    id: 'phones',
    label: 'Phones',
    labelSize: '40x60mm',
    layoutMode: 'simple',
    barcodeMode: 'CODE128',
    columnsPerRow: '3',
    showStoreName: true,
    showPrice: true,
    showSku: true,
    showProductName: true,
    productNameSize: 14,
    priceSize: 16,
    barcodeSize: 12,
  },
  {
    id: 'accessories',
    label: 'Accessories',
    labelSize: '30x50mm',
    layoutMode: 'compact',
    barcodeMode: 'EAN13',
    columnsPerRow: '4',
    showStoreName: false,
    showPrice: true,
    showSku: true,
    showProductName: true,
    productNameSize: 12,
    priceSize: 14,
    barcodeSize: 10,
  },
  {
    id: 'repair-parts',
    label: 'Repair Parts',
    labelSize: '40x60mm',
    layoutMode: 'classic',
    barcodeMode: 'CODE128',
    columnsPerRow: '3',
    showStoreName: false,
    showPrice: false,
    showSku: true,
    showProductName: true,
    productNameSize: 13,
    priceSize: 14,
    barcodeSize: 11,
  },
  {
    id: 'jewelry',
    label: 'Jewelry',
    labelSize: '58mm',
    layoutMode: 'compact',
    barcodeMode: 'QR',
    columnsPerRow: '2',
    showStoreName: true,
    showPrice: true,
    showSku: false,
    showProductName: true,
    productNameSize: 12,
    priceSize: 15,
    barcodeSize: 12,
  },
]

const normalizeBarcodeValue = (value: string, mode: BarcodeMode) => {
  const safeValue = value.replace(/\s+/g, '') || '00000000'

  if (mode === 'EAN13') {
    const digits = safeValue.replace(/\D/g, '')
    if (digits.length >= 13) return digits.slice(0, 13)
    if (digits.length === 12) return digits
    return digits.padEnd(12, '0')
  }

  return safeValue.slice(0, 64)
}

const resolveBarcodePayload = (value: string, mode: BarcodeMode) => {
  const safeValue = value.replace(/\s+/g, '') || '00000000'

  if (mode === 'QR') {
    return {
      renderMode: 'QR' as const,
      encodedValue: safeValue.slice(0, 256),
      displayValue: safeValue.slice(0, 256),
    }
  }

  if (mode === 'EAN13') {
    const digits = safeValue.replace(/\D/g, '')
    if (digits.length === 12 || digits.length >= 13) {
      const normalized = normalizeBarcodeValue(safeValue, 'EAN13')
      return {
        renderMode: 'EAN13' as const,
        encodedValue: normalized,
        displayValue: normalized,
      }
    }
  }

  const normalized = normalizeBarcodeValue(safeValue, 'CODE128')
  return {
    renderMode: 'CODE128' as const,
    encodedValue: normalized,
    displayValue: normalized,
  }
}

const svgToDataUrl = (svgMarkup: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`

const enhanceBarcodeSvg = (svgMarkup: string) =>
  svgMarkup.replace(
    '<svg ',
    '<svg shape-rendering="crispEdges" preserveAspectRatio="xMidYMid meet" style="display:block;width:100%;height:100%;" ',
  )

const generateBarcodeDataUrl = async (value: string, mode: BarcodeMode, size: number) => {
  const payload = resolveBarcodePayload(value, mode)

  if (payload.renderMode === 'QR') {
    return QRCode.toDataURL(payload.encodedValue, {
      margin: 1,
      width: Math.max(80, size * 10),
      color: { dark: '#111827', light: '#ffffff' },
    })
  }

  try {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    JsBarcode(svg, payload.encodedValue, {
      format: payload.renderMode,
      displayValue: false,
      margin: 0,
      background: '#ffffff',
      lineColor: '#111827',
      height: Math.max(28, size * 2.5),
      width: payload.renderMode === 'EAN13' ? 1.6 : 1.45,
    })
    return enhanceBarcodeSvg(svg.outerHTML)
  } catch {
    const fallbackValue = normalizeBarcodeValue(value.replace(/[^\x20-\x7E]/g, ''), 'CODE128')
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    JsBarcode(svg, fallbackValue, {
      format: 'CODE128',
      displayValue: false,
      margin: 0,
      background: '#ffffff',
      lineColor: '#111827',
      height: Math.max(28, size * 2.5),
      width: 0.2,
    })
    return enhanceBarcodeSvg(svg.outerHTML)
  }
}

const labelSizeMap: Record<string, { width: number; height: number }> = {
  '58mm': { width: 58, height: 40 },
  '80mm': { width: 80, height: 50 },
  '50x30mm': { width: 50, height: 30 },
  '48x30mm': { width: 48, height: 30 },
  '30x50mm': { width: 30, height: 50 },
  '40x60mm': { width: 40, height: 60 },
  '50x80mm': { width: 50, height: 80 },
}

const buildLabelSheetHtml = (params: {
  products: SelectedProduct[]
  labelSize: string
  columnsPerRow: number
  layoutMode: LayoutMode
  barcodeMode: BarcodeMode
  showProductName: boolean
  showBarcode: boolean
  showPrice: boolean
  showSku: boolean
  showStoreName: boolean
  productNameSize: number
  priceSize: number
  barcodeSize: number
  shopName: string
  currencySymbol: string
  barcodeAssets: Record<string, string>
}) => {
  const size = labelSizeMap[params.labelSize] || labelSizeMap['80mm']
  const isSmallLabel = size.height <= 30 || size.width <= 50
  const repeated = params.products.flatMap((product) =>
    Array.from({ length: Math.max(1, product.copies) }, () => product),
  )
  const requestedColumns = Math.max(1, params.columnsPerRow)
  const labelCount = Math.max(1, repeated.length)
  const columns = Math.min(requestedColumns, labelCount)
  const rows = Math.max(1, Math.ceil(repeated.length / columns))
  const previewGapMm = 4
  const printGapMm = 0
  const printPageWidth = size.width * columns + printGapMm * Math.max(0, columns - 1)
  const printPageHeight = size.height * rows + printGapMm * Math.max(0, rows - 1)
  const linearBarcodeHeight = isSmallLabel ? Math.max(56, params.barcodeSize * 5) : Math.max(44, params.barcodeSize * 4)
  const qrCodeHeight = isSmallLabel ? 58 : 54

  const cardClass =
    params.layoutMode === 'classic'
      ? `border:1px solid #d4d4d8;border-radius:6px;padding:${isSmallLabel ? '1.2mm' : '4mm'};`
      : params.layoutMode === 'compact'
        ? `border:1px dashed #d4d4d8;border-radius:4px;padding:${isSmallLabel ? '1mm' : '3mm'};`
        : `border:1px solid #e4e4e7;border-radius:8px;padding:${isSmallLabel ? '1.2mm' : '4mm'};box-shadow:0 1px 2px rgba(0,0,0,0.04);`

  const labelCards = repeated
    .map((product) => {
      const productName = escapeHtml(product.name || '')
      const sku = escapeHtml(product.sku || '')
      const rawBarcodeValue = product.barcode || product.sku || product.id
      const barcodePayload = resolveBarcodePayload(rawBarcodeValue, params.barcodeMode)
      const barcode = escapeHtml(barcodePayload.displayValue)
      const price = Number(product.salePrice || 0).toFixed(2)
      const barcodeAsset = params.barcodeAssets[`${params.barcodeMode}:${rawBarcodeValue}`]

      return `
        <div class="label-card" style="width:${size.width}mm;height:${size.height}mm;${cardClass}display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;background:#fff;overflow:hidden;">
          ${
            params.showStoreName
              ? `<div style="font-size:9px;font-weight:700;color:#881337;text-align:center;">${escapeHtml(params.shopName)}</div>`
              : ''
          }
          ${
            params.showProductName
              ? `<div style="font-size:${params.productNameSize}px;font-weight:700;line-height:1.2;text-align:center;color:#111827;">${productName}</div>`
              : ''
          }
          ${
            params.showPrice
              ? `<div style="font-size:${params.priceSize}px;font-weight:800;text-align:center;color:#881337;">${escapeHtml(params.currencySymbol)}${price}</div>`
              : ''
          }
          ${
            params.showSku
              ? `<div style="font-size:10px;color:#52525b;text-align:center;">SKU: ${sku || '-'}</div>`
              : ''
          }
          ${
            params.showBarcode
              ? `
                <div style="margin-top:${isSmallLabel ? '0.5mm' : '2mm'};text-align:center;${isSmallLabel ? 'display:flex;flex-direction:column;justify-content:flex-end;flex:1;' : ''}">
                  ${
                    barcodeAsset
                      ? barcodeAsset.trim().startsWith('<svg')
                        ? `<div style="display:flex;justify-content:center;align-items:center;width:100%;min-height:${linearBarcodeHeight}px;">${barcodeAsset}</div>`
                        : `<div style="display:flex;justify-content:center;align-items:center;"><img src="${barcodeAsset.startsWith('data:image/svg+xml') ? barcodeAsset : svgToDataUrl(barcodeAsset)}" alt="Barcode" style="width:100%;max-width:100%;max-height:${params.barcodeMode === 'QR' ? `${qrCodeHeight}px` : `${linearBarcodeHeight}px`};object-fit:contain;" /></div>`
                      : `<div style="padding:8px 0;font-family:monospace;font-size:${Math.max(10, params.barcodeSize)}px;color:#111827;">Generating barcode...</div>`
                  }
                  ${
                    params.barcodeMode === 'QR'
                      ? ''
                      : `<div style="margin-top:${isSmallLabel ? '0.4mm' : '1mm'};font-size:${isSmallLabel ? '8px' : '9px'};color:#71717a;">${barcode}</div>`
                  }
                </div>
              `
              : ''
          }
        </div>
      `
    })
  
  const previewCards = labelCards
    .map((card) => `<div class="preview-item">${card}</div>`)
    .join('')

  const printCards = labelCards
    .map((card) => `<div class="print-page">${card}</div>`)
    .join('')

  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <title>Label Preview</title>
      <style>
        :root {
          color-scheme: light;
        }
        * {
          box-sizing: border-box;
        }
        html, body {
          min-height: 100%;
        }
        body {
          margin: 0;
          padding: 20px;
          background: #d1d5db;
          font-family: Arial, sans-serif;
          color: #111827;
        }
        .preview-shell {
          min-height: calc(100vh - 40px);
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding: 8px 0 24px;
        }
        .sheet-frame {
          width: fit-content;
          max-width: 100%;
          padding: 8mm;
          border-radius: 6px;
          background: transparent;
        }
        .sheet {
          display: grid;
          grid-template-columns: repeat(${columns}, ${size.width}mm);
          gap: ${previewGapMm}mm;
          align-content: start;
          justify-content: center;
        }
        .preview-item {
          width: ${size.width}mm;
          height: ${size.height}mm;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .label-card {
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .print-shell {
          display: none;
        }
        .print-page {
          width: ${size.width}mm;
          height: ${size.height}mm;
          display: flex;
          justify-content: center;
          align-items: center;
          overflow: hidden;
        }
        .empty-state {
          min-width: 280px;
          padding: 32px 24px;
          border: 1px dashed #94a3b8;
          border-radius: 10px;
          background: #ffffff;
          text-align: center;
          color: #475569;
        }
        @media print {
          @page {
            size: ${size.width}mm ${size.height}mm;
            margin: 0;
          }
          html, body {
            width: auto;
            height: auto;
            min-height: 0;
            overflow: visible;
          }
          body {
            margin: 0;
            padding: 0;
            background: #ffffff;
          }
          .preview-shell {
            display: none !important;
          }
          .print-shell {
            display: block !important;
          }
          .print-page {
            width: ${size.width}mm;
            height: ${size.height}mm;
            page-break-after: always;
            break-after: page;
          }
          .print-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          .print-page .label-card {
            width: ${size.width}mm !important;
            height: ${size.height}mm !important;
            margin: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="preview-shell">
        <div class="sheet-frame">
          <div class="sheet">${previewCards || '<div class="empty-state">No labels selected</div>'}</div>
        </div>
      </div>
      <div class="print-shell">
        ${printCards || '<div class="empty-state">No labels selected</div>'}
      </div>
    </body>
  </html>`
}

const openLabelPreviewWindow = (html: string, title: string) => {
  const previewWindow = window.open('', '_blank', 'width=1200,height=900')

  if (!previewWindow) {
    throw new Error('Unable to open label preview window. Please allow popups for printing.')
  }

  previewWindow.document.write(html)
  previewWindow.document.close()
  previewWindow.document.title = title
  previewWindow.focus()

  previewWindow.onload = () => {
    previewWindow.focus()
    window.setTimeout(() => {
      previewWindow.print()
    }, 350)
  }
}

export default function ProductLabels() {
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([])
  const [stagedProductIds, setStagedProductIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState('all')
  const [selectedSupplierId, setSelectedSupplierId] = useState('all')
  const [isLoading, setIsLoading] = useState(true)

  const [labelSize, setLabelSize] = useState('80mm')
  const [barcodeMode, setBarcodeMode] = useState<BarcodeMode>('CODE128')
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('simple')
  const [columnsPerRow, setColumnsPerRow] = useState('1')
  const [showProductName, setShowProductName] = useState(true)
  const [showBarcode, setShowBarcode] = useState(true)
  const [showPrice, setShowPrice] = useState(true)
  const [showSku, setShowSku] = useState(false)
  const [showStoreName, setShowStoreName] = useState(true)
  const [productNameSize, setProductNameSize] = useState(14)
  const [priceSize, setPriceSize] = useState(16)
  const [barcodeSize, setBarcodeSize] = useState(12)
  const [shopName, setShopName] = useState('RepairPro Shop')
  const [currencySymbol, setCurrencySymbol] = useState('Da')
  const [selectedPresetId, setSelectedPresetId] = useState<string>('phones')
  const [barcodeAssets, setBarcodeAssets] = useState<Record<string, string>>({})
  const [defaultLabelTemplate, setDefaultLabelTemplate] = useState<PrintTemplate | null>(null)
  const [defaultLabelPrinter, setDefaultLabelPrinter] = useState<PrinterRecord | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        const [productResult, categoryResult, supplierResult, shopSettings] = await Promise.all([
          productService.getProducts(),
          categoryService.getCategories(),
          supplierService.getSuppliers(),
          shopSettingsService.getSettings(),
        ])

        const normalizedProducts = Array.isArray(productResult)
          ? productResult
          : ((productResult as { data?: Product[] })?.data || [])

        setProducts(normalizedProducts)
        setCategories(categoryResult)
        setSuppliers(supplierResult)
        setShopName(shopSettings.shopName || 'RepairPro Shop')
        setCurrencySymbol(shopSettings.currencySymbol || 'Da')
      } catch (error) {
        console.error('Failed to load label page data:', error)
        toast.error('Failed to load products for labels')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  useEffect(() => {
    const loadPrintingConfiguration = async () => {
      try {
        const resolved = await printingManagementService.resolveDocumentConfiguration('PRODUCT_LABEL')
        setDefaultLabelTemplate(resolved.template)
        setDefaultLabelPrinter(resolved.printer || null)
      } catch (error) {
        console.warn('No default product label configuration available:', error)
        setDefaultLabelTemplate(null)
        setDefaultLabelPrinter(null)
      }
    }

    loadPrintingConfiguration()
  }, [])

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        !searchQuery ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.barcode?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategoryId === 'all' || product.categoryId === selectedCategoryId
      const matchesSupplier = selectedSupplierId === 'all' || product.supplierId === selectedSupplierId

      return matchesSearch && matchesCategory && matchesSupplier
    })
  }, [products, searchQuery, selectedCategoryId, selectedSupplierId])

  const availableProducts = useMemo(
    () => filteredProducts.filter((product) => !selectedProducts.some((selected) => selected.id === product.id)),
    [filteredProducts, selectedProducts],
  )

  const barcodeJobs = useMemo(
    () =>
      Array.from(
        new Set(
          selectedProducts.map((product) => `${barcodeMode}:${product.barcode || product.sku || product.id}`),
        ),
      ),
    [selectedProducts, barcodeMode],
  )

  useEffect(() => {
    let isCancelled = false

    const buildAssets = async () => {
      if (!showBarcode || selectedProducts.length === 0) {
        setBarcodeAssets({})
        return
      }

      try {
        const entries = await Promise.all(
          barcodeJobs.map(async (jobKey) => {
            const [mode, ...valueParts] = jobKey.split(':')
            const value = valueParts.join(':')
            const dataUrl = await generateBarcodeDataUrl(value, mode as BarcodeMode, barcodeSize)
            return [jobKey, dataUrl] as const
          }),
        )

        if (!isCancelled) {
          setBarcodeAssets(Object.fromEntries(entries))
        }
      } catch (error) {
        console.error('Failed to generate label barcode assets:', error)
        if (!isCancelled) {
          setBarcodeAssets({})
        }
      }
    }

    buildAssets()

    return () => {
      isCancelled = true
    }
  }, [barcodeJobs, barcodeSize, selectedProducts, showBarcode])

  const previewHtml = useMemo(
    () =>
      buildLabelSheetHtml({
        products: selectedProducts.length > 0 ? selectedProducts : [],
        labelSize,
        columnsPerRow: Number(columnsPerRow),
        layoutMode,
        barcodeMode,
        showProductName,
        showBarcode,
        showPrice,
        showSku,
        showStoreName,
        productNameSize,
        priceSize,
        barcodeSize,
        shopName,
        currencySymbol,
        barcodeAssets,
      }),
    [
      selectedProducts,
      labelSize,
      columnsPerRow,
      layoutMode,
      barcodeMode,
      showProductName,
      showBarcode,
      showPrice,
      showSku,
      showStoreName,
      productNameSize,
      priceSize,
      barcodeSize,
      shopName,
      currencySymbol,
      barcodeAssets,
    ],
  )

  const applyPreset = (presetId: string) => {
    const preset = labelPresets.find((item) => item.id === presetId)
    if (!preset) return

    setSelectedPresetId(preset.id)
    setLabelSize(preset.labelSize)
    setLayoutMode(preset.layoutMode)
    setBarcodeMode(preset.barcodeMode)
    setColumnsPerRow(preset.columnsPerRow)
    setShowStoreName(preset.showStoreName)
    setShowPrice(preset.showPrice)
    setShowSku(preset.showSku)
    setShowProductName(preset.showProductName)
    setProductNameSize(preset.productNameSize)
    setPriceSize(preset.priceSize)
    setBarcodeSize(preset.barcodeSize)
  }

  const addProduct = (product: Product) => {
    setSelectedProducts((current) => {
      const existing = current.find((item) => item.id === product.id)
      if (existing) {
        return current.map((item) => (item.id === product.id ? { ...item, copies: item.copies + 1 } : item))
      }
      return [...current, { ...product, copies: 1 }]
    })
  }

  const addAllFiltered = () => {
    availableProducts.forEach(addProduct)
    setStagedProductIds([])
    toast.success(`Added ${availableProducts.length} product${availableProducts.length === 1 ? '' : 's'} to labels`)
  }

  const addStagedProducts = () => {
    const stagedProducts = availableProducts.filter((product) => stagedProductIds.includes(product.id))
    stagedProducts.forEach(addProduct)
    setStagedProductIds([])
    toast.success(`Added ${stagedProducts.length} product${stagedProducts.length === 1 ? '' : 's'} to labels`)
  }

  const updateCopies = (productId: string, copies: number) => {
    setSelectedProducts((current) =>
      current.map((item) => (item.id === productId ? { ...item, copies: Math.max(1, copies) } : item)),
    )
  }

  const removeSelected = (productId: string) => {
    setSelectedProducts((current) => current.filter((item) => item.id !== productId))
  }

  const updateAllCopies = (copies: number) => {
    setSelectedProducts((current) => current.map((item) => ({ ...item, copies: Math.max(1, copies) })))
  }

  const handlePrintLabels = async () => {
    if (selectedProducts.length === 0) {
      toast.error('Select at least one product to print labels')
      return
    }

    try {
      openLabelPreviewWindow(previewHtml, `${shopName || 'Store'} - Print Labels`)
      toast.success('Label preview opened')
    } catch (error) {
      console.error('Failed to print labels:', error)
      toast.error('Failed to open label preview')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => navigate('/products')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Print Labels</h1>
              <p className="text-muted-foreground">Build, preview, and print detailed product labels from a dedicated workspace.</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{selectedProducts.length} selected</Badge>
          {defaultLabelTemplate && (
            <Badge variant="secondary">Default: {defaultLabelTemplate.name}</Badge>
          )}
          <Button onClick={handlePrintLabels}>
            <Printer className="mr-2 h-4 w-4" />
            Print Labels
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.7fr_420px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Select Products</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border bg-muted/30 px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Store name</span>
                  <span className="font-medium">{shopName || 'Not configured'}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Currency</span>
                  <span className="font-medium">{currencySymbol || '-'}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Settings default template</span>
                  <span className="font-medium">{defaultLabelTemplate?.name || 'Not configured'}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Assigned printer</span>
                  <span className="font-medium">{defaultLabelPrinter?.name || 'Print dialog fallback'}</span>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by name, barcode, or SKU..."
                  className="pl-10"
                />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                  <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                  <SelectTrigger><SelectValue placeholder="Supplier" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Suppliers</SelectItem>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={addAllFiltered} disabled={availableProducts.length === 0}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add All
                </Button>
              </div>
              <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-3 text-sm">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{filteredProducts.length} results</Badge>
                  <span className="text-muted-foreground">{stagedProductIds.length} selected for bulk add</span>
                </div>
                <Button size="sm" onClick={addStagedProducts} disabled={stagedProductIds.length === 0}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Selected
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Selected Products ({selectedProducts.length})</CardTitle>
                {selectedProducts.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      defaultValue="1"
                      className="w-20"
                      onBlur={(event) => updateAllCopies(Number(event.target.value || 1))}
                    />
                    <Button variant="outline" size="sm" onClick={() => updateAllCopies(1)}>
                      Reset Copies
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setSelectedProducts([])}>
                      Clear All
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[420px] pr-4">
                {selectedProducts.length === 0 ? (
                  <div className="flex h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed text-center text-muted-foreground">
                    <Printer className="mb-4 h-12 w-12 opacity-40" />
                    <p className="font-medium">No products selected</p>
                    <p className="text-sm">Search and click products below to add them</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedProducts.map((product) => (
                      <div key={product.id} className="rounded-2xl border p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {product.sku || 'No SKU'} · {product.barcode || 'No barcode'}
                            </p>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => removeSelected(product.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="mt-3 grid gap-3 md:grid-cols-3">
                          <div className="rounded-xl bg-muted/50 px-3 py-2 text-sm">
                            Price: {currencySymbol}{Number(product.salePrice || 0).toFixed(2)}
                          </div>
                          <div className="rounded-xl bg-muted/50 px-3 py-2 text-sm">
                            Stock: {product.quantity}
                          </div>
                          <div className="flex items-center gap-2">
                            <Label>Copies</Label>
                            <Input
                              type="number"
                              min={1}
                              value={product.copies}
                              onChange={(event) => updateCopies(product.id, Number(event.target.value || 1))}
                              className="w-24"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Available Products</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[360px] pr-4">
                <div className="space-y-3">
                  {isLoading ? (
                    <p className="text-sm text-muted-foreground">Loading products...</p>
                  ) : filteredProducts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No matching products found.</p>
                  ) : (
                    filteredProducts.map((product) => {
                      const isAlreadyAdded = selectedProducts.some((selected) => selected.id === product.id)
                      return (
                      <div
                        key={product.id}
                        className={cn(
                          'flex items-center justify-between rounded-2xl border p-4 transition hover:border-primary/40 hover:bg-primary/5',
                          isAlreadyAdded && 'border-primary/20 bg-primary/5',
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={isAlreadyAdded || stagedProductIds.includes(product.id)}
                            disabled={isAlreadyAdded}
                            onCheckedChange={(checked) =>
                              setStagedProductIds((current) =>
                                checked
                                  ? [...current, product.id]
                                  : current.filter((id) => id !== product.id),
                              )
                            }
                          />
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                            <Package className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {product.category?.name || 'No category'} · {product.supplier?.name || 'No supplier'}
                            </p>
                            {isAlreadyAdded && (
                              <p className="mt-1 text-xs font-medium text-primary">Already added to bulk labels</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-semibold">{currencySymbol}{Number(product.salePrice || 0).toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">{product.quantity} in stock</p>
                          </div>
                          <Button size="sm" onClick={() => addProduct(product)} disabled={isAlreadyAdded}>
                            <Plus className="mr-2 h-4 w-4" />
                            {isAlreadyAdded ? 'Added' : 'Add'}
                          </Button>
                        </div>
                      </div>
                    )})
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <Card className="sticky top-6 h-fit">
          <CardHeader>
            <CardTitle>Label Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Quick Presets</Label>
              <div className="grid grid-cols-2 gap-2">
                {labelPresets.map((preset) => (
                  <Button
                    key={preset.id}
                    type="button"
                    variant={selectedPresetId === preset.id ? 'default' : 'outline'}
                    className="justify-start"
                    onClick={() => applyPreset(preset.id)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Label Size</Label>
              <Select value={labelSize} onValueChange={setLabelSize}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.keys(labelSizeMap).map((size) => (
                    <SelectItem key={size} value={size}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Barcode Type</Label>
              <Select value={barcodeMode} onValueChange={(value) => setBarcodeMode(value as BarcodeMode)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EAN13">EAN13</SelectItem>
                  <SelectItem value="CODE128">CODE128</SelectItem>
                  <SelectItem value="QR">QR</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Design Mode</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['classic', 'compact', 'simple'] as LayoutMode[]).map((mode) => (
                  <Button
                    key={mode}
                    type="button"
                    variant={layoutMode === mode ? 'default' : 'outline'}
                    className={cn('capitalize', layoutMode === mode && 'shadow-sm')}
                    onClick={() => setLayoutMode(mode)}
                  >
                    {mode}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Columns per Row</Label>
              <Select value={columnsPerRow} onValueChange={setColumnsPerRow}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Column</SelectItem>
                  <SelectItem value="2">2 Columns</SelectItem>
                  <SelectItem value="3">3 Columns</SelectItem>
                  <SelectItem value="4">4 Columns</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between"><Label>Product Name</Label><Switch checked={showProductName} onCheckedChange={setShowProductName} /></div>
              <div className="flex items-center justify-between"><Label>Barcode</Label><Switch checked={showBarcode} onCheckedChange={setShowBarcode} /></div>
              <div className="flex items-center justify-between"><Label>Price</Label><Switch checked={showPrice} onCheckedChange={setShowPrice} /></div>
              <div className="flex items-center justify-between"><Label>SKU</Label><Switch checked={showSku} onCheckedChange={setShowSku} /></div>
              <div className="flex items-center justify-between"><Label>Store Name</Label><Switch checked={showStoreName} onCheckedChange={setShowStoreName} /></div>
            </div>

            <div className="space-y-4 rounded-2xl border p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Product Name Size</span>
                  <span className="text-primary">{productNameSize}px</span>
                </div>
                <Input type="range" min={10} max={24} value={productNameSize} onChange={(event) => setProductNameSize(Number(event.target.value))} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Price Size</span>
                  <span className="text-primary">{priceSize}px</span>
                </div>
                <Input type="range" min={10} max={28} value={priceSize} onChange={(event) => setPriceSize(Number(event.target.value))} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Barcode Size</span>
                  <span className="text-primary">{barcodeSize}px</span>
                </div>
                <Input type="range" min={8} max={20} value={barcodeSize} onChange={(event) => setBarcodeSize(Number(event.target.value))} />
              </div>
            </div>

            <div className="rounded-2xl border p-3">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Eye className="h-4 w-4 text-primary" />
                  Live Preview
                </div>
                <Badge variant="outline">{labelSize}</Badge>
              </div>
              <iframe title="Label Preview" srcDoc={previewHtml} className="h-[320px] w-full rounded-xl border bg-white" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
