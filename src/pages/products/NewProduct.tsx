import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Save, Package, Upload, X, ImageIcon, Barcode, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { productService, CreateProductData } from '@/services/productService'
import { categoryService, Category } from '@/services/categoryService'
import { supplierService, Supplier } from '@/services/supplierService'
import { getImageUrl, saveBase64Image } from '@/utils/imageUpload'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { useLocaleFormatters } from '@/hooks/useLocaleFormatters'

interface NewProductProps {
  onProductCreated?: (product: any) => void
  inDialog?: boolean
}

// Helper function to generate barcode
const generateBarcode = (length: number = 12): string => {
  const digits = '0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += digits.charAt(Math.floor(Math.random() * digits.length))
  }
  return result
}

// Helper function to generate SKU
const generateSKU = (productName: string, categoryName?: string): string => {
  const timestamp = Date.now().toString(36).toUpperCase()
  const randomChars = Math.random().toString(36).substring(2, 5).toUpperCase()
  
  // Add category prefix if available
  let prefix = 'SKU'
  if (categoryName) {
    prefix = categoryName.substring(0, 3).toUpperCase()
  } else if (productName) {
    prefix = productName.substring(0, 3).toUpperCase()
  }
  
  return `${prefix}-${timestamp}-${randomChars}`
}

