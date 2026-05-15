import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { PrintTemplate, PrintField, TemplateType } from '@/types/printing'
import { 
  Type, 
  Image, 
  QrCode, 
  Barcode, 
  Table, 
  Minus, 
  Square, 
  Move,
  Trash2,
  Copy,
  Eye,
  Save,
  Undo,
  Redo,
  Settings,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline
} from 'lucide-react'

interface TemplateBuilderProps {
  template?: PrintTemplate
  onSave: (template: PrintTemplate) => void
  onCancel: () => void
}

export function TemplateBuilder({ template, onSave, onCancel }: TemplateBuilderProps) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('design')
  const [selectedField, setSelectedField] = useState<PrintField | null>(null)
  const [previewData, setPreviewData] = useState<Record<string, any>>({
    shopName: 'RepairPro Shop',
    shopAddress: '123 Repair Street, Tech City',
    shopPhone: '+1 234 567 890',
    shopEmail: 'info@repairpro.com',
    shopWebsite: 'www.repairpro.com',
    receiptNumber: 'RCP-2024-001',
    date: new Date().toLocaleDateString(),
    time: new Date().toLocaleTimeString(),
    customerName: 'John Doe',
    customerAddress: '456 Customer Ave, Town City',
    customerPhone: '+1 987 654 321',
    customerEmail: 'john.doe@email.com',
    invoiceNumber: 'INV-2024-001',
    invoiceDate: new Date().toLocaleDateString(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    subtotal: '100.00',
    tax: '10.00',
    discount: '5.00',
    shipping: '0.00',
    total: '105.00',
    paymentMethod: 'Credit Card',
    items: [
      { name: 'iPhone 13 Screen', quantity: 1, price: 80.00, total: 80.00 },
      { name: 'Battery Replacement', quantity: 1, price: 20.00, total: 20.00 },
    ],
    ticketNumber: 'RPR-2024-001',
    deviceType: 'iPhone 13',
    deviceBrand: 'Apple',
    deviceModel: 'iPhone 13 Pro',
    serialNumber: 'ABC123456789',
    problemDescription: 'Screen is cracked and touch is not responding properly.',
    estimatedCost: '80.00',
    prepayment: '40.00',
    balanceDue: '40.00',
  })

  const [currentTemplate, setCurrentTemplate] = useState<PrintTemplate>(
    template || {
      id: '',
      name: 'New Template',
      description: '',
      type: 'THERMAL_RECEIPT',
      status: 'DRAFT',
      paperSize: '80mm',
      orientation: 'portrait',
      headerFields: [],
      bodyFields: [],
      footerFields: [],
      showLogo: true,
      showHeader: true,
      showFooter: true,
      showDate: true,
      showTime: true,
    }
  )

  const addField = useCallback((section: 'header' | 'body' | 'footer', type: PrintField['type']) => {
    const newField: PrintField = {
      id: `${type}-${Date.now()}`,
      type,
      value: type === 'text' ? 'New Text' : undefined,
      style: {
        fontSize: 12,
        textAlign: 'left',
        margin: 5,
      },
    }

    setCurrentTemplate(prev => ({
      ...prev,
      [`${section}Fields`]: [...prev[`${section}Fields`], newField],
    }))

    setSelectedField(newField)
  }, [])

  const updateField = useCallback((section: 'header' | 'body' | 'footer', fieldId: string, updates: Partial<PrintField>) => {
    setCurrentTemplate(prev => ({
      ...prev,
      [`${section}Fields`]: prev[`${section}Fields`].map(field =>
        field.id === fieldId ? { ...field, ...updates } : field
      ),
    }))
  }, [])

  const removeField = useCallback((section: 'header' | 'body' | 'footer', fieldId: string) => {
    setCurrentTemplate(prev => ({
      ...prev,
      [`${section}Fields`]: prev[`${section}Fields`].filter(field => field.id !== fieldId),
    }))
    if (selectedField?.id === fieldId) {
      setSelectedField(null)
    }
  }, [])

  const moveField = useCallback((section: 'header' | 'body' | 'footer', fieldId: string, direction: 'up' | 'down') => {
    setCurrentTemplate(prev => {
      const fields = [...prev[`${section}Fields`]]
      const index = fields.findIndex(f => f.id === fieldId)
      if (index === -1) return prev

      const newIndex = direction === 'up' ? index - 1 : index + 1
      if (newIndex < 0 || newIndex >= fields.length) return prev

      const temp = fields[index]
      fields[index] = fields[newIndex]
      fields[newIndex] = temp

      return {
        ...prev,
        [`${section}Fields`]: fields,
      }
    })
  }, [])

  const handleSave = () => {
    if (!currentTemplate.name.trim()) {
      toast({
        title: 'Error',
        description: 'Template name is required',
        variant: 'destructive',
      })
      return
    }

    onSave(currentTemplate)
  }

  return (
    <div className="flex h-[calc(100vh-100px)] gap-4">
      {/* Left Sidebar - Tools */}
      <Card className="w-64 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Tools</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-2">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Text</p>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => addField('body', 'text')}
            >
              <Type className="mr-2 h-4 w-4" />
              Text Block
            </Button>
          </div>
          
          <Separator />
          
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Media</p>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => addField('body', 'image')}
            >
              <Image className="mr-2 h-4 w-4" />
              Image
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => addField('body', 'barcode')}
            >
              <Barcode className="mr-2 h-4 w-4" />
              Barcode
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => addField('body', 'qrcode')}
            >
              <QrCode className="mr-2 h-4 w-4" />
              QR Code
            </Button>
          </div>
          
          <Separator />
          
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Layout</p>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => addField('body', 'table')}
            >
              <Table className="mr-2 h-4 w-4" />
              Table
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => addField('body', 'line')}
            >
              <Minus className="mr-2 h-4 w-4" />
              Line
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => addField('body', 'spacer')}
            >
              <Square className="mr-2 h-4 w-4" />
              Spacer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Center - Canvas */}
      <Card className="flex-1 flex flex-col">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Input
                value={currentTemplate.name}
                onChange={(e) => setCurrentTemplate(prev => ({ ...prev, name: e.target.value }))}
                className="font-semibold text-lg h-auto py-1"
                placeholder="Template Name"
              />
              <Input
                value={currentTemplate.description || ''}
                onChange={(e) => setCurrentTemplate(prev => ({ ...prev, description: e.target.value }))}
                className="text-sm text-muted-foreground h-auto py-1"
                placeholder="Template Description"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={currentTemplate.type}
                onValueChange={(value: TemplateType) => setCurrentTemplate(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Template Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="THERMAL_RECEIPT">Thermal Receipt</SelectItem>
                  <SelectItem value="A4_INVOICE">A4 Invoice</SelectItem>
                  <SelectItem value="A4_PROFORMA">A4 Proforma</SelectItem>
                  <SelectItem value="ORDER_REQUEST">Order Request</SelectItem>
                  <SelectItem value="REPAIR_TICKET">Repair Ticket</SelectItem>
                </SelectContent>
              </Select>
              
              <Select
                value={currentTemplate.paperSize}
                onValueChange={(value: any) => setCurrentTemplate(prev => ({ ...prev, paperSize: value }))}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Paper Size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="58mm">58mm Thermal</SelectItem>
                  <SelectItem value="80mm">80mm Thermal</SelectItem>
                  <SelectItem value="A4">A4</SelectItem>
                  <SelectItem value="A5">A5</SelectItem>
                  <SelectItem value="LETTER">Letter</SelectItem>
                  <SelectItem value="CUSTOM">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="w-full justify-start rounded-none border-b bg-muted/50 px-4">
              <TabsTrigger value="design" className="gap-2">
                <Palette className="h-4 w-4" />
                Design
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-2">
                <Eye className="h-4 w-4" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
            </TabsList>
            
            <div className="flex-1 overflow-hidden">
              <TabsContent value="design" className="h-full m-0">
                <div className="flex h-full">
                  {/* Canvas Area */}
                  <div className="flex-1 bg-gray-100 p-8 overflow-auto">
                    <div 
                      className="bg-white shadow-lg mx-auto"
                      style={{
                        width: currentTemplate.paperSize === '80mm' ? '302px' : 
                               currentTemplate.paperSize === '58mm' ? '219px' : '794px',
                        minHeight: '500px',
                        padding: '20px',
                      }}
                    >
                      {/* Render Header Fields */}
                      <div className="border-b pb-4 mb-4">
                        {currentTemplate.headerFields.map((field, index) => (
                          <div 
                            key={field.id}
                            className={`p-2 mb-2 rounded cursor-pointer transition-colors ${
                              selectedField?.id === field.id 
                                ? 'bg-blue-100 border-2 border-blue-500' 
                                : 'hover:bg-gray-50 border-2 border-transparent'
                            }`}
                            onClick={() => setSelectedField(field)}
                          >
                            {renderFieldPreview(field)}
                          </div>
                        ))}
                      </div>
                      
                      {/* Render Body Fields */}
                      <div className="py-4">
                        {currentTemplate.bodyFields.map((field, index) => (
                          <div 
                            key={field.id}
                            className={`p-2 mb-2 rounded cursor-pointer transition-colors ${
                              selectedField?.id === field.id 
                                ? 'bg-blue-100 border-2 border-blue-500' 
                                : 'hover:bg-gray-50 border-2 border-transparent'
                            }`}
                            onClick={() => setSelectedField(field)}
                          >
                            {renderFieldPreview(field)}
                          </div>
                        ))}
                      </div>
                      
                      {/* Render Footer Fields */}
                      <div className="border-t pt-4 mt-4">
                        {currentTemplate.footerFields.map((field, index) => (
                          <div 
                            key={field.id}
                            className={`p-2 mb-2 rounded cursor-pointer transition-colors ${
                              selectedField?.id === field.id 
                                ? 'bg-blue-100 border-2 border-blue-500' 
                                : 'hover:bg-gray-50 border-2 border-transparent'
                            }`}
                            onClick={() => setSelectedField(field)}
                          >
                            {renderFieldPreview(field)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Properties Panel */}
                  <div className="w-80 bg-white border-l p-4 overflow-y-auto">
                    {selectedField ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">Field Properties</h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedField(null)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Field Type</Label>
                          <Select
                            value={selectedField.type}
                            onValueChange={(value: PrintField['type']) => {
                              updateField(
                                'body',
                                selectedField.id,
                                { type: value }
                              )
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="image">Image</SelectItem>
                              <SelectItem value="barcode">Barcode</SelectItem>
                              <SelectItem value="qrcode">QR Code</SelectItem>
                              <SelectItem value="table">Table</SelectItem>
                              <SelectItem value="line">Line</SelectItem>
                              <SelectItem value="spacer">Spacer</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {selectedField.type === 'text' && (
                          <div className="space-y-2">
                            <Label>Text Content</Label>
                            <Textarea
                              value={selectedField.value || ''}
                              onChange={(e) => {
                                updateField(
                                  'body',
                                  selectedField.id,
                                  { value: e.target.value }
                                )
                              }}
                              placeholder="Enter text or use {{variable}} syntax"
                              rows={3}
                            />
                            <p className="text-xs text-muted-foreground">
                              Use {'{{variable}}'} syntax for dynamic content
                            </p>
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          <Label>Style</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">Font Size</Label>
                              <Input
                                type="number"
                                value={selectedField.style?.fontSize || 12}
                                onChange={(e) => {
                                  updateField(
                                    'body',
                                    selectedField.id,
                                    { 
                                      style: { 
                                        ...selectedField.style, 
                                        fontSize: parseInt(e.target.value) 
                                      } 
                                    }
                                  )
                                }}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Alignment</Label>
                              <Select
                                value={selectedField.style?.textAlign || 'left'}
                                onValueChange={(value: any) => {
                                  updateField(
                                    'body',
                                    selectedField.id,
                                    { 
                                      style: { 
                                        ...selectedField.style, 
                                        textAlign: value 
                                      } 
                                    }
                                  )
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="left">
                                    <AlignLeft className="h-4 w-4" />
                                  </SelectItem>
                                  <SelectItem value="center">
                                    <AlignCenter className="h-4 w-4" />
                                  </SelectItem>
                                  <SelectItem value="right">
                                    <AlignRight className="h-4 w-4" />
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          <div className="flex gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className={selectedField.style?.fontWeight === 'bold' ? 'bg-accent' : ''}
                              onClick={() => {
                                updateField(
                                  'body',
                                  selectedField.id,
                                  { 
                                    style: { 
                                      ...selectedField.style, 
                                      fontWeight: selectedField.style?.fontWeight === 'bold' ? 'normal' : 'bold'
                                    } 
                                  }
                                )
                              }}
                            >
                              <Bold className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className={selectedField.style?.fontStyle === 'italic' ? 'bg-accent' : ''}
                              onClick={() => {
                                updateField(
                                  'body',
                                  selectedField.id,
                                  { 
                                    style: { 
                                      ...selectedField.style, 
                                      fontStyle: selectedField.style?.fontStyle === 'italic' ? 'normal' : 'italic'
                                    } 
                                  }
                                )
                              }}
                            >
                              <Italic className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        <p>Select a field on the canvas to edit its properties</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="preview" className="h-full m-0 p-4">
                <div className="bg-gray-100 p-8 h-full overflow-auto">
                  <div 
                    className="bg-white shadow-lg mx-auto"
                    style={{
                      width: currentTemplate.paperSize === '80mm' ? '302px' : 
                             currentTemplate.paperSize === '58mm' ? '219px' : '794px',
                      minHeight: '800px',
                      padding: '40px',
                    }}
                  >
                    {/* Render preview with sample data */}
                    <div className="space-y-4">
                      <div className="text-center border-b pb-4">
                        <h2 className="text-xl font-bold">{previewData.shopName}</h2>
                        <p className="text-sm text-gray-600">{previewData.shopAddress}</p>
                        <p className="text-sm text-gray-600">{previewData.shopPhone}</p>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <div>
                          <p><strong>Receipt #:</strong> {previewData.receiptNumber}</p>
                          <p><strong>Date:</strong> {previewData.date}</p>
                        </div>
                        <div className="text-right">
                          <p><strong>Customer:</strong></p>
                          <p>{previewData.customerName}</p>
                        </div>
                      </div>
                      
                      <table className="w-full text-sm mt-4">
                        <thead className="border-b">
                          <tr>
                            <th className="text-left py-2">Item</th>
                            <th className="text-center py-2">Qty</th>
                            <th className="text-right py-2">Price</th>
                            <th className="text-right py-2">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.items.map((item: any, index: number) => (
                            <tr key={index} className="border-b">
                              <td className="py-2">{item.name}</td>
                              <td className="text-center py-2">{item.quantity}</td>
                              <td className="text-right py-2">${item.price.toFixed(2)}</td>
                              <td className="text-right py-2">${item.total.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      
                      <div className="flex justify-end mt-4 space-y-1">
                        <div className="text-right">
                          <p className="text-sm">Subtotal: ${previewData.subtotal}</p>
                          <p className="text-sm">Tax: ${previewData.tax}</p>
                          <p className="text-sm">Discount: -${previewData.discount}</p>
                          <p className="text-lg font-bold mt-2">Total: ${previewData.total}</p>
                        </div>
                      </div>
                      
                      <div className="text-center mt-6 pt-4 border-t">
                        <p className="text-sm">Thank you for your business!</p>
                        <p className="text-xs text-gray-500 mt-1">{previewData.shopWebsite}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="settings" className="h-full m-0 p-4">
                <div className="max-w-2xl space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Paper Settings</CardTitle>
                      <CardDescription>Configure paper size and orientation</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Paper Size</Label>
                          <Select
                            value={currentTemplate.paperSize}
                            onValueChange={(value: any) => 
                              setCurrentTemplate(prev => ({ ...prev, paperSize: value }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="58mm">58mm Thermal</SelectItem>
                              <SelectItem value="80mm">80mm Thermal</SelectItem>
                              <SelectItem value="A4">A4</SelectItem>
                              <SelectItem value="A5">A5</SelectItem>
                              <SelectItem value="LETTER">Letter</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Orientation</Label>
                          <Select
                            value={currentTemplate.orientation}
                            onValueChange={(value: any) => 
                              setCurrentTemplate(prev => ({ ...prev, orientation: value }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="portrait">Portrait</SelectItem>
                              <SelectItem value="landscape">Landscape</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label>Top Margin (mm)</Label>
                          <Input
                            type="number"
                            value={currentTemplate.marginTop || 0}
                            onChange={(e) => 
                              setCurrentTemplate(prev => ({ 
                                ...prev, 
                                marginTop: parseInt(e.target.value) 
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Right Margin (mm)</Label>
                          <Input
                            type="number"
                            value={currentTemplate.marginRight || 0}
                            onChange={(e) => 
                              setCurrentTemplate(prev => ({ 
                                ...prev, 
                                marginRight: parseInt(e.target.value) 
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Bottom Margin (mm)</Label>
                          <Input
                            type="number"
                            value={currentTemplate.marginBottom || 0}
                            onChange={(e) => 
                              setCurrentTemplate(prev => ({ 
                                ...prev, 
                                marginBottom: parseInt(e.target.value) 
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Left Margin (mm)</Label>
                          <Input
                            type="number"
                            value={currentTemplate.marginLeft || 0}
                            onChange={(e) => 
                              setCurrentTemplate(prev => ({ 
                                ...prev, 
                                marginLeft: parseInt(e.target.value) 
                              }))
                            }
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Company Information</CardTitle>
                      <CardDescription>Default company details for this template</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Company Name</Label>
                          <Input
                            value={currentTemplate.companyName || ''}
                            onChange={(e) => 
                              setCurrentTemplate(prev => ({ 
                                ...prev, 
                                companyName: e.target.value 
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Phone Number</Label>
                          <Input
                            value={currentTemplate.companyPhone || ''}
                            onChange={(e) => 
                              setCurrentTemplate(prev => ({ 
                                ...prev, 
                                companyPhone: e.target.value 
                              }))
                            }
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Address</Label>
                        <Textarea
                          value={currentTemplate.companyAddress || ''}
                          onChange={(e) => 
                            setCurrentTemplate(prev => ({ 
                              ...prev, 
                              companyAddress: e.target.value 
                            }))
                          }
                          rows={2}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input
                            value={currentTemplate.companyEmail || ''}
                            onChange={(e) => 
                              setCurrentTemplate(prev => ({ 
                                ...prev, 
                                companyEmail: e.target.value 
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Website</Label>
                          <Input
                            value={currentTemplate.companyWebsite || ''}
                            onChange={(e) => 
                              setCurrentTemplate(prev => ({ 
                                ...prev, 
                                companyWebsite: e.target.value 
                              }))
                            }
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Tax/VAT Number</Label>
                        <Input
                          value={currentTemplate.taxNumber || ''}
                          onChange={(e) => 
                            setCurrentTemplate(prev => ({ 
                              ...prev, 
                              taxNumber: e.target.value 
                            }))
                          }
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Footer Text</Label>
                        <Textarea
                          value={currentTemplate.footerText || ''}
                          onChange={(e) => 
                            setCurrentTemplate(prev => ({ 
                              ...prev, 
                              footerText: e.target.value 
                            }))
                          }
                          rows={2}
                          placeholder="Thank you for your business!"
                        />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Display Options</CardTitle>
                      <CardDescription>Control what elements are shown in the template</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={currentTemplate.showLogo}
                            onCheckedChange={(checked) => 
                              setCurrentTemplate(prev => ({ ...prev, showLogo: checked }))
                            }
                          />
                          <Label>Show Logo</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={currentTemplate.showHeader}
                            onCheckedChange={(checked) => 
                              setCurrentTemplate(prev => ({ ...prev, showHeader: checked }))
                            }
                          />
                          <Label>Show Header</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={currentTemplate.showFooter}
                            onCheckedChange={(checked) => 
                              setCurrentTemplate(prev => ({ ...prev, showFooter: checked }))
                            }
                          />
                          <Label>Show Footer</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={currentTemplate.showDate}
                            onCheckedChange={(checked) => 
                              setCurrentTemplate(prev => ({ ...prev, showDate: checked }))
                            }
                          />
                          <Label>Show Date</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={currentTemplate.showTime}
                            onCheckedChange={(checked) => 
                              setCurrentTemplate(prev => ({ ...prev, showTime: checked }))
                            }
                          />
                          <Label>Show Time</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={currentTemplate.showPageNumber}
                            onCheckedChange={(checked) => 
                              setCurrentTemplate(prev => ({ ...prev, showPageNumber: checked }))
                            }
                          />
                          <Label>Show Page Numbers</Label>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
        
        <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                const clonedTemplate = {
                  ...currentTemplate,
                  name: `${currentTemplate.name} (Copy)`,
                  isDefault: false,
                }
                setCurrentTemplate(clonedTemplate)
                toast({
                  title: 'Template Cloned',
                  description: 'A copy of the template has been created',
                })
              }}
            >
              <Copy className="mr-2 h-4 w-4" />
              Clone
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline"
              onClick={() => {
                // Preview in new window
                const previewWindow = window.open('', '_blank')
                if (previewWindow) {
                  previewWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <title>Print Preview - ${currentTemplate.name}</title>
                      <style>
                        @page { margin: 0; }
                        body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
                        .print-container {
                          max-width: ${currentTemplate.paperSize === '80mm' ? '302px' : currentTemplate.paperSize === '58mm' ? '219px' : '794px'};
                          margin: 0 auto;
                          background: white;
                          box-shadow: 0 0 10px rgba(0,0,0,0.1);
                          padding: 20px;
                        }
                        @media print {
                          body { padding: 0; }
                          .print-container {
                            box-shadow: none;
                            max-width: 100%;
                          }
                        }
                      </style>
                    </head>
                    <body>
                      <div class="print-container">
                        <!-- Template content would be rendered here -->
                        <h1>Print Preview</h1>
                        <p>Template: ${currentTemplate.name}</p>
                        <p>Type: ${currentTemplate.type}</p>
                        <p>Paper Size: ${currentTemplate.paperSize}</p>
                      </div>
                      <script>
                        window.print();
                      </script>
                    </body>
                    </html>
                  `)
                }
              }}
            >
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
            
            <Button onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" />
              Save Template
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

// Helper function to render field preview
function renderFieldPreview(field: PrintField): React.ReactNode {
  switch (field.type) {
    case 'text':
      return (
        <div style={{ 
          fontSize: field.style?.fontSize, 
          fontWeight: field.style?.fontWeight,
          fontStyle: field.style?.fontStyle,
          textAlign: field.style?.textAlign,
        }}>
          {field.value || 'Sample Text'}
        </div>
      )
    
    case 'image':
      return (
        <div className="bg-gray-200 h-20 flex items-center justify-center text-gray-500">
          <Image className="h-8 w-8" />
        </div>
      )
    
    case 'barcode':
      return (
        <div className="bg-gray-100 h-12 flex items-center justify-center">
          <Barcode className="h-8 w-24 text-gray-600" />
        </div>
      )
    
    case 'qrcode':
      return (
        <div className="bg-gray-100 h-24 w-24 flex items-center justify-center mx-auto">
          <QrCode className="h-20 w-20 text-gray-600" />
        </div>
      )
    
    case 'table':
      return (
        <div className="border rounded">
          <div className="grid grid-cols-4 gap-2 p-2 bg-gray-100 text-sm font-medium">
            <div>Item</div>
            <div className="text-center">Qty</div>
            <div className="text-right">Price</div>
            <div className="text-right">Total</div>
          </div>
          <div className="p-2 text-sm">
            <div className="grid grid-cols-4 gap-2 py-1">
              <div>Sample Item</div>
              <div className="text-center">1</div>
              <div className="text-right">$10.00</div>
              <div className="text-right">$10.00</div>
            </div>
          </div>
        </div>
      )
    
    case 'line':
      return (
        <hr className="border-gray-300" style={{ 
          borderStyle: field.style?.borderStyle || 'solid',
          margin: `${field.style?.margin || 5}px 0`,
        }} />
      )
    
    case 'spacer':
      return (
        <div style={{ height: `${field.style?.height || 20}px` }} />
      )
    
    default:
      return null
  }
}
