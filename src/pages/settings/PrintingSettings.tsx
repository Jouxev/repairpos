import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertTriangle, RotateCcw, Save, Plus, Trash2, Copy, Edit, Eye, CheckCircle, Printer, Receipt, FileSpreadsheet, Wrench, Tag } from 'lucide-react'
import { toast } from 'sonner'
import { PrintTemplate, TemplateType } from '@/types/printing'
import printingTemplateIPCService from '@/services/printingTemplateIPCService'
import { defaultThermalReceiptTemplate, defaultA4InvoiceTemplate, defaultRepairTicketTemplate, defaultThermalLabelTemplate } from '@/services/printingTemplateService'
import RichTemplateEditor from '@/components/printing/RichTemplateEditor'

export default function PrintingSettings() {
  const [activeTab, setActiveTab] = useState('templates')
  const [templates, setTemplates] = useState<PrintTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingTemplate, setEditingTemplate] = useState<PrintTemplate | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null)

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      setIsLoading(true)
      const data = await printingTemplateIPCService.getAllTemplates()
      
      // Ensure default templates exist
      const hasThermal = data.some(t => t.type === 'THERMAL_RECEIPT')
      const hasA4 = data.some(t => t.type === 'A4_INVOICE')
      const hasRepair = data.some(t => t.type === 'REPAIR_TICKET')
      const hasLabel = data.some(t => t.type === 'THERMAL_LABEL')
      
      let allTemplates = [...data]
      if (!hasThermal) {
        await printingTemplateIPCService.createTemplate(defaultThermalReceiptTemplate)
        allTemplates.push(defaultThermalReceiptTemplate)
      }
      if (!hasA4) {
        await printingTemplateIPCService.createTemplate(defaultA4InvoiceTemplate)
        allTemplates.push(defaultA4InvoiceTemplate)
      }
      if (!hasRepair) {
        await printingTemplateIPCService.createTemplate(defaultRepairTicketTemplate)
        allTemplates.push(defaultRepairTicketTemplate)
      }
      if (!hasLabel) {
        await printingTemplateIPCService.createTemplate(defaultThermalLabelTemplate)
        allTemplates.push(defaultThermalLabelTemplate)
      }
      
      setTemplates(allTemplates)
    } catch (error) {
      console.error('Error loading templates:', error)
      toast.error('Failed to load templates')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateTemplate = (type: TemplateType) => {
    const newTemplate: PrintTemplate = {
      id: '',
      name: `New ${type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}`,
      description: '',
      type,
      status: 'DRAFT',
      isDefault: false,
      paperSize: type === 'THERMAL_RECEIPT' || type === 'THERMAL_LABEL' ? '80mm' : 'A4',
      orientation: 'portrait',
      marginTop: 0,
      marginRight: 0,
      marginBottom: 0,
      marginLeft: 0,
      headerFields: [],
      bodyFields: type === 'THERMAL_LABEL' ? [
        { id: 'store-name', type: 'text', label: 'Store Name', value: '{{shopName}}', style: { fontSize: 10, fontWeight: 'bold', textAlign: 'center' } },
        { id: 'product-name', type: 'text', label: 'Product Name', value: '{{productName}}', style: { fontSize: 12, fontWeight: 'bold', textAlign: 'center' } },
        { id: 'price', type: 'text', label: 'Price', value: '{{currency}}{{price}}', style: { fontSize: 16, fontWeight: 'bold', textAlign: 'center' } },
        { id: 'barcode', type: 'barcode', label: 'Barcode', barcodeValue: '{{barcode}}', barcodeFormat: 'CODE128', style: { textAlign: 'center' } },
      ] : [],
      footerFields: [],
      showLogo: type !== 'THERMAL_LABEL',
      showHeader: type !== 'THERMAL_LABEL',
      showFooter: type !== 'THERMAL_LABEL',
      showDate: type !== 'THERMAL_LABEL',
      showTime: false,
    }
    setEditingTemplate(newTemplate)
    setShowEditor(true)
  }

  const handleEditTemplate = (template: PrintTemplate) => {
    setEditingTemplate(template)
    setShowEditor(true)
  }

  const handleSaveTemplate = async (template: PrintTemplate) => {
    try {
      if (template.id) {
        await printingTemplateIPCService.updateTemplate(template.id, template)
        toast.success('Template updated successfully')
      } else {
        await printingTemplateIPCService.createTemplate(template)
        toast.success('Template created successfully')
      }
      setShowEditor(false)
      setEditingTemplate(null)
      loadTemplates()
    } catch (error) {
      console.error('Error saving template:', error)
      toast.error('Failed to save template')
    }
  }

  const handleDeleteTemplate = async (id: string) => {
    try {
      await printingTemplateIPCService.deleteTemplate(id)
      toast.success('Template deleted successfully')
      setTemplateToDelete(null)
      loadTemplates()
    } catch (error) {
      console.error('Error deleting template:', error)
      toast.error('Failed to delete template')
    }
  }

  const handleResetToDefaults = async () => {
    try {
      await printingTemplateIPCService.deleteAllTemplates()
      await printingTemplateIPCService.createTemplate(defaultThermalReceiptTemplate)
      await printingTemplateIPCService.createTemplate(defaultA4InvoiceTemplate)
      await printingTemplateIPCService.createTemplate(defaultRepairTicketTemplate)
      await printingTemplateIPCService.createTemplate(defaultThermalLabelTemplate)
      toast.success('Templates reset to defaults')
      setShowResetDialog(false)
      loadTemplates()
    } catch (error) {
      console.error('Error resetting templates:', error)
      toast.error('Failed to reset templates')
    }
  }

  const getTypeIcon = (type: TemplateType) => {
    switch (type) {
      case 'THERMAL_RECEIPT':
        return <Receipt className="h-4 w-4" />
      case 'THERMAL_LABEL':
        return <Tag className="h-4 w-4" />
      case 'A4_INVOICE':
      case 'A4_PROFORMA':
        return <FileSpreadsheet className="h-4 w-4" />
      case 'REPAIR_TICKET':
        return <Wrench className="h-4 w-4" />
      default:
        return <Printer className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Printing Settings</h1>
          <p className="text-muted-foreground">
            Manage print templates and printer configurations
          </p>
        </div>
        <Button variant="outline" onClick={() => setShowResetDialog(true)} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Reset Defaults
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="printers">Printers</TabsTrigger>
          <TabsTrigger value="defaults">Defaults</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          {/* Create Template Buttons */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="hover:border-primary cursor-pointer transition-colors" onClick={() => handleCreateTemplate('THERMAL_RECEIPT')}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Receipt className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Thermal Receipt</h3>
                    <p className="text-sm text-muted-foreground">POS receipt (80mm)</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-primary cursor-pointer transition-colors" onClick={() => handleCreateTemplate('A4_INVOICE')}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <FileSpreadsheet className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">A4 Invoice</h3>
                    <p className="text-sm text-muted-foreground">Full-page invoice</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-primary cursor-pointer transition-colors" onClick={() => handleCreateTemplate('THERMAL_LABEL')}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Tag className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Product Label</h3>
                    <p className="text-sm text-muted-foreground">58mm/80mm labels</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Templates List */}
          <Card>
            <CardHeader>
              <CardTitle>Your Templates</CardTitle>
              <CardDescription>
                Manage your custom print templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Printer className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No templates yet</p>
                  <p className="text-sm">Create your first template above</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          {getTypeIcon(template.type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{template.name}</h4>
                            {template.isDefault && (
                              <Badge variant="secondary" className="text-xs">Default</Badge>
                            )}
                            {template.status === 'DRAFT' && (
                              <Badge variant="outline" className="text-xs">Draft</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {template.type.replace(/_/g, ' ')} • {template.paperSize}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditTemplate(template)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setTemplateToDelete(template.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Other tabs remain the same */}
        <TabsContent value="printers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Printer Settings</CardTitle>
              <CardDescription>
                Configure your thermal and A4 printers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Thermal Printer Settings */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Thermal Receipt Printer (80mm)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Printer Name</Label>
                    <Input placeholder="e.g., Kitchen Printer" />
                  </div>
                  <div className="space-y-2">
                    <Label>Port/Connection</Label>
                    <Input placeholder="e.g., USB001, 192.168.1.100" />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch id="thermal-enabled" />
                    <Label htmlFor="thermal-enabled">Enabled</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="thermal-cutter" defaultChecked />
                    <Label htmlFor="thermal-cutter">Auto Cutter</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="thermal-buzzer" />
                    <Label htmlFor="thermal-buzzer">Buzzer</Label>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Label Printer Settings */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Label Printer (58mm/80mm)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Printer Name</Label>
                    <Input placeholder="e.g., Label Printer" />
                  </div>
                  <div className="space-y-2">
                    <Label>Port/Connection</Label>
                    <Input placeholder="e.g., USB002, 192.168.1.101" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Label Size</Label>
                    <select className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                      <option value="58x40">58mm × 40mm</option>
                      <option value="80x50">80mm × 50mm</option>
                      <option value="30x50">30mm × 50mm</option>
                      <option value="40x60">40mm × 60mm</option>
                      <option value="50x80">50mm × 80mm</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Print Density</Label>
                    <select className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                      <option value="low">Low</option>
                      <option value="medium" selected>Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Print Speed</Label>
                    <select className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                      <option value="slow">Slow</option>
                      <option value="normal" selected>Normal</option>
                      <option value="fast">Fast</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch id="label-enabled" />
                    <Label htmlFor="label-enabled">Enabled</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="label-cutter" defaultChecked />
                    <Label htmlFor="label-cutter">Auto Cutter</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="label-peel" />
                    <Label htmlFor="label-peel">Peel Mode</Label>
                  </div>
                </div>
              </div>

              <Separator />

              {/* A4/Laser Printer Settings */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  A4/Laser Printer
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Printer Name</Label>
                    <Input placeholder="e.g., Office Laser Printer" />
                  </div>
                  <div className="space-y-2">
                    <Label>Connection</Label>
                    <Input placeholder="e.g., 192.168.1.200 or USB" />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch id="a4-enabled" />
                    <Label htmlFor="a4-enabled">Enabled</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="a4-duplex" defaultChecked />
                    <Label htmlFor="a4-duplex">Duplex (Double-sided)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="a4-color" />
                    <Label htmlFor="a4-color">Color Printing</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="defaults" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Default Templates</CardTitle>
              <CardDescription>
                Set default templates for each document type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { type: 'THERMAL_RECEIPT', label: 'Thermal Receipt', icon: Receipt },
                  { type: 'THERMAL_LABEL', label: 'Thermal Label', icon: Tag },
                  { type: 'A4_INVOICE', label: 'A4 Invoice', icon: FileSpreadsheet },
                  { type: 'REPAIR_TICKET', label: 'Repair Ticket', icon: Wrench },
                ].map((item) => {
                  const defaultTemplate = templates.find(t => t.type === item.type && t.isDefault)
                  return (
                    <div key={item.type} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <item.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-medium">{item.label}</h4>
                          <p className="text-sm text-muted-foreground">
                            {defaultTemplate ? `Default: ${defaultTemplate.name}` : 'No default set'}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Set Default
                      </Button>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="defaults" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Default Templates</CardTitle>
              <CardDescription>
                Set default templates for each type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Default template settings coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="about" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>About Printing</CardTitle>
              <CardDescription>
                Information about the printing system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">Supported Printers</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Thermal Receipt Printers (58mm, 80mm)</li>
                  <li>Label Printers (58mm, 80mm)</li>
                  <li>A4/Letter Printers</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Template Types</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Thermal Receipt - POS receipts</li>
                  <li>A4 Invoice - Full page invoices</li>
                  <li>Repair Ticket - Device repair tickets</li>
                  <li>Product Label - Price labels</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Rich Template Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-7xl h-[95vh] p-0 overflow-hidden">
          {editingTemplate && (
            <RichTemplateEditor
              template={editingTemplate}
              onSave={handleSaveTemplate}
              onCancel={() => {
                setShowEditor(false)
                setEditingTemplate(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Reset All Templates?
            </DialogTitle>
            <DialogDescription>
              This will delete all your custom templates and reset to the default templates. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleResetToDefaults}>
              Reset Everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!templateToDelete} onOpenChange={() => setTemplateToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template?</DialogTitle>
            <DialogDescription>
              This will permanently delete this template. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => templateToDelete && handleDeleteTemplate(templateToDelete)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