export default function NewProduct({ onProductCreated, inDialog = false }: NewProductProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useAppSettings()
  const { formatCurrency } = useLocaleFormatters()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null)
  const [imageRemoved, setImageRemoved] = useState(false)
  
  // Check if we're in edit mode
  const pathname = location.pathname
  const isEdit = pathname.includes('/edit')
  const productId = isEdit ? pathname.split('/')[pathname.split('/').length - 2] : null
  
  const [formData, setFormData] = useState<CreateProductData>({
    name: '',
    sku: '',
    barcode: '',
    description: '',
    categoryId: '',
    supplierId: '',
    quantity: 0,
    minStockAlert: 1,
    costPrice: 0,
    salePrice: 0,
    salePrice2: 0,
    salePrice3: 0,
    isActive: true,
    location: '',
  })

  // Check if we came from purchase page
  const fromPurchase = location.state?.fromPurchase

  useEffect(() => {
    loadCategories()
    loadSuppliers()
    
    // If we're in edit mode, load the product data
    if (isEdit && productId) {
      loadExistingProduct(productId)
    }
  }, [isEdit, productId])
  
  const loadExistingProduct = async (id: string) => {
    try {
      setIsLoading(true)
      const productResult = await productService.getProductById(id)
      const product = (productResult as any)?.data || productResult

      if (product) {
        setFormData({
          name: product.name || '',
          sku: product.sku || '',
          barcode: product.barcode || '',
          description: product.description || '',
          categoryId: product.categoryId || '',
          supplierId: product.supplierId || '',
          quantity: product.quantity || 0,
          minStockAlert: product.minStockAlert || 1,
          costPrice: product.costPrice || 0,
          salePrice: product.salePrice || 0,
          salePrice2: product.salePrice2 || 0,
          salePrice3: product.salePrice3 || 0,
          isActive: product.isActive !== false,
          location: product.location || '',
        })
        if (product.image) {
          setExistingImageUrl(product.image)
          setImagePreview(getImageUrl(product.image))
        }
        setImageRemoved(false)
      }
    } catch (error) {
      console.error('Error loading product:', error)
      toast.error('Failed to load product data')
    } finally {
      setIsLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const data = await categoryService.getCategories({ isActive: true })
      setCategories(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const loadSuppliers = async () => {
    try {
      const data = await supplierService.getSuppliers({ isActive: true })
      setSuppliers(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error loading suppliers:', error)
    }
  }

  const handleChange = (field: keyof CreateProductData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error(t('invalidImageFile'))
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      const base64String = reader.result as string
      setImagePreview(base64String)
      setImageBase64(base64String.split(',')[1]) // Remove data:image/... prefix
      setImageRemoved(false)
    }
    reader.readAsDataURL(file)
  }

  const clearImage = () => {
    setImagePreview(null)
    setImageBase64(null)
    setExistingImageUrl(null)
    setImageRemoved(true)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const generateBarcodeHandler = () => {
    const newBarcode = generateBarcode(12)
    handleChange('barcode', newBarcode)
    toast.success('Barcode generated')
  }

  const generateSKUHandler = () => {
    const category = categories.find(c => c.id === formData.categoryId)
    const newSKU = generateSKU(formData.name, category?.name)
    handleChange('sku', newSKU)
    toast.success('SKU generated')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error('Product name is required')
      return
    }

    // Auto-generate SKU if empty
    let finalSKU = formData.sku
    if (!finalSKU.trim()) {
      const category = categories.find(c => c.id === formData.categoryId)
      finalSKU = generateSKU(formData.name, category?.name)
    }

    try {
      setIsLoading(true)

      // Handle image upload if present
      let imageUrl = existingImageUrl || ''
      if (imageBase64) {
        const filename = `product_${Date.now()}.jpg`
        imageUrl = await saveBase64Image(imageBase64, filename)
      } else if (imageRemoved) {
        imageUrl = ''
      }

      const productData: CreateProductData = {
        ...formData,
        sku: finalSKU,
        image: imageUrl,
      }
      let resultProduct
      if (isEdit && productId) {
        // Update existing product
        resultProduct = await productService.updateProduct(productId, productData)
        toast.success(t('updateProduct'))
      } else {
        // Create new product
        resultProduct = await productService.createProduct(productData)
        toast.success(t('createProduct'))
      }
      
      // If we have a callback (for dialog mode), call it
      if (onProductCreated) {
        onProductCreated(resultProduct)
      }
      
      // Navigate back or to products page
      if (fromPurchase) {
        navigate('/purchases/new', { state: { refreshProducts: true } })
      } else if (!inDialog) {
        navigate('/products')
      }
    } catch (error: any) {
      toast.error(`${t('createProduct')}: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }
 
  return (
    <>
      {/* Header - only show if not in dialog */}
      {!inDialog && (
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{isEdit ? t('editProduct') : t('newProduct')}</h1>
            <p className="text-muted-foreground">{isEdit ? t('updateProductDetails') : t('addNewProductInventory')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/products')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('back')}
            </Button>
          
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Basic Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  {t('basicInformation')}
                </CardTitle>
                <CardDescription>{t('essentialProductDetails')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Product Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">{t('productName')} *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Enter product name"
                    required
                  />
                </div>

                {/* SKU and Barcode */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sku">
                      SKU
                      <span className="text-xs text-muted-foreground ml-1">(Auto-generated if empty)</span>
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="sku"
                        value={formData.sku}
                        onChange={(e) => handleChange('sku', e.target.value)}
                        placeholder="SKU-12345"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={generateSKUHandler}
                        title="Generate SKU"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="barcode">Barcode</Label>
                    <div className="flex gap-2">
                      <Input
                        id="barcode"
                        value={formData.barcode}
                        onChange={(e) => handleChange('barcode', e.target.value)}
                        placeholder="123456789012"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={generateBarcodeHandler}
                        title="Generate Barcode"
                      >
                        <Barcode className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Category and Supplier */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={formData.categoryId || 'none'}
                      onValueChange={(value) => handleChange('categoryId', value === 'none' ? '' : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Category</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supplier">Supplier</Label>
                    <Select
                      value={formData.supplierId || 'none'}
                      onValueChange={(value) => handleChange('supplierId', value === 'none' ? '' : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Supplier</SelectItem>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Enter product description"
                    rows={3}
                  />
                </div>

                {/* Active Status */}
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => handleChange('isActive', checked)}
                  />
                  <Label htmlFor="isActive">Product is active</Label>
                </div>
              </CardContent>
            </Card>

            {/* Pricing Card */}
            <Card>
              <CardHeader>
                <CardTitle>{t('pricingInventory')}</CardTitle>
                <CardDescription>{t('setPricingAndStock')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Pricing */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="costPrice">Cost Price</Label>
                    <Input
                      id="costPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.costPrice}
                      onChange={(e) => handleChange('costPrice', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salePrice">Selling Price</Label>
                    <Input
                      id="salePrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.salePrice}
                      onChange={(e) => handleChange('salePrice', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salePrice2">Sale Price 2</Label>
                    <Input
                      id="salePrice2"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.salePrice2}
                      onChange={(e) => handleChange('salePrice2', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                {/* Stock */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Initial Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="0"
                      value={formData.quantity}
                      onChange={(e) => handleChange('quantity', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minStockAlert">Min Stock Alert</Label>
                    <Input
                      id="minStockAlert"
                      type="number"
                      min="0"
                      value={formData.minStockAlert}
                      onChange={(e) => handleChange('minStockAlert', parseInt(e.target.value) || 5)}
                    />
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label htmlFor="location">Storage Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleChange('location', e.target.value)}
                    placeholder="e.g., Warehouse A, Shelf 3"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Image */}
          <div className="space-y-6">
            {/* Image Upload Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  {t('productImage')}
                </CardTitle>
                <CardDescription>{t('uploadProductImage')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {imagePreview ? (
                    <div className="space-y-3">
                      <div className="relative overflow-hidden rounded-xl border bg-muted">
                        <img
                          src={getImageUrl(imagePreview) || imagePreview}
                          alt="Product preview"
                          className="h-56 w-full object-cover"
                        />
                        <div className="absolute left-3 top-3 rounded-full bg-background/90 px-3 py-1 text-xs font-medium text-primary shadow-sm">
                          {imageBase64 ? t('newImageSelected') : t('currentImage')}
                        </div>
                        <button
                          type="button"
                          onClick={clearImage}
                          className="absolute top-3 right-3 rounded-full bg-destructive p-2 text-white shadow-sm transition hover:bg-destructive/90"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          {t('replaceImage')}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={clearImage}
                        >
                          <X className="mr-2 h-4 w-4" />
                          {t('removeImage')}
                        </Button>
                      </div>
                      <div className="rounded-xl border bg-muted/30 px-4 py-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('imageStatus')}</span>
                          <span className="font-medium">
                            {imageRemoved ? t('willBeRemoved') : imageBase64 ? t('willBeUpdated') : t('willBeKept')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full rounded-xl border-2 border-dashed border-border bg-muted/20 p-8 text-center transition hover:border-primary/40 hover:bg-primary/5"
                    >
                      <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                      <p className="mt-3 text-sm font-medium">
                        {isEdit ? t('uploadOrReplaceProductImage') : t('uploadProductImageAction')}
                      </p>
                      <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 5MB</p>
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Quick Info Card */}
            <Card>
              <CardHeader>
                <CardTitle>{t('quickInfo')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('status')}:</span>
                  <span className={formData.isActive ? 'text-green-600' : 'text-red-600'}>
                    {formData.isActive ? t('active') : t('inactive')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('stockValue')}:</span>
                  <span>{formatCurrency(formData.costPrice * formData.quantity)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Profit Margin:</span>
                  <span>
                    {formData.costPrice > 0
                      ? (((formData.salePrice - formData.costPrice) / formData.costPrice) * 100).toFixed(1)
                      : '0'}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('location')}:</span>
                  <span>{formData.location || t('notSet')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('image')}:</span>
                  <span>{imagePreview ? t('attached') : t('noImage')}</span>
                </div>
              </CardContent>
            </Card>

            {/* Submit Buttons */}
            <div className="flex flex-col gap-2">
              <Button type="submit" disabled={isLoading} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                {isEdit ? isLoading ? t('saving') : t('updateProduct') :  isLoading ? t('saving') : t('createProduct')} 
              </Button>
              {!inDialog && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/products')}
                  disabled={isLoading}
                  className="w-full"
                >
                  {t('cancel')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </form>
    </>
  )
}
