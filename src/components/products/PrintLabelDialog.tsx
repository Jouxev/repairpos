import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { printingTemplateService } from '@/services/printingTemplateService'
import { PrintTemplate } from '@/types/printing'
import { printLabel, LabelData, labelSizes, generateLabelHTML } from '@/services/labelPrintingService'
import { Printer, Eye, Package, Tag, Barcode, Store, DollarSign } from 'lucide-react'
import { toast } from 'sonner'

interface PrintLabelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: {
    id: string
    name: string
    salePrice: number
    barcode?: string | null
    sku?: string | null
  } | null
  storeInfo?: {
    name: string
    address?: string
    phone?: string
  }
}

export default function PrintLabelDialog({
  open,
  onOpenChange,
  product,
  storeInfo,
}: PrintLabelDialogProps) {
  const [templates, setTemplates] = useState<PrintTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<PrintTemplate | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [labelData, setLabelData] = useState<LabelData>({
    productName: product?.name || '',
    price: product?.salePrice || 0,
    currency: 'DA',
    barcode: product?.barcode || '',
    sku: product?.sku || '',
    storeName: storeInfo?.name || '',
    storeAddress: storeInfo?.address || '',
    storePhone: storeInfo?.phone || '',
  })

  useEffect(() => {
    if (open) {
      loadTemplates()
    }
  }, [open])

  useEffect(() => {
    if (product) {
      setLabelData({
        productName: product.name,
        price: product.salePrice,
        currency: '$',
        barcode: product.barcode || '',
        sku: product.sku || '',
        storeName: storeInfo?.name || '',
        storeAddress: storeInfo?.address || '',
        storePhone: storeInfo?.phone || '',
      })
    }
  }, [product, storeInfo])

  const loadTemplates = async () => {
    try {
      setIsLoading(true)
      const allTemplates = await printingTemplateService.getAllTemplates()
      const labelTemplates = allTemplates.filter(t => t.type === 'THERMAL_LABEL')
      setTemplates(labelTemplates)
      
      // Select default template
      const defaultTemplate = labelTemplates.find(t => t.isDefault) || labelTemplates[0]
      if (defaultTemplate) {
        setSelectedTemplate(defaultTemplate)
      }
    } catch (error) {
      console.error('Error loading templates:', error)
      toast.error('Failed to load label templates')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePrint = () => {
    if (!selectedTemplate) {
      toast.error('Please select a label template')
      return
    }

    if (!product) {
      toast.error('No product selected')
      return
    }

    // Print multiple labels if quantity > 1
    for (let i = 0; i < quantity; i++) {
      setTimeout(() => {
        printLabel(selectedTemplate, labelData)
      }, i * 500) // Stagger prints by 500ms
    }

    toast.success(`Printing ${quantity} label${quantity > 1 ? 's' : ''}...`)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Print Product Label
          </DialogTitle>
          <DialogDescription>
            Select a label template and print labels for your product
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <div className="grid grid-cols-2 gap-6 h-full">
            {/* Left Panel - Settings */}
            <ScrollArea className="h-full pr-4">
              <div className="space-y-6">
                {/* Product Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Package className="h-4 w-4" />
                      Product Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Name:</span>
                      <span className="text-sm font-medium">{product?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Price:</span>
                      <span className="text-sm font-medium">${product?.salePrice?.toFixed(2)}</span>
                    </div>
                    {product?.barcode && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Barcode:</span>
                        <span className="text-sm font-medium">{product.barcode}</span>
                      </div>
                    )}
                    {product?.sku && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">SKU:</span>
                        <span className="text-sm font-medium">{product.sku}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Template Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Tag className="h-4 w-4" />
                      Label Template
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Select Template</Label>
                      <Select
                        value={selectedTemplate?.id}
                        onValueChange={(value) => {
                          const template = templates.find(t => t.id === value)
                          if (template) setSelectedTemplate(template)
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a template" />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              <div className="flex items-center gap-2">
                                {template.name}
                                {template.isDefault && (
                                  <Badge variant="secondary" className="text-xs">Default</Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedTemplate && (
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="outline">{selectedTemplate.paperSize}</Badge>
                          <span className="text-muted-foreground">
                            {selectedTemplate.bodyFields.length} fields
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quantity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Printer className="h-4 w-4" />
                      Print Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        >
                          -
                        </Button>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          value={quantity}
                          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-20 text-center"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setQuantity(Math.min(100, quantity + 1))}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>

            {/* Right Panel - Preview */}
            <div className="space-y-6">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Label Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedTemplate ? (
                    <div className="space-y-4">
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <div
                          className="bg-white border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden mx-auto"
                          style={{
                            width: selectedTemplate.paperSize === '58mm' ? 145 : selectedTemplate.paperSize === '80mm' ? 200 : 150,
                            aspectRatio: selectedTemplate.paperSize === '58mm' ? '58/40' : selectedTemplate.paperSize === '80mm' ? '80/50' : '1/1',
                          }}
                        >
                          <iframe
                            srcDoc={generateLabelHTML(selectedTemplate, labelData)}
                            style={{
                              width: '100%',
                              height: '100%',
                              border: 'none',
                            }}
                            title="Label Preview"
                          />
                        </div>
                      </div>

                      <div className="p-4 bg-muted rounded-lg">
                        <h4 className="font-medium mb-2">Preview Data</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Product:</span>
                            <span>{labelData.productName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Price:</span>
                            <span>{labelData.currency}{labelData.price.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Barcode:</span>
                            <span>{labelData.barcode || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Select a template to preview</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handlePrint}
            disabled={!selectedTemplate || !product}
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            Print {quantity} Label{quantity > 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
