import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Barcode, Edit, ImageIcon, MapPin, Package, Printer, Tag, Truck } from 'lucide-react'
import BarcodeRenderer from 'react-barcode'
import PrintLabelDialog from '@/components/products/PrintLabelDialog'
import { productService, Product } from '@/services/productService'
import { shopSettingsService } from '@/services/shopSettingsService'
import { getImageUrl } from '@/utils/imageUpload'
import { toast } from 'sonner'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { useLocaleFormatters } from '@/hooks/useLocaleFormatters'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useAppSettings()
  const { formatCurrency } = useLocaleFormatters()
  const [showPrintDialog, setShowPrintDialog] = useState(false)
  const [product, setProduct] = useState<Product | null>(null)
  const [storeInfo, setStoreInfo] = useState({
    name: 'RepairPro Store',
    address: '',
    phone: '',
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      if (!id) {
        return
      }

      try {
        setIsLoading(true)
        const [productResult, shopSettings] = await Promise.all([
          productService.getProductById(id),
          shopSettingsService.getSettings(),
        ])

        const normalizedProduct = (productResult as any)?.data || productResult
        setProduct(normalizedProduct || null)
        setStoreInfo({
          name: shopSettings.shopName || 'RepairPro Store',
          address: shopSettings.shopAddress || '',
          phone: shopSettings.shopPhone || '',
        })
      } catch (error) {
        console.error('Failed to load product details:', error)
        toast.error(t('productNotFoundText'))
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [id])

  if (isLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <p className="text-muted-foreground">{t('loadingProduct')}</p>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/products')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t('productNotFoundText')}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/products')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
          <p className="text-muted-foreground">{product.sku || t('noSkuAssigned')}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowPrintDialog(true)}>
            <Printer className="mr-2 h-4 w-4" />
            {t('printLabel')}
          </Button>
          <Button onClick={() => navigate(`/products/${product.id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            {t('editProduct')}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t('productImage')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-hidden rounded-2xl border bg-muted">
              {getImageUrl(product.image) ? (
                <img
                  src={getImageUrl(product.image) || ''}
                  alt={product.name}
                  className="h-[280px] w-full object-cover"
                />
              ) : (
                <div className="flex h-[280px] items-center justify-center">
                  <ImageIcon className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="grid gap-3">
              <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
                <span className="text-sm text-muted-foreground">{t('status')}</span>
                <Badge variant={product.isActive ? 'default' : 'secondary'}>
                  {product.isActive ? t('active') : t('inactive')}
                </Badge>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
                <span className="text-sm text-muted-foreground">{t('barcode')}</span>
                <span className="text-sm font-medium">{product.barcode || t('notSet')}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
                <span className="text-sm text-muted-foreground">{t('location')}</span>
                <span className="text-sm font-medium">{product.location || t('notSet')}</span>
              </div>
            </div>
            {product.barcode && (
              <div className="rounded-2xl border bg-background px-4 py-5 text-center">
                <p className="mb-3 text-sm font-medium text-muted-foreground">{t('scannableBarcode')}</p>
                <div className="overflow-x-auto">
                  <BarcodeRenderer
                    value={product.barcode}
                    format="CODE128"
                    width={1.5}
                    height={54}
                    fontSize={14}
                    margin={0}
                    displayValue
                    background="transparent"
                    lineColor="#111827"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('stockLevel')}</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{product.quantity}</div>
                <p className="text-xs text-muted-foreground">{t('unitsAvailable')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('salePrice')}</CardTitle>
                <Tag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(Number(product.salePrice || 0))}</div>
                <p className="text-xs text-muted-foreground">{t('primarySellingPrice')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('costPrice')}</CardTitle>
                <Truck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(Number(product.costPrice || 0))}</div>
                <p className="text-xs text-muted-foreground">{t('purchaseCostPerUnit')}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('productDetails')}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Package className="mt-1 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('productName')}</p>
                    <p className="text-base font-semibold">{product.name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Tag className="mt-1 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">SKU</p>
                    <p className="text-base">{product.sku || t('notSet')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Barcode className="mt-1 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('barcode')}</p>
                    <p className="text-base">{product.barcode || t('notSet')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="mt-1 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('storageLocation')}</p>
                    <p className="text-base">{product.location || t('notSet')}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('category')}</p>
                  <p className="text-base">{product.category?.name || t('noCategoryAssigned')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('suppliers')}</p>
                  <p className="text-base">{product.supplier?.name || t('noSupplierAssigned')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('lowStockItems')}</p>
                  <p className="text-base">{product.minStockAlert ?? 0}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('description')}</p>
                  <p className="text-base leading-7">{product.description || t('noDescriptionProvided')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('pricingTiers')}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border p-4">
                <p className="text-sm text-muted-foreground">{t('primaryPrice')}</p>
                <p className="mt-2 text-2xl font-bold">{formatCurrency(Number(product.salePrice || 0))}</p>
              </div>
              <div className="rounded-xl border p-4">
                <p className="text-sm text-muted-foreground">{t('priceTier2')}</p>
                <p className="mt-2 text-2xl font-bold">{formatCurrency(Number(product.salePrice2 || 0))}</p>
              </div>
              <div className="rounded-xl border p-4">
                <p className="text-sm text-muted-foreground">{t('priceTier3')}</p>
                <p className="mt-2 text-2xl font-bold">{formatCurrency(Number(product.salePrice3 || 0))}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <PrintLabelDialog
        open={showPrintDialog}
        onOpenChange={setShowPrintDialog}
        product={product}
        storeInfo={storeInfo}
      />
    </div>
  )
}
