import { useState, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PrintTemplate, PrintField, TemplateType } from '@/types/printing'
import { generateLabelHTML } from '@/services/labelPrintingService'
import { 
  GripVertical, 
  Trash2, 
  Copy, 
  Plus, 
  Type, 
  Image, 
  Barcode, 
  Table, 
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Eye,
  Save,
  X
} from 'lucide-react'
import { toast } from 'sonner'

interface RichTemplateEditorProps {
  template: PrintTemplate
  onSave: (template: PrintTemplate) => void
  onCancel: () => void
}

// Available variable groups for templates
const VARIABLE_GROUPS = {
  'Shop / Store': [
    { key: '{{shopName}}', label: 'Shop Name', example: 'My Shop' },
    { key: '{{shopAddress}}', label: 'Shop Address', example: '123 Main St' },
    { key: '{{shopPhone}}', label: 'Shop Phone', example: '+1234567890' },
    { key: '{{shopEmail}}', label: 'Shop Email', example: 'shop@example.com' },
    { key: '{{shopWebsite}}', label: 'Shop Website', example: 'www.shop.com' },
    { key: '{{taxNumber}}', label: 'Tax Number', example: 'TAX123456' },
  ],
  'Receipt / Invoice': [
    { key: '{{receiptNumber}}', label: 'Receipt Number', example: 'R-00123' },
    { key: '{{invoiceNumber}}', label: 'Invoice Number', example: 'INV-00123' },
    { key: '{{date}}', label: 'Date', example: '2024-01-15' },
    { key: '{{time}}', label: 'Time', example: '14:30:00' },
    { key: '{{dateTime}}', label: 'Date & Time', example: '2024-01-15 14:30' },
    { key: '{{cashier}}', label: 'Cashier Name', example: 'John Doe' },
  ],
  'Customer': [
    { key: '{{customerName}}', label: 'Customer Name', example: 'Jane Smith' },
    { key: '{{customerPhone}}', label: 'Customer Phone', example: '+1234567890' },
    { key: '{{customerEmail}}', label: 'Customer Email', example: 'jane@example.com' },
    { key: '{{customerAddress}}', label: 'Customer Address', example: '456 Oak St' },
    { key: '{{customerId}}', label: 'Customer ID', example: 'CUST-00123' },
  ],
  'Product': [
    { key: '{{productName}}', label: 'Product Name', example: 'iPhone Screen' },
    { key: '{{productSku}}', label: 'Product SKU', example: 'SCR-001' },
    { key: '{{productPrice}}', label: 'Product Price', example: '$49.99' },
    { key: '{{productBarcode}}', label: 'Product Barcode', example: '123456789012' },
    { key: '{{productDescription}}', label: 'Product Description', example: 'High quality screen' },
  ],
  'Financial': [
    { key: '{{subtotal}}', label: 'Subtotal', example: '$100.00' },
    { key: '{{tax}}', label: 'Tax', example: '$10.00' },
    { key: '{{discount}}', label: 'Discount', example: '-$5.00' },
    { key: '{{total}}', label: 'Total', example: '$105.00' },
    { key: '{{paid}}', label: 'Amount Paid', example: '$105.00' },
    { key: '{{change}}', label: 'Change', example: '$0.00' },
    { key: '{{balanceDue}}', label: 'Balance Due', example: '$0.00' },
  ],
  'Repair': [
    { key: '{{repairId}}', label: 'Repair ID', example: 'REP-00123' },
    { key: '{{deviceModel}}', label: 'Device Model', example: 'iPhone 12 Pro' },
    { key: '{{deviceBrand}}', label: 'Device Brand', example: 'Apple' },
    { key: '{{serialNumber}}', label: 'Serial Number', example: 'ABC123456' },
    { key: '{{imei}}', label: 'IMEI', example: '123456789012345' },
    { key: '{{issueDescription}}', label: 'Issue Description', example: 'Screen cracked' },
    { key: '{{estimatedCost}}', label: 'Estimated Cost', example: '$150.00' },
    { key: '{{technicianName}}', label: 'Technician', example: 'John Doe' },
    { key: '{{repairStatus}}', label: 'Status', example: 'In Progress' },
    { key: '{{warrantyInfo}}', label: 'Warranty', example: '90 days' },
  ],
}

// Field type definitions
const FIELD_TYPES = [
  { id: 'text', label: 'Text', icon: Type },
  { id: 'image', label: 'Image', icon: Image },
  { id: 'barcode', label: 'Barcode', icon: Barcode },
  { id: 'table', label: 'Table', icon: Table },
  { id: 'line', label: 'Divider', icon: Minus },
]

