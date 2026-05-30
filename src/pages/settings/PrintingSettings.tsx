import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  BarChart3,
  Copy,
  Eye,
  FileSpreadsheet,
  GripVertical,
  History,
  LayoutTemplate,
  Minus,
  Package,
  Plus,
  Printer,
  RefreshCcw,
  Receipt,
  Save,
  Settings2,
  PenSquare,
  Tag,
  Trash2,
  Type,
  Wrench,
} from 'lucide-react'
import { toast } from 'sonner'
import { defaultTemplates, placeholderCatalog } from '@/modules/printing/catalog'
import { normalizeTemplateDefinition, renderTemplateHtml } from '@/modules/printing/engine'
import { printingManagementService } from '@/modules/printing/printingManagementService'
import { usePrintingManager } from '@/modules/printing/usePrintingManager'
import {
  PrintDocumentType,
  PrintPreferences,
  PrintTemplate,
  PrinterRecord,
  SystemPrinterInfo,
  TemplateBlock,
  TemplateBlockType,
  TemplateSection,
} from '@/types/printing'
import { useAppSettings } from '@/contexts/AppSettingsContext'

const DOCUMENT_OPTIONS: Array<{
  value: PrintDocumentType
  label: string
  paper: '58mm' | '80mm' | 'A4'
  icon: typeof Receipt
}> = [
  { value: 'POS_INVOICE', label: 'POS Invoice', paper: '80mm', icon: Receipt },
  { value: 'CUSTOMER_RECEIPT', label: 'Customer Receipt', paper: '58mm', icon: Receipt },
  { value: 'PRODUCT_LABEL', label: 'Product Label', paper: '58mm', icon: Tag },
  { value: 'A4_INVOICE', label: 'A4 Invoice', paper: 'A4', icon: FileSpreadsheet },
  { value: 'A4_PROFORMA_INVOICE', label: 'A4 Proforma Invoice', paper: 'A4', icon: FileSpreadsheet },
  { value: 'DELIVERY_NOTE', label: 'Bon de Route', paper: 'A4', icon: Package },
  { value: 'PURCHASE_VOUCHER', label: "Bon d'Achat", paper: 'A4', icon: Package },
  { value: 'A4_REPAIR_REQUEST', label: 'A4 Repair / Order Request', paper: 'A4', icon: Wrench },
  { value: 'PAYMENT_RECEIPT', label: 'Payment Receipt', paper: 'A4', icon: FileSpreadsheet },
  { value: 'PAYMENT_IN', label: 'Payment IN', paper: 'A4', icon: FileSpreadsheet },
  { value: 'PAYMENT_OUT', label: 'Payment OUT', paper: 'A4', icon: FileSpreadsheet },
  { value: 'ORDER_REQUEST', label: 'Order Request', paper: 'A4', icon: Package },
  { value: 'SUPPLIER_INVOICE', label: 'Supplier Invoice', paper: 'A4', icon: FileSpreadsheet },
  { value: 'REPAIR_TICKET', label: 'Repair Ticket', paper: '80mm', icon: Wrench },
]

const BLOCK_PALETTE: Array<{ type: TemplateBlockType; label: string; icon: typeof Type }> = [
  { type: 'text', label: 'Text', icon: Type },
  { type: 'variable', label: 'Variable', icon: Type },
  { type: 'table', label: 'Table', icon: BarChart3 },
  { type: 'barcode', label: 'Barcode', icon: Tag },
  { type: 'qrcode', label: 'QR Code', icon: Tag },
  { type: 'image', label: 'Image', icon: Eye },
  { type: 'signature', label: 'Signature', icon: PenSquare },
  { type: 'divider', label: 'Divider', icon: Minus },
  { type: 'spacer', label: 'Spacer', icon: GripVertical },
]

