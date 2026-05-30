import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PrintTemplate } from '@/types/printing'
import { labelSizes, generateLabelHTML, LabelData } from '@/services/labelPrintingService'
import { Printer, Eye, Save, RotateCcw, Barcode, Type, DollarSign, Store } from 'lucide-react'

interface LabelBuilderProps {
  template: PrintTemplate
  onSave: (template: PrintTemplate) => void
  onCancel: () => void
}

export default function LabelBuilder({ template, onSave, onCancel }: LabelBuilderProps) {
  const [currentTemplate, setCurrentTemplate] = useState<PrintTemplate>({ ...template })
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState<LabelData>({
    productName: 'Sample Product',
    price: 99.99,
    currency: '$',
    barcode: '123456789012',
    sku: 'SKU-001',
    storeName: 'My Store',
  })

  const handleSizeChange = (sizeName: string) => {
    const size = labelSizes.find(s => s.name === sizeName)
    if (size) {
      setCurrentTemplate(prev => ({
        ...prev,
        paperSize: size.name as PrintTemplate['paperSize'],
      }))
    }
  }

  const handleFieldToggle = (field: string, show: boolean) => {
    setCurrentTemplate(prev => ({
      ...prev,
      bodyFields: prev.bodyFields.map(f => {
        if (f.id === field) {
          return { ...f, hidden: !show }
        }
        return f
      }),
    }))
  }

  const handleSave = () => {
    onSave(currentTemplate)
  }

  const handlePreview = () => {
    setShowPreview(true)
  }

  const previewHTML = showPreview ? generateLabelHTML(currentTemplate, previewData) : ''

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {template.id ? 'Edit Label Template' : 'Create Label Template'}
          </h2>
          <p className="text-muted-foreground">
            {template.id ? 'Modify your label design' : 'Design a new product label'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePreview}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Template
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Settings Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5" />
                Label Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input
                  value={currentTemplate.name}
                  onChange={(e) => setCurrentTemplate(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter template name"
                />
              </div>

              <div className="space-y-2">
                <Label>Label Size</Label>
                <Select value={currentTemplate.paperSize} onValueChange={handleSizeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select label size" />
                  </SelectTrigger>
                  <SelectContent>
                    {labelSizes.map((size) => (
                      <SelectItem key={size.name} value={size.name}>
                        {size.name} ({size.width}mm x {size.height}mm)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={currentTemplate.description || ''}
                  onChange={(e) => setCurrentTemplate(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Template description (optional)"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="h-5 w-5" />
                Content Fields
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4" />
                  <span>Store Name</span>
                </div>
                <Switch
                  checked={!currentTemplate.bodyFields.find(f => f.id === 'store-name')?.hidden}
                  onCheckedChange={(checked) => handleFieldToggle('store-name', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  <span>Product Name</span>
                </div>
                <Switch
                  checked={!currentTemplate.bodyFields.find(f => f.id === 'product-name')?.hidden}
                  onCheckedChange={(checked) => handleFieldToggle('product-name', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span>Price</span>
                </div>
                <Switch
                  checked={!currentTemplate.bodyFields.find(f => f.id === 'price')?.hidden}
                  onCheckedChange={(checked) => handleFieldToggle('price', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Barcode className="h-4 w-4" />
                  <span>Barcode</span>
                </div>
                <Switch
                  checked={!currentTemplate.bodyFields.find(f => f.id === 'barcode')?.hidden}
                  onCheckedChange={(checked) => handleFieldToggle('barcode', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Preview Data</Label>
                  <Input
                    value={previewData.productName}
                    onChange={(e) => setPreviewData(prev => ({ ...prev, productName: e.target.value }))}
                    placeholder="Product name"
                  />
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={previewData.price}
                      onChange={(e) => setPreviewData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                      placeholder="Price"
                    />
                    <Input
                      value={previewData.barcode}
                      onChange={(e) => setPreviewData(prev => ({ ...prev, barcode: e.target.value }))}
                      placeholder="Barcode"
                    />
                  </div>
                </div>

                <div className="border rounded-lg p-4 bg-gray-50">
                  <div
                    className="bg-white border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden"
                    style={{
                      width: '100%',
                      aspectRatio: currentTemplate.paperSize === '58mm' ? '58/40' : currentTemplate.paperSize === '80mm' ? '80/50' : '1/1',
                    }}
                  >
                    <iframe
                      srcDoc={generateLabelHTML(currentTemplate, previewData)}
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                      }}
                      title="Label Preview"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