export default function RichTemplateEditor({ template, onSave, onCancel }: RichTemplateEditorProps) {
  const [currentTemplate, setCurrentTemplate] = useState<PrintTemplate>({ ...template })
  const [selectedField, setSelectedField] = useState<PrintField | null>(null)
  const [draggedField, setDraggedField] = useState<PrintField | null>(null)
  const [activeTab, setActiveTab] = useState('content')
  const [previewData, setPreviewData] = useState({
    shopName: 'My Shop',
    shopAddress: '123 Main St',
    shopPhone: '+1234567890',
    receiptNumber: 'R-00123',
    date: '2024-01-15',
    customerName: 'Jane Smith',
    subtotal: '$100.00',
    tax: '$10.00',
    total: '$110.00',
  })

  const handleFieldDragStart = (field: PrintField) => {
    setDraggedField(field)
  }

  const handleFieldDrop = (targetIndex: number, section: 'header' | 'body' | 'footer') => {
    if (!draggedField) return

    const fields = [...currentTemplate[`${section}Fields`]]
    const existingIndex = fields.findIndex(f => f.id === draggedField.id)

    if (existingIndex !== -1) {
      // Move existing field
      fields.splice(existingIndex, 1)
      fields.splice(targetIndex, 0, draggedField)
    } else {
      // Add new field
      fields.splice(targetIndex, 0, { ...draggedField, id: `${section}-${Date.now()}` })
    }

    setCurrentTemplate(prev => ({
      ...prev,
      [`${section}Fields`]: fields,
    }))
    setDraggedField(null)
  }

  const handleFieldDelete = (fieldId: string, section: 'header' | 'body' | 'footer') => {
    setCurrentTemplate(prev => ({
      ...prev,
      [`${section}Fields`]: prev[`${section}Fields`].filter(f => f.id !== fieldId),
    }))
    if (selectedField?.id === fieldId) {
      setSelectedField(null)
    }
  }

  const handleFieldUpdate = (fieldId: string, section: 'header' | 'body' | 'footer', updates: Partial<PrintField>) => {
    setCurrentTemplate(prev => ({
      ...prev,
      [`${section}Fields`]: prev[`${section}Fields`].map(f => 
        f.id === fieldId ? { ...f, ...updates } : f
      ),
    }))
  }

  const handleSave = () => {
    onSave(currentTemplate)
  }

  const renderFieldEditor = () => {
    if (!selectedField) return null

    return (
      <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
        <h4 className="font-semibold">Field Properties</h4>
        
        <div className="space-y-2">
          <Label>Label</Label>
          <Input
            value={selectedField.label || ''}
            onChange={(e) => handleFieldUpdate(selectedField.id, 'body', { label: e.target.value })}
            placeholder="Field label"
          />
        </div>

        {selectedField.type === 'text' && (
          <div className="space-y-2">
            <Label>Value / Variable</Label>
            <Input
              value={selectedField.value || ''}
              onChange={(e) => handleFieldUpdate(selectedField.id, 'body', { value: e.target.value })}
              placeholder="{{variable}} or static text"
            />
          </div>
        )}

        {selectedField.type === 'barcode' && (
          <>
            <div className="space-y-2">
              <Label>Barcode Value</Label>
              <Input
                value={selectedField.barcodeValue || ''}
                onChange={(e) => handleFieldUpdate(selectedField.id, 'body', { barcodeValue: e.target.value })}
                placeholder="{{barcode}} or static value"
              />
            </div>
            <div className="space-y-2">
              <Label>Format</Label>
              <Select
                value={selectedField.barcodeFormat || 'CODE128'}
                onValueChange={(v) => handleFieldUpdate(selectedField.id, 'body', { barcodeFormat: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CODE128">CODE128</SelectItem>
                  <SelectItem value="EAN13">EAN-13</SelectItem>
                  <SelectItem value="UPC">UPC</SelectItem>
                  <SelectItem value="QR">QR Code</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        <div className="space-y-2">
          <Label>Font Size (px)</Label>
          <Input
            type="number"
            value={selectedField.style?.fontSize || 12}
            onChange={(e) => handleFieldUpdate(selectedField.id, 'body', { 
              style: { ...selectedField.style, fontSize: parseInt(e.target.value) }
            })}
          />
        </div>

        <div className="space-y-2">
          <Label>Text Align</Label>
          <div className="flex gap-2">
            <Button
              variant={selectedField.style?.textAlign === 'left' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFieldUpdate(selectedField.id, 'body', { 
                style: { ...selectedField.style, textAlign: 'left' }
              })}
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button
              variant={selectedField.style?.textAlign === 'center' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFieldUpdate(selectedField.id, 'body', { 
                style: { ...selectedField.style, textAlign: 'center' }
              })}
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button
              variant={selectedField.style?.textAlign === 'right' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFieldUpdate(selectedField.id, 'body', { 
                style: { ...selectedField.style, textAlign: 'right' }
              })}
            >
              <AlignRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant={selectedField.style?.fontWeight === 'bold' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFieldUpdate(selectedField.id, 'body', { 
              style: { ...selectedField.style, fontWeight: selectedField.style?.fontWeight === 'bold' ? 'normal' : 'bold' }
            })}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant={selectedField.style?.fontStyle === 'italic' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFieldUpdate(selectedField.id, 'body', { 
              style: { ...selectedField.style, fontStyle: selectedField.style?.fontStyle === 'italic' ? 'normal' : 'italic' }
            })}
          >
            <Italic className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="text-xl font-bold">Template Editor</h2>
          <p className="text-sm text-muted-foreground">
            {currentTemplate.name || 'Untitled Template'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Template
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Tools */}
        <div className="w-64 border-r bg-muted/30 p-4 overflow-y-auto">
          <Tabs defaultValue="elements" className="w-full">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="elements">Elements</TabsTrigger>
              <TabsTrigger value="variables">Variables</TabsTrigger>
            </TabsList>

            <TabsContent value="elements" className="space-y-2 mt-4">
              <p className="text-xs text-muted-foreground mb-2">Drag elements to canvas</p>
              {FIELD_TYPES.map((type) => (
                <div
                  key={type.id}
                  draggable
                  onDragStart={() => handleFieldDragStart({
                    id: `new-${Date.now()}`,
                    type: type.id as any,
                    label: type.label,
                    style: {},
                  })}
                  className="flex items-center gap-2 p-2 rounded-lg border bg-card cursor-move hover:border-primary transition-colors"
                >
                  <type.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{type.label}</span>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="variables" className="mt-4">
              <div className="space-y-4">
                {Object.entries(VARIABLE_GROUPS).map(([group, vars]) => (
                  <div key={group}>
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase">
                      {group}
                    </h4>
                    <div className="space-y-1">
                      {vars.map((v) => (
                        <button
                          key={v.key}
                          onClick={() => {
                            if (selectedField) {
                              const newValue = (selectedField.value || '') + v.key
                              handleFieldUpdate(selectedField.id, 'body', { value: newValue })
                              toast.success(`Inserted ${v.label}`)
                            }
                          }}
                          className="w-full text-left px-2 py-1 rounded text-xs hover:bg-muted transition-colors flex items-center justify-between group"
                        >
                          <span>{v.label}</span>
                          <code className="text-[10px] text-muted-foreground group-hover:text-foreground">
                            {v.key}
                          </code>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Center - Canvas */}
        <div className="flex-1 flex flex-col bg-muted/20">
          {/* Template Sections */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Header Section */}
            <Card
              className="border-2 border-dashed"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleFieldDrop(currentTemplate.headerFields.length, 'header')}
            >
              <CardHeader className="py-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-muted-foreground">Header Section</CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {currentTemplate.headerFields.length} fields
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 min-h-[80px]">
                {currentTemplate.headerFields.map((field, index) => (
                  <div
                    key={field.id}
                    draggable
                    onDragStart={() => handleFieldDragStart(field)}
                    onClick={() => setSelectedField(field)}
                    className={`flex items-center gap-2 p-3 rounded-lg border cursor-move transition-all ${
                      selectedField?.id === field.id
                        ? 'border-primary bg-primary/5'
                        : 'bg-card hover:border-muted-foreground'
                    }`}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{field.label || field.type}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {field.value || 'No value'}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleFieldDelete(field.id, 'header')
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                {currentTemplate.headerFields.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-20 text-muted-foreground">
                    <Plus className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">Drag elements here</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Body Section */}
            <Card
              className="border-2 border-dashed border-primary/30"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleFieldDrop(currentTemplate.bodyFields.length, 'body')}
            >
              <CardHeader className="py-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-muted-foreground">Body Section</CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {currentTemplate.bodyFields.length} fields
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 min-h-[120px]">
                {currentTemplate.bodyFields.map((field, index) => (
                  <div
                    key={field.id}
                    draggable
                    onDragStart={() => handleFieldDragStart(field)}
                    onClick={() => setSelectedField(field)}
                    className={`flex items-center gap-2 p-3 rounded-lg border cursor-move transition-all ${
                      selectedField?.id === field.id
                        ? 'border-primary bg-primary/5'
                        : 'bg-card hover:border-muted-foreground'
                    }`}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{field.label || field.type}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {field.value || 'No value'}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleFieldDelete(field.id, 'body')
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                {currentTemplate.bodyFields.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <Plus className="h-10 w-10 mb-2 opacity-50" />
                    <p className="text-sm">Drag elements here</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Footer Section */}
            <Card
              className="border-2 border-dashed"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleFieldDrop(currentTemplate.footerFields.length, 'footer')}
            >
              <CardHeader className="py-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-muted-foreground">Footer Section</CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {currentTemplate.footerFields.length} fields
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 min-h-[80px]">
                {currentTemplate.footerFields.map((field, index) => (
                  <div
                    key={field.id}
                    draggable
                    onDragStart={() => handleFieldDragStart(field)}
                    onClick={() => setSelectedField(field)}
                    className={`flex items-center gap-2 p-3 rounded-lg border cursor-move transition-all ${
                      selectedField?.id === field.id
                        ? 'border-primary bg-primary/5'
                        : 'bg-card hover:border-muted-foreground'
                    }`}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{field.label || field.type}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {field.value || 'No value'}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleFieldDelete(field.id, 'footer')
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                {currentTemplate.footerFields.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-16 text-muted-foreground">
                    <Plus className="h-6 w-6 mb-1 opacity-50" />
                    <p className="text-xs">Drag elements here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Sidebar - Properties */}
        <div className="w-80 border-l bg-muted/30 p-4 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="properties">Properties</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="properties" className="mt-4 space-y-4">
              {/* Template Settings */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Template Settings</h4>
                
                <div className="space-y-2">
                  <Label className="text-xs">Template Name</Label>
                  <Input
                    value={currentTemplate.name}
                    onChange={(e) => setCurrentTemplate(prev => ({ ...prev, name: e.target.value }))}
                    className="h-8"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Template Type</Label>
                  <Select
                    value={currentTemplate.type}
                    onValueChange={(v) => setCurrentTemplate(prev => ({ ...prev, type: v as TemplateType }))}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="THERMAL_RECEIPT">Thermal Receipt</SelectItem>
                      <SelectItem value="THERMAL_LABEL">Thermal Label</SelectItem>
                      <SelectItem value="A4_INVOICE">A4 Invoice</SelectItem>
                      <SelectItem value="A4_PROFORMA">A4 Proforma</SelectItem>
                      <SelectItem value="REPAIR_TICKET">Repair Ticket</SelectItem>
                      <SelectItem value="ORDER_REQUEST">Order Request</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Paper Size</Label>
                  <Select
                    value={currentTemplate.paperSize}
                    onValueChange={(v) =>
                      setCurrentTemplate((prev) => ({
                        ...prev,
                        paperSize: v as PrintTemplate['paperSize'],
                      }))
                    }
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="58mm">58mm (Label)</SelectItem>
                      <SelectItem value="80mm">80mm (Thermal)</SelectItem>
                      <SelectItem value="A4">A4</SelectItem>
                      <SelectItem value="A5">A5</SelectItem>
                      <SelectItem value="LETTER">Letter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-xs">Set as Default</Label>
                  <Switch
                    checked={currentTemplate.isDefault}
                    onCheckedChange={(v) => setCurrentTemplate(prev => ({ ...prev, isDefault: v }))}
                  />
                </div>
              </div>

              <Separator />

              {/* Selected Field Properties */}
              {selectedField && renderFieldEditor()}
            </TabsContent>

            <TabsContent value="preview" className="mt-4">
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Live Preview</h4>
                
                {/* Preview Canvas */}
                <div className="border rounded-lg overflow-hidden bg-white">
                  <iframe
                    srcDoc={generateLabelHTML(currentTemplate, previewData as any)}
                    className="w-full h-96"
                    title="Template Preview"
                  />
                </div>

                {/* Quick Preview Data */}
                <div className="space-y-2">
                  <Label className="text-xs">Preview Data</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={previewData.shopName}
                      onChange={(e) => setPreviewData(prev => ({ ...prev, shopName: e.target.value }))}
                      className="h-7 text-xs"
                      placeholder="Shop name"
                    />
                    <Input
                      value={previewData.customerName}
                      onChange={(e) => setPreviewData(prev => ({ ...prev, customerName: e.target.value }))}
                      className="h-7 text-xs"
                      placeholder="Customer"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
