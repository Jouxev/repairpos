import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import EntityExportButton from '@/components/common/EntityExportButton'
import { Plus, Search, Package, Loader2, Tag, Printer, SlidersHorizontal, Grid3X3, List, AlertTriangle, ArrowUpDown } from 'lucide-react'
import { productService, Product } from '@/services/productService'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import CategoryManagement from './CategoryManagement'
import { useLocaleFormatters } from '@/hooks/useLocaleFormatters'
import { useAppSettings } from '@/contexts/AppSettingsContext'

export default function ProductsList() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { formatCurrency } = useLocaleFormatters()
  const { t } = useAppSettings()
  const [searchQuery, setSearchQuery] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock' | 'newest'>('newest')

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      setIsLoading(true)
      const data = await productService.getProducts()
      setProducts(data)
    } catch (error) {
      console.error('Error loading products:', error)
      toast({
        title: t('error'),
        description: t('products'),
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const filteredProducts = Array.isArray(products)
    ? products
        .filter(product =>
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (product.sku && product.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (product.barcode && product.barcode.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        .sort((a, b) => {
          switch (sortBy) {
            case 'name': return a.name.localeCompare(b.name)
            case 'price': return (b.price || 0) - (a.price || 0)
            case 'stock': return (a.quantity || 0) - (b.quantity || 0)
            case 'newest': default: return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          }
        })
    : []

  const getStockStatus = (product: Product) => {
    if (product.quantity <= 0) return { label: t('outOfStock'), variant: 'destructive' as const, icon: AlertTriangle }
    if (product.quantity <= (product.minStockAlert || 5)) return { label: t('lowStockCount', { count: product.quantity }), variant: 'secondary' as const, icon: AlertTriangle }
    return { label: t('inStockCount', { count: product.quantity }), variant: 'default' as const, icon: Package }
  }

  return (
    <div className="space-y-6 animate-enter">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t('products')}</h1>
          <p className="text-muted-foreground">{t('manageInventoryProducts')}</p>
        </div>
        <div className="flex items-center gap-2">
          <EntityExportButton entity="products" />
          <Button
            variant="outline"
            onClick={() => navigate('/products/labels')}
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            {t('printLabels')}
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsCategoryDialogOpen(true)}
            className="gap-2"
          >
            <Tag className="h-4 w-4" />
            {t('categories')}
          </Button>
          <Button onClick={() => navigate('/products/new')} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('addProduct')}
          </Button>
        </div>
      </div>

      {/* Filters & Controls */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('searchProductsPlaceholderShort')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-lg border bg-background p-1">
                <Button
                  type="button"
                  size="sm"
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  className="h-8 px-2"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  className="h-8 px-2"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg border bg-background px-2 py-1">
                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="bg-transparent text-sm font-medium outline-none cursor-pointer"
                >
                  <option value="newest">{t('newest')}</option>
                  <option value="name">{t('name')}</option>
                  <option value="price">{t('price')}</option>
                  <option value="stock">{t('stock')}</option>
                </select>
              </div>
              <Badge variant="secondary" className="text-xs">
                {filteredProducts.length} {t('products')}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Content */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{t('loadingProducts')}</p>
          </div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="font-medium">{t('noProductsFound')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('tryDifferentSearch')}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate('/products/new')}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('addProduct')}
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map((product, index) => {
            const stockStatus = getStockStatus(product)
            const StockIcon = stockStatus.icon
            return (
              <div
                key={product.id}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-5 transition-all duration-300 hover-lift cursor-pointer",
                  product.quantity <= 0 && "opacity-70 border-destructive/30",
                  product.quantity > 0 && product.quantity <= (product.minStockAlert || 5) && "border-amber-500/30",
                )}
                onClick={() => navigate(`/products/${product.id}`)}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                
                <div className="relative">
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                      <Package className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={stockStatus.variant} className="text-[10px] gap-1">
                        <StockIcon className="h-3 w-3" />
                        {stockStatus.label}
                      </Badge>
                      {product.barcode && (
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {product.barcode}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-semibold leading-tight line-clamp-2">{product.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {product.sku || t('noSku')}
                      {product.category?.name && (
                        <> · <span className="font-medium">{product.category.name}</span></>
                      )}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-4">
                    <span className="text-xl font-bold tracking-tight text-primary">
                      {formatCurrency(product.price || 0)}
                    </span>
                    <span className={cn(
                      "text-xs font-medium",
                      product.quantity > 0 ? "text-success" : "text-destructive"
                    )}>
                      {product.quantity > 0 ? `${product.quantity} ${t('inStock')}` : t('outOfStock')}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredProducts.map((product) => {
            const stockStatus = getStockStatus(product)
            const StockIcon = stockStatus.icon
            return (
              <div
                key={product.id}
                className={cn(
                  "flex items-center justify-between rounded-xl border border-border/50 bg-card p-4 transition-all duration-200 hover:bg-accent/50 cursor-pointer hover-lift",
                  product.quantity <= 0 && "opacity-70 border-destructive/30",
                )}
                onClick={() => navigate(`/products/${product.id}`)}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{product.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {product.sku || t('noSku')}
                      </span>
                      {product.category?.name && (
                        <>
                          <span className="text-muted-foreground">·</span>
                          <Badge variant="outline" className="text-[10px]">
                            {product.category.name}
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(product.price || 0)}</p>
                    <Badge variant={stockStatus.variant} className="text-[10px] gap-1 mt-1">
                      <StockIcon className="h-3 w-3" />
                      {stockStatus.label}
                    </Badge>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50 opacity-0 transition-opacity group-hover:opacity-100">
                    <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Category Management Dialog */}
      <CategoryManagement
        isOpen={isCategoryDialogOpen}
        onClose={() => setIsCategoryDialogOpen(false)}
        onCategoriesUpdated={loadProducts}
      />
    </div>
  )
}