const createBlock = (type: TemplateBlockType): TemplateBlock => ({
  id: `block-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  type,
  label: type.charAt(0).toUpperCase() + type.slice(1),
  content:
    type === 'variable'
      ? '{{shop.name}}'
      : type === 'signature'
        ? 'Authorized Signature'
        : type === 'divider'
          ? ''
          : `New ${type} block`,
  value: type === 'variable' ? '{{shop.name}}' : `New ${type} block`,
  placeholder: type === 'variable' ? '{{shop.name}}' : undefined,
  barcodeValue: undefined,
  qrCodeValue: undefined,
  tableConfig: type === 'table'
    ? {
        headers: ['Item', 'Qty', 'Price', 'Total'],
        rows: [],
        bindings: ['name', 'quantity', 'price', 'total'],
        showHeader: true,
        showBorders: true,
      }
    : undefined,
  style: {
    fontSize: type === 'text' || type === 'variable' ? 12 : undefined,
    textAlign: 'left',
    padding: 0,
    marginBottom: 6,
  },
  width: type === 'image' ? 180 : undefined,
  height: type === 'spacer' ? 20 : undefined,
})

const syncTemplateSections = (template: PrintTemplate): PrintTemplate => {
  const definition = normalizeTemplateDefinition(template)
  const header = definition.sections.find((section) => section.type === 'header')?.blocks || []
  const body = definition.sections.find((section) => section.type === 'body')?.blocks || []
  const footer = definition.sections.find((section) => section.type === 'footer')?.blocks || []

  return {
    ...template,
    definition,
    headerFields: header.map((block) => ({
      ...block,
      type: block.type === 'divider' ? 'line' : block.type === 'variable' ? 'text' : block.type,
      value: block.content || block.value || block.placeholder,
    })),
    bodyFields: body.map((block) => ({
      ...block,
      type: block.type === 'divider' ? 'line' : block.type === 'variable' ? 'text' : block.type,
      value: block.content || block.value || block.placeholder,
    })),
    footerFields: footer.map((block) => ({
      ...block,
      type: block.type === 'divider' ? 'line' : block.type === 'variable' ? 'text' : block.type,
      value: block.content || block.value || block.placeholder,
    })),
  }
}

const createNewTemplate = (documentType: PrintDocumentType): PrintTemplate => {
  const defaultTemplate = defaultTemplates.find((template) => template.documentType === documentType) || defaultTemplates[0]
  return syncTemplateSections({
    ...defaultTemplate,
    id: '',
    name: `${defaultTemplate.name} Copy`,
    source: 'USER',
    status: 'DRAFT',
    isDefault: false,
    isEnabled: true,
    versionNumber: 1,
  })
}

const emptyPrinter = (): PrinterRecord => ({
  id: '',
  name: '',
  code: '',
  technology: 'THERMAL',
  connectionType: 'SYSTEM',
  deviceName: '',
  paperSize: '80mm',
  capabilities: ['THERMAL_80'],
  isEnabled: true,
  isDefault: false,
  settings: {
    copies: 1,
    density: 'medium',
    autoCut: true,
  },
})

export default function PrintingSettings() {
  const { t } = useAppSettings()
  const { templates, printers, assignments, history, preferences, systemPrinters, isLoading, error, refresh, templateById, printerById } = usePrintingManager()
  const [activeTab, setActiveTab] = useState('overview')
  const [editingTemplate, setEditingTemplate] = useState<PrintTemplate | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<PrintTemplate | null>(null)
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [printerDraft, setPrinterDraft] = useState<PrinterRecord | null>(null)
  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<string, { templateId: string; printerId: string }>>({})
  const [preferencesDraft, setPreferencesDraft] = useState<PrintPreferences | null>(null)

  useEffect(() => {
    if (preferences) {
      setPreferencesDraft(preferences)
    }
  }, [preferences])

  const templateSummary = useMemo(
    () => ({
      total: templates.length,
      enabled: templates.filter((template) => template.isEnabled).length,
      defaulted: templates.filter((template) => template.isDefault).length,
    }),
    [templates],
  )

  const printerSummary = useMemo(
    () => ({
      total: printers.length,
      enabled: printers.filter((printer) => printer.isEnabled).length,
      thermal: printers.filter((printer) => printer.technology === 'THERMAL').length,
      a4: printers.filter((printer) => printer.technology === 'A4').length,
    }),
    [printers],
  )

  const currentDefinition = editingTemplate ? normalizeTemplateDefinition(editingTemplate) : null
  const currentSection = currentDefinition?.sections.find((section) => section.id === selectedSectionId) || currentDefinition?.sections[0]
  const currentBlock = currentSection?.blocks.find((block) => block.id === selectedBlockId) || currentSection?.blocks[0]

  const previewHtml = useMemo(() => {
    const activeTemplate = previewTemplate || editingTemplate
    if (!activeTemplate) {
      return ''
    }

    return renderTemplateHtml(syncTemplateSections(activeTemplate), {
      ...(activeTemplate.sampleData || {}),
      shop: {
        name: 'RepairPro',
        address: '12 Main Street, Oran',
        phone: '+213 555 000 111',
        currency: 'DA',
        ...(activeTemplate.sampleData?.shop as Record<string, unknown> || {}),
      },
    })
  }, [previewTemplate, editingTemplate])

  const openTemplateBuilder = (template: PrintTemplate) => {
    const nextTemplate = syncTemplateSections({
      ...template,
      definition: normalizeTemplateDefinition(template),
    })
    setEditingTemplate(nextTemplate)
    setActiveTab('builder')
    setSelectedSectionId(nextTemplate.definition?.sections[0]?.id || null)
    setSelectedBlockId(nextTemplate.definition?.sections[0]?.blocks[0]?.id || null)
  }

  const patchEditingTemplate = (updater: (template: PrintTemplate) => PrintTemplate) => {
    setEditingTemplate((current) => {
      if (!current) {
        return current
      }

      const next = syncTemplateSections(updater(current))
      return next
    })
  }

  const patchCurrentSection = (updater: (section: TemplateSection) => TemplateSection) => {
    if (!selectedSectionId) {
      return
    }

    patchEditingTemplate((template) => ({
      ...template,
      definition: {
        ...normalizeTemplateDefinition(template),
        sections: normalizeTemplateDefinition(template).sections.map((section) =>
          section.id === selectedSectionId ? updater(section) : section,
        ),
      },
    }))
  }

  const patchCurrentBlock = (updater: (block: TemplateBlock) => TemplateBlock) => {
    if (!selectedSectionId || !selectedBlockId) {
      return
    }

    patchCurrentSection((section) => ({
      ...section,
      blocks: section.blocks.map((block) => (block.id === selectedBlockId ? updater(block) : block)),
    }))
  }

  const handleAddBlockToSection = (sectionId: string, blockType: TemplateBlockType) => {
    patchEditingTemplate((template) => ({
      ...template,
      definition: {
        ...normalizeTemplateDefinition(template),
        sections: normalizeTemplateDefinition(template).sections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                blocks: [...section.blocks, createBlock(blockType)],
              }
            : section,
        ),
      },
    }))
    setSelectedSectionId(sectionId)
  }

  const moveBlock = (direction: -1 | 1) => {
    if (!currentSection || !currentBlock) {
      return
    }

    const index = currentSection.blocks.findIndex((block) => block.id === currentBlock.id)
    const nextIndex = index + direction
    if (index < 0 || nextIndex < 0 || nextIndex >= currentSection.blocks.length) {
      return
    }

    patchCurrentSection((section) => {
      const nextBlocks = [...section.blocks]
      const [item] = nextBlocks.splice(index, 1)
      nextBlocks.splice(nextIndex, 0, item)
      return { ...section, blocks: nextBlocks }
    })
  }

  const saveTemplate = async () => {
    if (!editingTemplate) {
      return
    }

    try {
      setSavingTemplate(true)
      await printingManagementService.saveTemplate(syncTemplateSections(editingTemplate), 'Saved from builder')
      toast.success(t('templateSaved'))
      setEditingTemplate(null)
      await refresh()
    } catch (saveError) {
      console.error(saveError)
      toast.error(saveError instanceof Error ? saveError.message : t('failedToSaveTemplate'))
    } finally {
      setSavingTemplate(false)
    }
  }

  const savePrinter = async () => {
    if (!printerDraft) {
      return
    }

    try {
      await printingManagementService.savePrinter(printerDraft)
      toast.success(t('printerSaved'))
      setPrinterDraft(null)
      await refresh()
    } catch (saveError) {
      console.error(saveError)
      toast.error(saveError instanceof Error ? saveError.message : t('failedToSavePrinter'))
    }
  }

  const visibleAssignments = DOCUMENT_OPTIONS.map((option) => ({
    ...option,
    assignment: assignments.find((item) => item.documentType === option.value),
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('printerTemplatesSettings')}</h1>
          <p className="text-muted-foreground">
            {t('enterprisePrintManagement')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openTemplateBuilder(createNewTemplate('POS_INVOICE'))}>
            <Plus className="mr-2 h-4 w-4" />
            {t('newTemplate')}
          </Button>
          <Button variant="outline" onClick={() => setPrinterDraft(emptyPrinter())}>
            <Printer className="mr-2 h-4 w-4" />
            {t('addPrinter')}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t('templatesCount')}</CardDescription>
            <CardTitle>{templateSummary.total}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{templateSummary.enabled} {t('enable').toLowerCase()}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t('printersCount')}</CardDescription>
            <CardTitle>{printerSummary.total}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{printerSummary.enabled} {t('activeDevices')}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t('assignmentsTitle')}</CardDescription>
            <CardTitle>{assignments.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{t('docsMapped')}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t('printHistoryTitle')}</CardDescription>
            <CardTitle>{history.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{t('latestPrintOps')}</CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 gap-2 lg:grid-cols-7">
          <TabsTrigger value="overview">{t('overview')}</TabsTrigger>
          <TabsTrigger value="templates">{t('templatesCount')}</TabsTrigger>
          <TabsTrigger value="builder">Builder</TabsTrigger>
          <TabsTrigger value="printers">{t('printersCount')}</TabsTrigger>
          <TabsTrigger value="assignments">{t('assignmentsTitle')}</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="history">{t('printHistoryTitle')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
                <CardTitle>{t('architectureSnapshot')}</CardTitle>
                <CardDescription>{t('cleanArchitecturePrinting')}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border p-4">
                <p className="text-sm font-medium">Domain Model</p>
                <p className="mt-2 text-sm text-muted-foreground">Templates, blocks, printers, assignments, versions, and print history are all strongly typed.</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm font-medium">Template Engine</p>
                <p className="mt-2 text-sm text-muted-foreground">A single HTML rendering engine handles thermal, label, and A4 layouts from JSON definition trees.</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm font-medium">Scalable Storage</p>
                <p className="mt-2 text-sm text-muted-foreground">Templates persist to `print_templates`, while assignments, versions, printers, and history stay separate.</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm font-medium">Future Extensibility</p>
                <p className="mt-2 text-sm text-muted-foreground">New document types, printer backends, and block types fit without changing the consuming screens.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
                <CardTitle>{t('supportedOutputMatrix')}</CardTitle>
                <CardDescription>{t('outputCoverage')}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {DOCUMENT_OPTIONS.map((item) => (
                <div key={item.value} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <item.icon className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.paper}</p>
                    </div>
                  </div>
                  <Badge variant="outline">{item.value}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
                <CardTitle>{t('templateLibrary')}</CardTitle>
                <CardDescription>{t('templateLibraryDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">{t('loadingTemplates')}</p>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {templates.map((template) => (
                    <div key={template.id} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{template.name}</p>
                            {template.isDefault && <Badge>Default</Badge>}
                            {template.isEnabled ? <Badge variant="outline">Enabled</Badge> : <Badge variant="secondary">Disabled</Badge>}
                            <Badge variant="outline">{template.paperSize}</Badge>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">{template.description || t('noDescriptionProvidedShort')}</p>
                          <p className="mt-2 text-xs text-muted-foreground">{template.documentType} • v{template.versionNumber || 1}</p>
                        </div>
                        <LayoutTemplate className="h-5 w-5 text-muted-foreground" />
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => openTemplateBuilder(template)}>
                          <Settings2 className="mr-2 h-4 w-4" />
                          {t('edit')}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setPreviewTemplate(template)}>
                          <Eye className="mr-2 h-4 w-4" />
                          {t('preview')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            await printingManagementService.duplicateTemplate(template.id)
                            toast.success(t('templateDuplicated'))
                            await refresh()
                          }}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          {t('duplicate')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            if (template.documentType) {
                              await printingManagementService.setDefaultTemplate(template.id, template.documentType)
                              toast.success(t('defaultTemplateUpdated'))
                              await refresh()
                            }
                          }}
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {t('setDefault')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            await printingManagementService.toggleTemplate(template.id, !template.isEnabled)
                            await refresh()
                          }}
                        >
                          {template.isEnabled ? t('disable') : t('enable')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            await printingManagementService.printTemplateTest(template)
                          }}
                        >
                          <Printer className="mr-2 h-4 w-4" />
                          {t('testPrint')}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={async () => {
                            await printingManagementService.deleteTemplate(template.id)
                            toast.success(t('templateDeleted'))
                            await refresh()
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t('delete')}
                        </Button>
                      </div>
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>{t('assignedPrinter')}</Label>
                          <Select
                            value={template.preferredPrinterId || 'system-default'}
                            onValueChange={async (value) => {
                              await printingManagementService.setTemplatePreferredPrinter(
                                template.id,
                                value === 'system-default' ? undefined : value,
                              )
                              toast.success(t('templatePrinterUpdated'))
                              await refresh()
                            }}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="system-default">System / document default</SelectItem>
                              {printers.map((printer) => (
                                <SelectItem key={printer.id} value={printer.id}>{printer.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>{t('output')}</Label>
                          <div className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
                            {template.documentType} on {template.paperSize}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="builder" className="space-y-4">
          {!editingTemplate ? (
            <Card>
              <CardHeader>
                <CardTitle>Template Builder</CardTitle>
                <CardDescription>Open any template from the library to edit sections, blocks, conditions, typography, and preview.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-3">
                {DOCUMENT_OPTIONS.slice(0, 6).map((item) => (
                  <Button key={item.value} variant="outline" className="justify-start" onClick={() => openTemplateBuilder(createNewTemplate(item.value))}>
                    <item.icon className="mr-2 h-4 w-4" />
                    New {item.label}
                  </Button>
                ))}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 xl:grid-cols-[260px_1fr_320px]">
              <Card>
                <CardHeader>
                  <CardTitle>Builder Palette</CardTitle>
                  <CardDescription>Drag a block into any section.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <Label>Template Name</Label>
                    <Input value={editingTemplate.name} onChange={(event) => patchEditingTemplate((template) => ({ ...template, name: event.target.value }))} />
                  </div>
                  <div className="space-y-3">
                    <Label>Description</Label>
                    <Textarea value={editingTemplate.description || ''} onChange={(event) => patchEditingTemplate((template) => ({ ...template, description: event.target.value }))} />
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    {BLOCK_PALETTE.map((item) => (
                      <div
                        key={item.type}
                        draggable
                        onDragStart={(event) => event.dataTransfer.setData('text/template-block-type', item.type)}
                        className="flex cursor-grab items-center justify-between rounded-md border px-3 py-2 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <item.icon className="h-4 w-4 text-muted-foreground" />
                          {item.label}
                        </div>
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                  <Separator />
                  <ScrollArea className="h-72 pr-3">
                    <div className="space-y-4">
                      {placeholderCatalog.map((group) => (
                        <div key={group.group} className="rounded-md border p-3">
                          <p className="text-sm font-medium">{group.label}</p>
                          <div className="mt-2 space-y-2">
                            {group.variables.map((variable) => (
                              <button
                                key={variable.key}
                                type="button"
                                className="w-full rounded bg-muted px-2 py-1 text-left text-xs"
                                onClick={() => patchCurrentBlock((block) => ({
                                  ...block,
                                  content: variable.key,
                                  value: variable.key,
                                  placeholder: variable.key,
                                  label: variable.label,
                                }))}
                              >
                                {variable.key}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Drag-and-Drop Layout</CardTitle>
                      <CardDescription>Resize blocks, reorder sections, and build conditional layouts.</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setEditingTemplate(null)}>Close</Button>
                      <Button onClick={saveTemplate} disabled={savingTemplate}>
                        <Save className="mr-2 h-4 w-4" />
                        {savingTemplate ? 'Saving...' : 'Save Template'}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-4">
                    {currentDefinition?.sections.map((section) => (
                      <div
                        key={section.id}
                        className={`rounded-lg border p-4 ${selectedSectionId === section.id ? 'border-primary' : ''}`}
                        onClick={() => setSelectedSectionId(section.id)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                          event.preventDefault()
                          const blockType = event.dataTransfer.getData('text/template-block-type') as TemplateBlockType
                          if (blockType) {
                            handleAddBlockToSection(section.id, blockType)
                          }
                        }}
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <div>
                            <p className="font-medium">{section.name}</p>
                            <p className="text-xs text-muted-foreground">{section.type}</p>
                          </div>
                          <Switch
                            checked={section.enabled}
                            onCheckedChange={(checked) => patchEditingTemplate((template) => ({
                              ...template,
                              definition: {
                                ...normalizeTemplateDefinition(template),
                                sections: normalizeTemplateDefinition(template).sections.map((item) =>
                                  item.id === section.id ? { ...item, enabled: checked } : item,
                                ),
                              },
                            }))}
                          />
                        </div>

                        <div className="space-y-2">
                          {section.blocks.map((block) => (
                            <button
                              key={block.id}
                              type="button"
                              className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left ${selectedBlockId === block.id ? 'border-primary bg-primary/5' : ''}`}
                              onClick={() => {
                                setSelectedSectionId(section.id)
                                setSelectedBlockId(block.id)
                              }}
                            >
                              <div>
                                <p className="text-sm font-medium">{block.label || block.type}</p>
                                <p className="text-xs text-muted-foreground">{block.content || block.placeholder || block.type}</p>
                              </div>
                              <Badge variant="outline">{block.type}</Badge>
                            </button>
                          ))}
                          <Button size="sm" variant="outline" className="w-full" onClick={() => handleAddBlockToSection(section.id, 'text')}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Block
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Live Preview</CardTitle>
                        <CardDescription>Rendered from the same JSON structure stored in the database.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <iframe title="Template Preview" srcDoc={previewHtml} className="h-[480px] w-full rounded-md border bg-white" />
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Inspector</CardTitle>
                  <CardDescription>Content, typography, spacing, conditions, and sizing controls.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {currentBlock ? (
                    <>
                      <div className="space-y-2">
                        <Label>Label</Label>
                        <Input value={currentBlock.label || ''} onChange={(event) => patchCurrentBlock((block) => ({ ...block, label: event.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Content / Placeholder</Label>
                        <Textarea
                          value={currentBlock.content || currentBlock.placeholder || ''}
                          onChange={(event) =>
                            patchCurrentBlock((block) => ({
                              ...block,
                              content: event.target.value,
                              value: event.target.value,
                              placeholder: block.type === 'variable' ? event.target.value : block.placeholder,
                            }))
                          }
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Font Size</Label>
                          <Input
                            type="number"
                            value={currentBlock.style?.fontSize || 12}
                            onChange={(event) =>
                              patchCurrentBlock((block) => ({
                                ...block,
                                style: { ...block.style, fontSize: Number(event.target.value) || 12 },
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Text Align</Label>
                          <Select
                            value={currentBlock.style?.textAlign || 'left'}
                            onValueChange={(value) =>
                              patchCurrentBlock((block) => ({
                                ...block,
                                style: { ...block.style, textAlign: value as 'left' | 'center' | 'right' },
                              }))
                            }
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="left">Left</SelectItem>
                              <SelectItem value="center">Center</SelectItem>
                              <SelectItem value="right">Right</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Padding</Label>
                          <Input
                            type="number"
                            value={currentBlock.style?.padding || 0}
                            onChange={(event) =>
                              patchCurrentBlock((block) => ({
                                ...block,
                                style: { ...block.style, padding: Number(event.target.value) || 0 },
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Margin Bottom</Label>
                          <Input
                            type="number"
                            value={currentBlock.style?.marginBottom || 0}
                            onChange={(event) =>
                              patchCurrentBlock((block) => ({
                                ...block,
                                style: { ...block.style, marginBottom: Number(event.target.value) || 0 },
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Width</Label>
                          <Input
                            type="number"
                            value={currentBlock.width || 0}
                            onChange={(event) => patchCurrentBlock((block) => ({ ...block, width: Number(event.target.value) || undefined }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Height</Label>
                          <Input
                            type="number"
                            value={currentBlock.height || 0}
                            onChange={(event) => patchCurrentBlock((block) => ({ ...block, height: Number(event.target.value) || undefined }))}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Conditional Field</Label>
                        <Input
                          placeholder="payment.amount"
                          value={currentBlock.condition?.field || ''}
                          onChange={(event) =>
                            patchCurrentBlock((block) => ({
                              ...block,
                              condition: {
                                id: block.condition?.id || `cond-${block.id}`,
                                field: event.target.value,
                                operator: block.condition?.operator || 'exists',
                                value: block.condition?.value,
                              },
                            }))
                          }
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Condition Operator</Label>
                          <Select
                            value={currentBlock.condition?.operator || 'exists'}
                            onValueChange={(value) =>
                              patchCurrentBlock((block) => ({
                                ...block,
                                condition: {
                                  id: block.condition?.id || `cond-${block.id}`,
                                  field: block.condition?.field || '',
                                  operator: value as typeof block.condition extends undefined ? never : 'exists',
                                  value: block.condition?.value,
                                },
                              }))
                            }
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="exists">Exists</SelectItem>
                              <SelectItem value="notExists">Missing</SelectItem>
                              <SelectItem value="equals">Equals</SelectItem>
                              <SelectItem value="notEquals">Not Equals</SelectItem>
                              <SelectItem value="gt">Greater Than</SelectItem>
                              <SelectItem value="lt">Less Than</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Condition Value</Label>
                          <Input
                            value={String(currentBlock.condition?.value || '')}
                            onChange={(event) =>
                              patchCurrentBlock((block) => ({
                                ...block,
                                condition: {
                                  id: block.condition?.id || `cond-${block.id}`,
                                  field: block.condition?.field || '',
                                  operator: block.condition?.operator || 'exists',
                                  value: event.target.value,
                                },
                              }))
                            }
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => moveBlock(-1)}>Move Up</Button>
                        <Button size="sm" variant="outline" onClick={() => moveBlock(1)}>Move Down</Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            patchCurrentSection((section) => ({
                              ...section,
                              blocks: section.blocks.filter((block) => block.id !== currentBlock.id),
                            }))
                          }
                        >
                          Remove Block
                        </Button>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Select a block to edit its properties.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="printers" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle>Windows Printers</CardTitle>
                <CardDescription>Discover installed Windows printers and import them into the application registry.</CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={async () => {
                  await printingManagementService.syncWindowsPrinters()
                  toast.success('Windows printers synchronized')
                  await refresh()
                }}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Sync Windows Printers
              </Button>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {systemPrinters.length === 0 ? (
                <p className="text-sm text-muted-foreground">No Windows printers discovered yet.</p>
              ) : (
                systemPrinters.map((printer: SystemPrinterInfo) => (
                  <div key={printer.name} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{printer.displayName || printer.name}</p>
                        <p className="text-xs text-muted-foreground">{printer.name}</p>
                      </div>
                      {printer.isDefault && <Badge>Windows Default</Badge>}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{printer.description || 'Installed printer device'}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Printer Registry</CardTitle>
              <CardDescription>Manage thermal receipt, thermal label, and A4 document printers.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-2">
              {printers.map((printer) => (
                <div key={printer.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{printer.name}</p>
                        {printer.isDefault && <Badge>Default</Badge>}
                        <Badge variant="outline">{printer.paperSize}</Badge>
                        <Badge variant="outline">{printer.technology}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{printer.deviceName || 'System default printer'}</p>
                    </div>
                    <Printer className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => setPrinterDraft(printer)}>Edit</Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        const testAssignment = assignments.find((assignment) => assignment.printerId === printer.id)
                        if (!testAssignment) {
                          toast.error('Assign a document to this printer before test printing')
                          return
                        }
                        await printingManagementService.printTestPage(testAssignment.documentType)
                      }}
                    >
                      Test Page
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await printingManagementService.savePrinter({ ...printer, isEnabled: !printer.isEnabled })
                        await refresh()
                      }}
                    >
                      {printer.isEnabled ? 'Disable' : 'Enable'}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={async () => {
                        await printingManagementService.deletePrinter(printer.id)
                        toast.success('Printer removed')
                        await refresh()
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Assignments</CardTitle>
              <CardDescription>Assign the right template and printer to each document type.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {visibleAssignments.map((item) => {
                const templateOptions = templates.filter((template) => template.documentType === item.value)
                const currentDraft = assignmentDrafts[item.value] || {
                  templateId: item.assignment?.templateId || templateOptions[0]?.id || '',
                  printerId: item.assignment?.printerId || '',
                }
                return (
                  <div key={item.value} className="rounded-lg border p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <item.icon className="h-4 w-4 text-primary" />
                        <div>
                          <p className="font-medium">{item.label}</p>
                          <p className="text-xs text-muted-foreground">{item.value}</p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => printingManagementService.printTestPage(item.value)}>Test</Button>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Template</Label>
                        <Select
                          value={currentDraft.templateId}
                          onValueChange={(value) => setAssignmentDrafts((current) => ({ ...current, [item.value]: { ...currentDraft, templateId: value } }))}
                        >
                          <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
                          <SelectContent>
                            {templateOptions.map((template) => (
                              <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Printer</Label>
                        <Select
                          value={currentDraft.printerId}
                          onValueChange={(value) => setAssignmentDrafts((current) => ({ ...current, [item.value]: { ...currentDraft, printerId: value } }))}
                        >
                          <SelectTrigger><SelectValue placeholder="Select printer" /></SelectTrigger>
                          <SelectContent>
                            {printers.map((printer) => (
                              <SelectItem key={printer.id} value={printer.id}>{printer.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="mt-4">
                      <Button
                        size="sm"
                        onClick={async () => {
                          await printingManagementService.saveAssignment({
                            id: item.assignment?.id || '',
                            documentType: item.value,
                            templateId: currentDraft.templateId,
                            printerId: currentDraft.printerId || undefined,
                            channel: item.assignment?.channel || (item.paper === 'A4' ? 'DOCUMENT' : item.value === 'PRODUCT_LABEL' ? 'LABEL' : 'RECEIPT'),
                            isEnabled: true,
                          })
                          toast.success('Assignment saved')
                          await refresh()
                        }}
                      >
                        Save Assignment
                      </Button>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Operational Defaults</CardTitle>
              <CardDescription>Professional defaults for POS receipts, product labels, and repair workflow printing.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Default Product Label Template</Label>
                  <Select
                    value={preferencesDraft?.defaultProductLabelTemplateId || 'none'}
                    onValueChange={(value) =>
                      setPreferencesDraft((current) => ({
                        ...(current || { autoPrintPos: true, silentPrintPos: false }),
                        defaultProductLabelTemplateId: value === 'none' ? undefined : value,
                      }))
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No override</SelectItem>
                      {templates
                        .filter((template) => template.documentType === 'PRODUCT_LABEL')
                        .map((template) => (
                          <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Default POS Ticket Template</Label>
                  <Select
                    value={preferencesDraft?.defaultPosTemplateId || 'none'}
                    onValueChange={(value) =>
                      setPreferencesDraft((current) => ({
                        ...(current || { autoPrintPos: true, silentPrintPos: false }),
                        defaultPosTemplateId: value === 'none' ? undefined : value,
                      }))
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No override</SelectItem>
                      {templates
                        .filter((template) => template.documentType === 'POS_INVOICE')
                        .map((template) => (
                          <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Default Repair Ticket Template</Label>
                  <Select
                    value={preferencesDraft?.defaultRepairTicketTemplateId || 'none'}
                    onValueChange={(value) =>
                      setPreferencesDraft((current) => ({
                        ...(current || { autoPrintPos: true, silentPrintPos: false }),
                        defaultRepairTicketTemplateId: value === 'none' ? undefined : value,
                      }))
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No override</SelectItem>
                      {templates
                        .filter((template) => template.documentType === 'A4_REPAIR_REQUEST')
                        .map((template) => (
                          <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border px-4 py-4">
                  <div>
                    <p className="font-medium">Auto Print in POS</p>
                    <p className="text-sm text-muted-foreground">Enable receipt printing by default for each checkout.</p>
                  </div>
                  <Switch
                    checked={preferencesDraft?.autoPrintPos ?? true}
                    onCheckedChange={(checked) =>
                      setPreferencesDraft((current) => ({
                        ...(current || { autoPrintPos: true, silentPrintPos: false }),
                        autoPrintPos: checked,
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border px-4 py-4">
                  <div>
                    <p className="font-medium">Silent Print in POS</p>
                    <p className="text-sm text-muted-foreground">Print directly to the assigned Windows POS printer without preview.</p>
                  </div>
                  <Switch
                    checked={preferencesDraft?.silentPrintPos ?? false}
                    onCheckedChange={(checked) =>
                      setPreferencesDraft((current) => ({
                        ...(current || { autoPrintPos: true, silentPrintPos: false }),
                        silentPrintPos: checked,
                      }))
                    }
                  />
                </div>
                <Button
                  onClick={async () => {
                    if (!preferencesDraft) {
                      return
                    }
                    await printingManagementService.savePreferences(preferencesDraft)
                    toast.success('Print preferences saved')
                    await refresh()
                  }}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Print History</CardTitle>
              <CardDescription>Recent successful, failed, and test print jobs.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Printer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{entry.documentType}</TableCell>
                      <TableCell>{entry.templateId ? templateById[entry.templateId]?.name || entry.templateId : '-'}</TableCell>
                      <TableCell>{entry.printerId ? printerById[entry.printerId]?.name || entry.printerId : '-'}</TableCell>
                      <TableCell>
                        <Badge variant={entry.status === 'FAILED' ? 'destructive' : 'outline'}>{entry.status}</Badge>
                      </TableCell>
                      <TableCell>{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{previewTemplate?.name || 'Template Preview'}</DialogTitle>
            <DialogDescription>Live rendered preview for the selected template using sample data.</DialogDescription>
          </DialogHeader>
          <iframe title="Selected Template Preview" srcDoc={previewHtml} className="h-[70vh] w-full rounded-md border bg-white" />
        </DialogContent>
      </Dialog>

      <Dialog open={!!printerDraft} onOpenChange={(open) => !open && setPrinterDraft(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{printerDraft?.id ? 'Edit Printer' : 'Add Printer'}</DialogTitle>
            <DialogDescription>Register printer capabilities, connection profile, and default routing preferences.</DialogDescription>
          </DialogHeader>
          {printerDraft && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={printerDraft.name} onChange={(event) => setPrinterDraft({ ...printerDraft, name: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Code</Label>
                <Input value={printerDraft.code} onChange={(event) => setPrinterDraft({ ...printerDraft, code: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Technology</Label>
                <Select value={printerDraft.technology} onValueChange={(value) => setPrinterDraft({ ...printerDraft, technology: value as PrinterRecord['technology'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="THERMAL">Thermal</SelectItem>
                    <SelectItem value="A4">A4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Paper Size</Label>
                <Select value={printerDraft.paperSize} onValueChange={(value) => setPrinterDraft({ ...printerDraft, paperSize: value as PrinterRecord['paperSize'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="58mm">58mm</SelectItem>
                    <SelectItem value="80mm">80mm</SelectItem>
                    <SelectItem value="A4">A4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Device Name</Label>
                <Input value={printerDraft.deviceName || ''} onChange={(event) => setPrinterDraft({ ...printerDraft, deviceName: event.target.value })} />
              </div>
              <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Enabled</p>
                  <p className="text-xs text-muted-foreground">Available for assignment and test print.</p>
                </div>
                <Switch checked={printerDraft.isEnabled} onCheckedChange={(checked) => setPrinterDraft({ ...printerDraft, isEnabled: checked })} />
              </div>
              <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Default Device</p>
                  <p className="text-xs text-muted-foreground">Preferred printer for this technology family.</p>
                </div>
                <Switch checked={printerDraft.isDefault} onCheckedChange={(checked) => setPrinterDraft({ ...printerDraft, isDefault: checked })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrinterDraft(null)}>Cancel</Button>
            <Button onClick={savePrinter}>Save Printer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!!error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <History className="h-4 w-4" />
              Loading Issue
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{error}</CardContent>
        </Card>
      )}
    </div>
  )
}
