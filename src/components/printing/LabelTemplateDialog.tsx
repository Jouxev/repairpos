import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PrintTemplate, LabelTemplate } from '@/types/printing'
import { labelSizes, generateLabelHTML, LabelData, defaultLabelTemplates } from '@/services/labelPrintingService'
import { 
  Printer, 
  Eye, 
  Save, 
  RotateCcw, 
  Tag,
  Type,
  DollarSign,
  Barcode,
  Store,
  Check,
  X,
  Layout
} from 'lucide-react'
import { toast } from 'sonner'

interface LabelTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template?: PrintTemplate | null
  onSave: (template: PrintTemplate) => void
}

export default function LabelTemplateDialog({
  open,
  onOpenChange,
  template,
  onSave,
}: LabelTemplateDialogProps) {
  const isEditing = !!template?.id
  const [currentTemplate, setCurrentTemplate] = useState<PrintTemplate>(() => {
    if (template) return { ...template }
    return defaultLabelTemplates[0]
  })
  const [previewData, setPreviewData] = useState<LabelData>({
    productName: 'Sample Product Name',
    price: 99.99,
    currency: '$',
    barcode: '123456789012',
    sku: 'SKU-001',
    storeName: 'My Store',
    storeAddress: '123 Main St',
    storePhone: '+1 234 567 890',
  })

  const handleSizeChange = (sizeName: string) => {
    const size = labelSizes.find(s => s.name === sizeName)
    if (size) {
      setCurrentTemplate(prev => ({
        ...prev,
        paperSize: size.name,
      }))
    }
  }

  const handleFieldToggle = (fieldId: string, show: boolean) => {
    setCurrentTemplate(prev => ({
      ...prev,
      bodyFields: prev.bodyFields.map(f => {
        if (f.id === fieldId) {
          return { ...f, hidden: !show }
        }
        return f
      }),
    }))
  }

  const handleSave = () => {
    if (!currentTemplate.name.trim()) {
      toast.error('Please enter a template name')
      return
    }
    onSave(currentTemplate)
    onOpenChange(false)
  }

  const previewHTML = generateLabelHTML(currentTemplate, previewData)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            {isEditing ? 'Edit Label Template' : 'Create Label Template'}
          </DialogTitle>
          <DialogDescription>
            Design and customize your product label template
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <div className="grid grid-cols-2 gap-6 h-full">
            {/* Left Panel - Settings */}
            <div className="overflow-y-auto pr-2 space-y-4">
              {/* Basic Settings */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Layout className="h-4 w-4" />
                    Basic Settings
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

              {/* Content Fields */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Type className="h-4 w-4" />
                    Content Fields
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {currentTemplate.bodyFields.map((field) => (
                    <div key={field.id} className="flex items-center justify-between p-2 border rounded-lg">
                      <div className="flex items-center gap-2">
                        {field.id === 'store-name' && <Store className="h-4 w-4 text-muted-foreground" />}
                        {field.id === 'product-name' && <Type className="h-4 w-4 text-muted-foreground" />}
                        {field.id === 'price' && <DollarSign className="h-4 w-4 text-muted-foreground" />}
                        {field.id === 'barcode' && <Barcode className="h-4 w-4 text-muted-foreground" />}
                        <span className="text-sm">{field.label || field.id}</span>
                      </div>
                      <Switch
                        checked={!field.hidden}
                        onCheckedChange={(checked) => handleFieldToggle(field.id, checked)}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Right Panel - Preview */}
            <div className="space-y-4">
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Eye className="h-4 w-4" />
                    Live Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Preview Controls */}
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={previewData.productName}
                        onChange={(e) => setPreviewData(prev => ({ ...prev, productName: e.target.value }))}
                        placeholder="Product name"
                      />
                      <Input
                        type="number"
                        value={previewData.price}
                        onChange={(e) => setPreviewData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                        placeholder="Price"
                      />
                    </div>
                    <Input
                      value={previewData.barcode}
                      onChange={(e) => setPreviewData(prev => ({ ...prev, barcode: e.target.value }))}
                      placeholder="Barcode"
                    />

                    {/* Label Preview */}
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <div
                        className="bg-white border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden mx-auto"
                        style={{
                          width: currentTemplate.paperSize === '58mm' ? 145 : currentTemplate.paperSize === '80mm' ? 200 : 150,
                          aspectRatio: currentTemplate.paperSize === '58mm' ? '58/40' : currentTemplate.paperSize === '80mm' ? '80/50' : '1/1',
                        }}
                      >
                        <iframe
                          srcDoc={previewHTML}
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

        <div className="flex items-center justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button variant="outline" onClick={() => setCurrentTemplate(defaultLabelTemplates[0])}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleSave}>
            <Check className="h-4 w-4 mr-2" />
            {isEditing ? 'Update Template' : 'Create Template'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}