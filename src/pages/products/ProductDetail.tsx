import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit, Package, Printer, Tag } from 'lucide-react'
import PrintLabelDialog from '@/components/products/PrintLabelDialog'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [showPrintDialog, setShowPrintDialog] = useState(false)

  // Mock data - in real app, fetch from API
  const product = {
    id: id || '1',
    name: 'iPhone Screen',
    sku: 'SCR-001',
    description: 'High-quality replacement screen for iPhone models',
    salePrice: 49.99,
    cost: 25.00,
    stock: 15,
    barcode: '123456789012',
    category: 'Screens',
    supplier: 'TechParts Inc.',
  }

  // Mock store info - in real app, get from settings
  const storeInfo = {
    name: 'RepairPro Store',
    address: '123 Main St, City, Country',
    phone: '+1 234 567 890',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/products')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
          <p className="text-muted-foreground">{product.sku}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowPrintDialog(true)}>
            <Printer className="mr-2 h-4 w-4" />
            Print Label
          </Button>
          <Button onClick={() => navigate(`/products/${product.id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Level</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{product.stock}</div>
            <p className="text-xs text-muted-foreground">units available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sale Price</CardTitle>
            <span className="h-4 w-4 text-muted-foreground">$</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${product.salePrice ? product.salePrice.toFixed(2) : '0.00'}</div>
            <p className="text-xs text-muted-foreground">per unit</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost Price</CardTitle>
            <span className="h-4 w-4 text-muted-foreground">$</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${product.cost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">per unit</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Category</p>
              <p className="text-lg">{product.category}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Supplier</p>
              <p className="text-lg">{product.supplier}</p>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Description</p>
            <p className="text-lg">{product.description}</p>
          </div>
        </CardContent>
      </Card>

      <PrintLabelDialog
        open={showPrintDialog}
        onOpenChange={setShowPrintDialog}
        product={product}
        storeInfo={storeInfo}
      />
    </div>
  )
}
