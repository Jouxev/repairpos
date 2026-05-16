import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { TemplateBuilder } from '@/components/printing/TemplateBuilder'
import { printingTemplateService, defaultThermalReceiptTemplate, defaultA4InvoiceTemplate, defaultRepairTicketTemplate } from '@/services/printingTemplateService'
import { PrintTemplate, TemplateType, TemplateStatus, ThermalPrinterConfig, A4PrinterConfig, PrinterSettings } from '@/types/printing'
import { 
  Printer, 
  FileText, 
  Ticket, 
  Plus, 
  Copy, 
  Trash2, 
  Edit3, 
  Eye, 
  CheckCircle2,
  XCircle,
  Settings,
  Palette,
  Save,
  ArrowLeft,
  Thermometer,
  Receipt,
  FileSpreadsheet,
  Wrench
} from 'lucide-react'

export default function PrintingSettings() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('templates')
  const [templates, setTemplates] = useState<PrintTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingTemplate, setEditingTemplate] = useState<PrintTemplate | null>(null)
  const [printerSettings, setPrinterSettings] = useState<PrinterSettings | null>(null)
  const [showBuilder, setShowBuilder] = useState(false)

  useEffect(() => {
    loadTemplates()
    loadPrinterSettings()
  }, [])

  const loadTemplates = async () => {
    try {
      setIsLoading(true)
      const data = await printingTemplateService.getAllTemplates()
      // Ensure default templates exist
      const hasThermal = data.some(t => t.type === 'THERMAL_RECEIPT')
      const hasA4 = data.some(t => t.type === 'A4_INVOICE')
      const hasRepair = data.some(t => t.type === 'REPAIR_TICKET')
      
      let allTemplates = [...data]
      if (!hasThermal) allTemplates.push(defaultThermalReceiptTemplate)
      if (!hasA4) allTemplates.push(defaultA4InvoiceTemplate)
      if (!hasRepair) allTemplates.push(defaultRepairTicketTemplate)
      
      setTemplates(allTemplates)
    } catch (error) {
      console.error('Error loading templates:', error)
      toast({
        title: 'Error',
        description: 'Failed to load templates',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadPrinterSettings = async () => {
    try {
      const settings = await printingTemplateService.getPrinterSettings()
      setPrinterSettings(settings)
    } catch (error) {
      console.error('Error loading printer settings:', error)
    }
  }

  const handleCreateTemplate = (type: TemplateType) => {
    const newTemplate: PrintTemplate = {
      id: '',
      name: `New ${type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}`,
      description: '',
      type,
      status: 'DRAFT',
      paperSize: type === 'THERMAL_RECEIPT' ? '80mm' : 'A4',
      orientation: 'portrait',
      headerFields: [],
      bodyFields: [],
      footerFields: [],
      showLogo: true,
      showHeader: true,
      showFooter: true,
      showDate: true,
      showTime: false,
    }
    setEditingTemplate(newTemplate)
    setShowBuilder(true)
  }

  const handleEditTemplate = (template: PrintTemplate) => {
    setEditingTemplate(template)
    setShowBuilder(true)
  }

  const handleSaveTemplate = async (template: PrintTemplate) => {
    try {
      if (template.id) {
        await printingTemplateService.updateTemplate(template.id, template)
        toast({
          title: 'Success',
          description: 'Template updated successfully',
        })
      } else {
        await printingTemplateService.createTemplate(template)
        toast({
          title: 'Success',
          description: 'Template created successfully',
        })
      }
      setShowBuilder(false)
      setEditingTemplate(null)
      loadTemplates()
    } catch (error) {
      console.error('Error saving template:', error)
      toast({
        title: 'Error',
        description: 'Failed to save template',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return
    
    try {
      await printingTemplateService.deleteTemplate(templateId)
      toast({
        title: 'Success',
        description: 'Template deleted successfully',
      })
      loadTemplates()
    } catch (error) {
      console.error('Error deleting template:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete template',
        variant: 'destructive',
      })
    }
  }

  const handleSetDefault = async (type: TemplateType, templateId: string) => {
    try {
      await printingTemplateService.setDefaultTemplate(type, templateId)
      toast({
        title: 'Success',
        description: 'Default template set successfully',
      })
      loadTemplates()
    } catch (error) {
      console.error('Error setting default template:', error)
      toast({
        title: 'Error',
        description: 'Failed to set default template',
        variant: 'destructive',
      })
    }
  }

  if (showBuilder && editingTemplate) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => setShowBuilder(false)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                {editingTemplate.id ? 'Edit Template' : 'Create Template'}
              </h1>
              <p className="text-muted-foreground">
                {editingTemplate.name}
              </p>
            </div>
          </div>
        </div>
        
        <TemplateBuilder
          template={editingTemplate}
          onSave={handleSaveTemplate}
          onCancel={() => setShowBuilder(false)}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Printing Settings</h1>
          <p className="text-muted-foreground">
            Manage print templates and printer configurations
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="printers" className="gap-2">
            <Printer className="h-4 w-4" />
            Printers
          </TabsTrigger>
          <TabsTrigger value="defaults" className="gap-2">
            <Settings className="h-4 w-4" />
            Defaults
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6">
          {/* Quick Create Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="hover:border-primary cursor-pointer transition-colors" onClick={() => handleCreateTemplate('THERMAL_RECEIPT')}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Receipt className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Thermal Receipt</h3>
                    <p className="text-sm text-muted-foreground">80mm/58mm POS receipts</p>
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
                    <p className="text-sm text-muted-foreground">Professional invoices</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="hover:border-primary cursor-pointer transition-colors" onClick={() => handleCreateTemplate('REPAIR_TICKET')}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Wrench className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Repair Ticket</h3>
                    <p className="text-sm text-muted-foreground">Device repair tickets</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Templates List */}
          <Card>
            <CardHeader>
              <CardTitle>All Templates</CardTitle>
              <CardDescription>
                Manage your print templates for receipts, invoices, and more
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No templates found. Create your first template above.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          {template.type === 'THERMAL_RECEIPT' && <Receipt className="h-5 w-5 text-primary" />}
                          {template.type === 'A4_INVOICE' && <FileSpreadsheet className="h-5 w-5 text-primary" />}
                          {template.type === 'A4_PROFORMA' && <FileText className="h-5 w-5 text-primary" />}
                          {template.type === 'ORDER_REQUEST' && <Ticket className="h-5 w-5 text-primary" />}
                          {template.type === 'REPAIR_TICKET' && <Wrench className="h-5 w-5 text-primary" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{template.name}</h4>
                            {template.isDefault && (
                              <Badge variant="default" className="text-xs">Default</Badge>
                            )}
                            <Badge 
                              variant={template.status === 'ACTIVE' ? 'default' : template.status === 'DRAFT' ? 'secondary' : 'outline'}
                              className="text-xs"
                            >
                              {template.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {template.description || 'No description'}
                          </p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            <span>{template.type.replace(/_/g, ' ')}</span>
                            <span>•</span>
                            <span>{template.paperSize}</span>
                            {template.updatedAt && (
                              <>
                                <span>•</span>
                                <span>Updated {new Date(template.updatedAt).toLocaleDateString()}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {!template.isDefault && template.status === 'ACTIVE' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetDefault(template.type, template.id)}
                            title="Set as default"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditTemplate(template)}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTemplate(template.id)}
                          disabled={template.isDefault}
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

        <TabsContent value="printers" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Thermometer className="h-5 w-5" />
                  Thermal Printer
                </CardTitle>
                <CardDescription>
                  Configure your thermal receipt printer
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Printer Name</Label>
                  <Input 
                    placeholder="e.g., Kitchen Printer"
                    value={printerSettings?.thermalPrinter?.name || ''}
                    onChange={(e) => {
                      setPrinterSettings(prev => ({
                        ...prev!,
                        thermalPrinter: {
                          ...prev?.thermalPrinter,
                          name: e.target.value,
                        } as ThermalPrinterConfig,
                      }))
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Paper Width</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={printerSettings?.thermalPrinter?.width === 58 ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => {
                        setPrinterSettings(prev => ({
                          ...prev!,
                          thermalPrinter: {
                            ...prev?.thermalPrinter,
                            width: 58,
                          } as ThermalPrinterConfig,
                        }))
                      }}
                    >
                      58mm
                    </Button>
                    <Button
                      variant={printerSettings?.thermalPrinter?.width === 80 ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => {
                        setPrinterSettings(prev => ({
                          ...prev!,
                          thermalPrinter: {
                            ...prev?.thermalPrinter,
                            width: 80,
                          } as ThermalPrinterConfig,
                        }))
                      }}
                    >
                      80mm
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Character Set</Label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={printerSettings?.thermalPrinter?.characterSet || 'PC437'}
                    onChange={(e) => {
                      setPrinterSettings(prev => ({
                        ...prev!,
                        thermalPrinter: {
                          ...prev?.thermalPrinter,
                          characterSet: e.target.value as any,
                        } as ThermalPrinterConfig,
                      }))
                    }}
                  >
                    <option value="PC437">PC437 (USA)</option>
                    <option value="PC850">PC850 (Multilingual)</option>
                    <option value="PC852">PC852 (Latin-2)</option>
                    <option value="PC858">PC858 (Euro)</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <Label>Auto Cut Paper</Label>
                  <Switch
                    checked={printerSettings?.thermalPrinter?.cutPaper ?? true}
                    onCheckedChange={(checked) => {
                      setPrinterSettings(prev => ({
                        ...prev!,
                        thermalPrinter: {
                          ...prev?.thermalPrinter,
                          cutPaper: checked,
                        } as ThermalPrinterConfig,
                      }))
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Open Cash Drawer</Label>
                  <Switch
                    checked={printerSettings?.thermalPrinter?.openCashDrawer ?? false}
                    onCheckedChange={(checked) => {
                      setPrinterSettings(prev => ({
                        ...prev!,
                        thermalPrinter: {
                          ...prev?.thermalPrinter,
                          openCashDrawer: checked,
                        } as ThermalPrinterConfig,
                      }))
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  A4/Letter Printer
                </CardTitle>
                <CardDescription>
                  Configure your document printer for invoices
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Printer Name</Label>
                  <Input 
                    placeholder="e.g., Office Printer"
                    value={printerSettings?.a4Printer?.name || ''}
                    onChange={(e) => {
                      setPrinterSettings(prev => ({
                        ...prev!,
                        a4Printer: {
                          ...prev?.a4Printer,
                          name: e.target.value,
                        } as A4PrinterConfig,
                      }))
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Paper Size</Label>
                  <div className="flex gap-2">
                    {['A4', 'A5', 'LETTER'].map((size) => (
                      <Button
                        key={size}
                        variant={printerSettings?.a4Printer?.paperSize === size ? 'default' : 'outline'}
                        className="flex-1"
                        onClick={() => {
                          setPrinterSettings(prev => ({
                            ...prev!,
                            a4Printer: {
                              ...prev?.a4Printer,
                              paperSize: size as any,
                            } as A4PrinterConfig,
                          }))
                        }}
                      >
                        {size}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Orientation</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={printerSettings?.a4Printer?.orientation === 'portrait' ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => {
                        setPrinterSettings(prev => ({
                          ...prev!,
                          a4Printer: {
                            ...prev?.a4Printer,
                            orientation: 'portrait',
                          } as A4PrinterConfig,
                        }))
                      }}
                    >
                      Portrait
                    </Button>
                    <Button
                      variant={printerSettings?.a4Printer?.orientation === 'landscape' ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => {
                        setPrinterSettings(prev => ({
                          ...prev!,
                          a4Printer: {
                            ...prev?.a4Printer,
                            orientation: 'landscape',
                          } as A4PrinterConfig,
                        }))
                      }}
                    >
                      Landscape
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label>Duplex Printing</Label>
                  <Switch
                    checked={printerSettings?.a4Printer?.duplex ?? false}
                    onCheckedChange={(checked) => {
                      setPrinterSettings(prev => ({
                        ...prev!,
                        a4Printer: {
                          ...prev?.a4Printer,
                          duplex: checked,
                        } as A4PrinterConfig,
                      }))
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Color Printing</Label>
                  <Switch
                    checked={printerSettings?.a4Printer?.color ?? false}
                    onCheckedChange={(checked) => {
                      setPrinterSettings(prev => ({
                        ...prev!,
                        a4Printer: {
                          ...prev?.a4Printer,
                          color: checked,
                        } as A4PrinterConfig,
                      }))
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="printers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Printer Configuration</CardTitle>
              <CardDescription>
                Configure your thermal and document printers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Printer configuration is managed in the "Templates" tab. Each template type 
                can have specific printer settings.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="defaults" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Default Templates</CardTitle>
              <CardDescription>
                Set default templates for each print type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(['THERMAL_RECEIPT', 'A4_INVOICE', 'A4_PROFORMA', 'ORDER_REQUEST', 'REPAIR_TICKET'] as TemplateType[]).map((type) => {
                  const typeTemplates = templates.filter(t => t.type === type)
                  const defaultTemplate = typeTemplates.find(t => t.isDefault)
                  
                  return (
                    <div key={type} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{type.replace(/_/g, ' ')}</h4>
                        <p className="text-sm text-muted-foreground">
                          {defaultTemplate 
                            ? `Default: ${defaultTemplate.name}` 
                            : 'No default template set'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {typeTemplates.length > 0 && (
                          <select
                            className="p-2 border rounded-md text-sm"
                            value={defaultTemplate?.id || ''}
                            onChange={(e) => handleSetDefault(type, e.target.value)}
                          >
                            <option value="">Select default...</option>
                            {typeTemplates.map(template => (
                              <option key={template.id} value={template.id}>
                                {template.name}
                              </option>
                            ))}
                          </select>
                        )}
                        <Button
                          size="sm"
                          onClick={() => handleCreateTemplate(type)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Printing Behavior</CardTitle>
              <CardDescription>
                Configure default printing behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-Print Receipts</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically print receipts after sale
                  </p>
                </div>
                <Switch
                  checked={printerSettings?.autoPrintReceipt ?? false}
                  onCheckedChange={(checked) => {
                    setPrinterSettings(prev => prev ? { ...prev, autoPrintReceipt: checked } : null)
                  }}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Print Preview</Label>
                  <p className="text-sm text-muted-foreground">
                    Show preview before printing
                  </p>
                </div>
                <Switch
                  checked={printerSettings?.showPrintPreview ?? true}
                  onCheckedChange={(checked) => {
                    setPrinterSettings(prev => prev ? { ...prev, showPrintPreview: checked } : null)
                  }}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              onClick={async () => {
                try {
                  if (printerSettings) {
                    await printingTemplateService.savePrinterSettings(printerSettings)
                    toast({
                      title: 'Success',
                      description: 'Default settings saved successfully',
                    })
                  }
                } catch (error) {
                  console.error('Error saving settings:', error)
                  toast({
                    title: 'Error',
                    description: 'Failed to save settings',
                    variant: 'destructive',
                  })
                }
              }}
            >
              <Save className="mr-2 h-4 w-4" />
              Save Defaults
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
