import {
  PrintDocumentType,
  PrintHistoryRecord,
  PrintPreferences,
  PrintTemplate,
  PrinterRecord,
  SystemPrinterInfo,
  TemplateAssignment,
  TemplateVersionRecord,
} from '@/types/printing'
import { buildTestPayload, openPrintWindow, preparePrintJob } from './engine'
import { defaultAssignments, defaultPrinters, defaultTemplates } from './catalog'

type DbModel = 'printer' | 'printTemplate' | 'templateVersion' | 'templateAssignment' | 'printHistory'

type QueryArgs = {
  model: DbModel
  operation: string
  args?: Record<string, unknown>
}

interface DbResponse<T> {
  success: boolean
  data?: T
  error?: string
}

const STORAGE_KEYS = {
  printers: 'printing-manager:printers',
  templates: 'printing-manager:templates',
  assignments: 'printing-manager:assignments',
  versions: 'printing-manager:versions',
  history: 'printing-manager:history',
  preferences: 'printing-manager:preferences',
}

const defaultPreferences: PrintPreferences = {
  defaultProductLabelTemplateId: defaultTemplates.find((template) => template.documentType === 'PRODUCT_LABEL')?.id,
  defaultPosTemplateId: defaultTemplates.find((template) => template.documentType === 'POS_INVOICE')?.id,
  defaultRepairTicketTemplateId: defaultTemplates.find((template) => template.documentType === 'A4_REPAIR_REQUEST')?.id,
  autoPrintPos: true,
  silentPrintPos: false,
}

const parseJson = <T>(value: string | null | undefined, fallback: T): T => {
  try {
    if (!value) {
      return fallback
    }

    return JSON.parse(value) as T
  } catch (error) {
    console.error('Failed to parse JSON payload:', error)
    return fallback
  }
}

const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `print-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const hasElectronDb = (): boolean => Boolean(window.electronAPI?.db?.query)
const unsupportedDbOperations = new Set<string>()
let bootstrapDefaultsPromise: Promise<void> | null = null
let hasBootstrappedDefaults = false

const runDbQuery = async <T>(params: QueryArgs): Promise<T> => {
  const operationKey = `${params.model}.${params.operation}`
  if (unsupportedDbOperations.has(operationKey)) {
    throw new Error(`Unsupported printing DB operation: ${operationKey}`)
  }

  const result = await window.electronAPI!.db.query(params)
  if (!result.success) {
    const message = result.error || `Database error calling ${params.model}.${params.operation}`
    if (message.includes('Invalid model or operation')) {
      unsupportedDbOperations.add(operationKey)
    }
    throw new Error(message)
  }
  return result.data as T
}

const readStorage = <T>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(key)
    return parseJson(value, fallback)
  } catch (error) {
    console.error(`Failed to read storage key ${key}:`, error)
    return fallback
  }
}

const writeStorage = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`Failed to write storage key ${key}:`, error)
  }
}

const logPrintingDbFallback = (_scope: string, _error: unknown): void => {}

const serializeTemplate = (template: PrintTemplate) => ({
  id: template.id || generateId(),
  name: template.name,
  description: template.description,
  type: template.type,
  status: template.status,
  isDefault: template.isDefault ?? false,
  paperSize: template.paperSize,
  orientation: template.orientation,
  marginTop: template.marginTop ?? 0,
  marginRight: template.marginRight ?? 0,
  marginBottom: template.marginBottom ?? 0,
  marginLeft: template.marginLeft ?? 0,
  headerFields: JSON.stringify(template.headerFields || []),
  bodyFields: JSON.stringify(template.bodyFields || []),
  footerFields: JSON.stringify(template.footerFields || []),
  customCss: template.customCss || template.css || '',
  logoUrl: template.logoUrl || null,
  companyName: template.companyName || null,
  companyAddress: template.companyAddress || null,
  companyPhone: template.companyPhone || null,
  companyEmail: template.companyEmail || null,
  companyWebsite: template.companyWebsite || null,
  taxNumber: template.taxNumber || null,
  footerText: template.footerText || null,
  showLogo: template.showLogo ?? true,
  showHeader: template.showHeader ?? true,
  showFooter: template.showFooter ?? true,
  showDate: template.showDate ?? true,
  showTime: template.showTime ?? false,
  showPageNumber: template.showPageNumber ?? false,
  pageNumberFormat: template.pageNumberFormat || '1/10',
  documentType: template.documentType || 'POS_INVOICE',
  printerType: template.printerType || 'THERMAL',
  channel: template.channel || 'RECEIPT',
  source: template.source || 'USER',
  schemaVersion: template.schemaVersion || 1,
  versionNumber: template.versionNumber || 1,
  definitionJson: JSON.stringify(template.definition || {}),
  settingsJson: JSON.stringify({
    paperWidth: template.paperWidth,
    paperHeight: template.paperHeight,
    preferredPrinterId: template.preferredPrinterId,
  }),
  sampleDataJson: JSON.stringify(template.sampleData || {}),
  tagsJson: JSON.stringify(template.tags || []),
  isEnabled: template.isEnabled ?? true,
  createdBy: template.createdBy || null,
  updatedBy: template.updatedBy || null,
})

const deserializeTemplate = (row: Record<string, unknown>): PrintTemplate => ({
  ...(parseJson(String(row.settingsJson || '{}'), {}) as { preferredPrinterId?: string }),
  id: String(row.id),
  name: String(row.name),
  description: row.description ? String(row.description) : undefined,
  type: String(row.type) as PrintTemplate['type'],
  documentType: String(row.documentType || 'POS_INVOICE') as PrintDocumentType,
  printerType: String(row.printerType || 'THERMAL') as PrintTemplate['printerType'],
  channel: String(row.channel || 'RECEIPT') as PrintTemplate['channel'],
  status: String(row.status || 'ACTIVE') as PrintTemplate['status'],
  source: String(row.source || 'USER') as PrintTemplate['source'],
  isDefault: Boolean(row.isDefault),
  isEnabled: row.isEnabled === undefined ? true : Boolean(row.isEnabled),
  versionNumber: Number(row.versionNumber || 1),
  schemaVersion: Number(row.schemaVersion || 1),
  definition: parseJson(String(row.definitionJson || '{}'), undefined),
  sampleData: parseJson(String(row.sampleDataJson || '{}'), {}),
  tags: parseJson(String(row.tagsJson || '[]'), []),
  paperSize: String(row.paperSize || '80mm') as PrintTemplate['paperSize'],
  orientation: String(row.orientation || 'portrait') as PrintTemplate['orientation'],
  marginTop: Number(row.marginTop || 0),
  marginRight: Number(row.marginRight || 0),
  marginBottom: Number(row.marginBottom || 0),
  marginLeft: Number(row.marginLeft || 0),
  headerFields: parseJson(String(row.headerFields || '[]'), []),
  bodyFields: parseJson(String(row.bodyFields || '[]'), []),
  footerFields: parseJson(String(row.footerFields || '[]'), []),
  customCss: row.customCss ? String(row.customCss) : undefined,
  css: row.customCss ? String(row.customCss) : undefined,
  logoUrl: row.logoUrl ? String(row.logoUrl) : undefined,
  companyName: row.companyName ? String(row.companyName) : undefined,
  companyAddress: row.companyAddress ? String(row.companyAddress) : undefined,
  companyPhone: row.companyPhone ? String(row.companyPhone) : undefined,
  companyEmail: row.companyEmail ? String(row.companyEmail) : undefined,
  companyWebsite: row.companyWebsite ? String(row.companyWebsite) : undefined,
  taxNumber: row.taxNumber ? String(row.taxNumber) : undefined,
  footerText: row.footerText ? String(row.footerText) : undefined,
  showLogo: row.showLogo === undefined ? true : Boolean(row.showLogo),
  showHeader: row.showHeader === undefined ? true : Boolean(row.showHeader),
  showFooter: row.showFooter === undefined ? true : Boolean(row.showFooter),
  showDate: row.showDate === undefined ? true : Boolean(row.showDate),
  showTime: row.showTime === undefined ? false : Boolean(row.showTime),
  showPageNumber: row.showPageNumber === undefined ? false : Boolean(row.showPageNumber),
  pageNumberFormat: String(row.pageNumberFormat || '1/10') as PrintTemplate['pageNumberFormat'],
  createdAt: row.createdAt ? String(row.createdAt) : undefined,
  updatedAt: row.updatedAt ? String(row.updatedAt) : undefined,
  createdBy: row.createdBy ? String(row.createdBy) : undefined,
  updatedBy: row.updatedBy ? String(row.updatedBy) : undefined,
})

const serializePrinter = (printer: PrinterRecord) => ({
  id: printer.id || generateId(),
  name: printer.name,
  code: printer.code,
  technology: printer.technology,
  connectionType: printer.connectionType,
  deviceName: printer.deviceName || null,
  paperSize: printer.paperSize,
  capabilitiesJson: JSON.stringify(printer.capabilities || []),
  isEnabled: printer.isEnabled,
  isDefault: printer.isDefault,
  supportsColor: printer.supportsColor ?? false,
  supportsDuplex: printer.supportsDuplex ?? false,
  settingsJson: JSON.stringify(printer.settings || {}),
  notes: printer.notes || null,
})

const deserializePrinter = (row: Record<string, unknown>): PrinterRecord => ({
  id: String(row.id),
  name: String(row.name),
  code: String(row.code),
  technology: String(row.technology) as PrinterRecord['technology'],
  connectionType: String(row.connectionType || 'SYSTEM') as PrinterRecord['connectionType'],
  deviceName: row.deviceName ? String(row.deviceName) : undefined,
  paperSize: String(row.paperSize || '80mm') as PrinterRecord['paperSize'],
  capabilities: parseJson(String(row.capabilitiesJson || '[]'), []),
  isEnabled: row.isEnabled === undefined ? true : Boolean(row.isEnabled),
  isDefault: row.isDefault === undefined ? false : Boolean(row.isDefault),
  supportsColor: row.supportsColor === undefined ? false : Boolean(row.supportsColor),
  supportsDuplex: row.supportsDuplex === undefined ? false : Boolean(row.supportsDuplex),
  settings: parseJson(String(row.settingsJson || '{}'), {}),
  notes: row.notes ? String(row.notes) : undefined,
  createdAt: row.createdAt ? String(row.createdAt) : undefined,
  updatedAt: row.updatedAt ? String(row.updatedAt) : undefined,
})

const serializeAssignment = (assignment: TemplateAssignment) => ({
  id: assignment.id || generateId(),
  documentType: assignment.documentType,
  templateId: assignment.templateId,
  printerId: assignment.printerId || null,
  channel: assignment.channel,
  isEnabled: assignment.isEnabled,
})

const deserializeAssignment = (row: Record<string, unknown>): TemplateAssignment => ({
  id: String(row.id),
  documentType: String(row.documentType) as PrintDocumentType,
  templateId: String(row.templateId),
  printerId: row.printerId ? String(row.printerId) : undefined,
  channel: String(row.channel || 'RECEIPT') as TemplateAssignment['channel'],
  isEnabled: row.isEnabled === undefined ? true : Boolean(row.isEnabled),
  createdAt: row.createdAt ? String(row.createdAt) : undefined,
  updatedAt: row.updatedAt ? String(row.updatedAt) : undefined,
})

const deserializeVersion = (row: Record<string, unknown>): TemplateVersionRecord => ({
  id: String(row.id),
  templateId: String(row.templateId),
  versionNumber: Number(row.versionNumber || 1),
  snapshot: parseJson(String(row.snapshotJson), {} as PrintTemplate),
  notes: row.notes ? String(row.notes) : undefined,
  createdBy: row.createdBy ? String(row.createdBy) : undefined,
  createdAt: row.createdAt ? String(row.createdAt) : undefined,
})

const deserializeHistory = (row: Record<string, unknown>): PrintHistoryRecord => ({
  id: String(row.id),
  documentType: String(row.documentType) as PrintDocumentType,
  templateId: row.templateId ? String(row.templateId) : undefined,
  printerId: row.printerId ? String(row.printerId) : undefined,
  status: String(row.status) as PrintHistoryRecord['status'],
  copies: Number(row.copies || 1),
  payload: parseJson(String(row.payloadJson || '{}'), {}),
  renderedHtml: row.renderedHtml ? String(row.renderedHtml) : undefined,
  errorMessage: row.errorMessage ? String(row.errorMessage) : undefined,
  triggeredBy: row.triggeredBy ? String(row.triggeredBy) : undefined,
  createdAt: row.createdAt ? String(row.createdAt) : undefined,
})

const seedLocalStorage = () => {
  if (readStorage<PrinterRecord[]>(STORAGE_KEYS.printers, []).length === 0) {
    writeStorage(STORAGE_KEYS.printers, defaultPrinters)
  }
  if (readStorage<PrintTemplate[]>(STORAGE_KEYS.templates, []).length === 0) {
    writeStorage(STORAGE_KEYS.templates, defaultTemplates)
  }
  if (readStorage<TemplateAssignment[]>(STORAGE_KEYS.assignments, []).length === 0) {
    writeStorage(STORAGE_KEYS.assignments, defaultAssignments)
  }
  if (readStorage<TemplateVersionRecord[]>(STORAGE_KEYS.versions, []).length === 0) {
    writeStorage(STORAGE_KEYS.versions, [])
  }
  if (readStorage<PrintHistoryRecord[]>(STORAGE_KEYS.history, []).length === 0) {
    writeStorage(STORAGE_KEYS.history, [])
  }
  if (!localStorage.getItem(STORAGE_KEYS.preferences)) {
    writeStorage(STORAGE_KEYS.preferences, defaultPreferences)
  }
}

class PrintingManagementService {
  async bootstrapDefaults(): Promise<void> {
    if (hasBootstrappedDefaults) {
      return
    }

    if (bootstrapDefaultsPromise) {
      await bootstrapDefaultsPromise
      return
    }

    bootstrapDefaultsPromise = (async () => {
      if (!hasElectronDb()) {
        seedLocalStorage()
        hasBootstrappedDefaults = true
        return
      }

      try {
        const printers = await runDbQuery<Array<Record<string, unknown>>>({
          model: 'printer',
          operation: 'findMany',
          args: {},
        })
        if (printers.length === 0) {
          await Promise.all(
            defaultPrinters.map((printer) =>
              runDbQuery({
                model: 'printer',
                operation: 'create',
                args: { data: serializePrinter(printer) },
              }),
            ),
          )
        }

        const templates = await runDbQuery<Array<Record<string, unknown>>>({
          model: 'printTemplate',
          operation: 'findMany',
          args: {},
        })
        const existingTemplateIds = new Set(templates.map((template) => String(template.id)))
        const missingTemplates = defaultTemplates.filter((template) => !existingTemplateIds.has(template.id))

        await Promise.all(
          missingTemplates.map((template) =>
            runDbQuery({
              model: 'printTemplate',
              operation: 'create',
              args: { data: serializeTemplate(template) },
            }),
          ),
        )

        const assignments = await runDbQuery<Array<Record<string, unknown>>>({
          model: 'templateAssignment',
          operation: 'findMany',
          args: {},
        })
        if (assignments.length === 0) {
          await Promise.all(
            defaultAssignments.map((assignment) =>
              runDbQuery({
                model: 'templateAssignment',
                operation: 'create',
                args: { data: serializeAssignment(assignment) },
              }),
            ),
          )
        }
      } catch (error) {
        logPrintingDbFallback('bootstrapDefaults', error)
        seedLocalStorage()
      }

      hasBootstrappedDefaults = true
    })()

    try {
      await bootstrapDefaultsPromise
    } finally {
      bootstrapDefaultsPromise = null
    }
  }

  async getPrinters(): Promise<PrinterRecord[]> {
    await this.bootstrapDefaults()
    if (!hasElectronDb()) {
      seedLocalStorage()
      return readStorage<PrinterRecord[]>(STORAGE_KEYS.printers, [])
    }
    try {
      const rows = await runDbQuery<Array<Record<string, unknown>>>({
        model: 'printer',
        operation: 'findMany',
        args: { orderBy: { createdAt: 'asc' } },
      })
      return rows.map(deserializePrinter)
    } catch (error) {
      logPrintingDbFallback('getPrinters', error)
      seedLocalStorage()
      return readStorage<PrinterRecord[]>(STORAGE_KEYS.printers, [])
    }
  }

  async listSystemPrinters(): Promise<SystemPrinterInfo[]> {
    if (!window.electronAPI?.printing?.listPrinters) {
      return []
    }

    const printers = await window.electronAPI.printing.listPrinters()
    return printers.map((printer) => ({
      ...printer,
      isSaved: false,
    }))
  }

  async syncWindowsPrinters(): Promise<PrinterRecord[]> {
    const systemPrinters = await this.listSystemPrinters()
    const savedPrinters = await this.getPrinters()
    const byDeviceName = new Set(savedPrinters.map((printer) => printer.deviceName || printer.name))

    const imports = systemPrinters
      .filter((printer) => !byDeviceName.has(printer.name))
      .map((printer) => {
        const name = printer.displayName || printer.name
        const normalized = name.toLowerCase()
        const inferredTechnology = normalized.includes('label') || normalized.includes('thermal') || normalized.includes('receipt')
          ? 'THERMAL'
          : 'A4'
        const inferredPaperSize = normalized.includes('58') ? '58mm' : normalized.includes('80') ? '80mm' : inferredTechnology === 'A4' ? 'A4' : '80mm'

        return this.savePrinter({
          id: '',
          name,
          code: `WIN-${name.replace(/[^a-zA-Z0-9]+/g, '-').toUpperCase()}`,
          technology: inferredTechnology,
          connectionType: 'SYSTEM',
          deviceName: printer.name,
          paperSize: inferredPaperSize,
          capabilities: inferredTechnology === 'A4' ? ['A4_DOCUMENT'] : inferredPaperSize === '58mm' ? ['THERMAL_58'] : ['THERMAL_80'],
          isEnabled: true,
          isDefault: printer.isDefault,
          settings: {
            discoveredFromWindows: true,
          },
        })
      })

    await Promise.all(imports)
    return this.getPrinters()
  }

  async savePrinter(printer: PrinterRecord): Promise<PrinterRecord> {
    if (!hasElectronDb()) {
      seedLocalStorage()
      const printers = readStorage<PrinterRecord[]>(STORAGE_KEYS.printers, [])
      const next = printer.id ? printers.filter((item) => item.id !== printer.id) : printers
      const saved = { ...printer, id: printer.id || generateId() }
      next.push(saved)
      writeStorage(STORAGE_KEYS.printers, next)
      return saved
    }

    try {
      if (printer.isDefault) {
        const existingPrinters = await this.getPrinters()
        await Promise.all(
          existingPrinters
            .filter((item) => item.technology === printer.technology && item.id !== printer.id && item.isDefault)
            .map((item) =>
              runDbQuery({
                model: 'printer',
                operation: 'update',
                args: {
                  where: { id: item.id },
                  data: { isDefault: false },
                },
              }),
            ),
        )
      }

      const payload = serializePrinter(printer)
      const row = printer.id
        ? await runDbQuery<Record<string, unknown>>({
            model: 'printer',
            operation: 'update',
            args: {
              where: { id: printer.id },
              data: payload,
            },
          })
        : await runDbQuery<Record<string, unknown>>({
            model: 'printer',
            operation: 'create',
            args: {
              data: payload,
            },
          })

      return deserializePrinter(row)
    } catch (error) {
      logPrintingDbFallback('savePrinter', error)
      seedLocalStorage()
      const printers = readStorage<PrinterRecord[]>(STORAGE_KEYS.printers, [])
      const next = printer.id ? printers.filter((item) => item.id !== printer.id) : printers
      const saved = { ...printer, id: printer.id || generateId() }

      if (saved.isDefault) {
        for (const item of next) {
          if (item.technology === saved.technology) {
            item.isDefault = false
          }
        }
      }

      next.push(saved)
      writeStorage(STORAGE_KEYS.printers, next)
      return saved
    }
  }

  async deletePrinter(id: string): Promise<void> {
    if (!hasElectronDb()) {
      writeStorage(
        STORAGE_KEYS.printers,
        readStorage<PrinterRecord[]>(STORAGE_KEYS.printers, []).filter((item) => item.id !== id),
      )
      return
    }

    try {
      await runDbQuery({
        model: 'printer',
        operation: 'delete',
        args: { where: { id } },
      })
    } catch (error) {
      logPrintingDbFallback('deletePrinter', error)
      writeStorage(
        STORAGE_KEYS.printers,
        readStorage<PrinterRecord[]>(STORAGE_KEYS.printers, []).filter((item) => item.id !== id),
      )
    }
  }

  async getTemplates(): Promise<PrintTemplate[]> {
    await this.bootstrapDefaults()
    if (!hasElectronDb()) {
      seedLocalStorage()
      return readStorage<PrintTemplate[]>(STORAGE_KEYS.templates, [])
    }
    try {
      const rows = await runDbQuery<Array<Record<string, unknown>>>({
        model: 'printTemplate',
        operation: 'findMany',
        args: {
          orderBy: { name: 'asc' },
        },
      })

      if (rows.length === 0 || !rows.some((row) => row.documentType)) {
        seedLocalStorage()
        return readStorage<PrintTemplate[]>(STORAGE_KEYS.templates, [])
      }

      return rows.map(deserializeTemplate)
    } catch (error) {
      logPrintingDbFallback('getTemplates', error)
      seedLocalStorage()
      return readStorage<PrintTemplate[]>(STORAGE_KEYS.templates, [])
    }
  }

  async getTemplate(id: string): Promise<PrintTemplate | null> {
    if (!hasElectronDb()) {
      return readStorage<PrintTemplate[]>(STORAGE_KEYS.templates, []).find((item) => item.id === id) || null
    }

    const row = await runDbQuery<Record<string, unknown> | null>({
      model: 'printTemplate',
      operation: 'findUnique',
      args: {
        where: { id },
      },
    })
    return row ? deserializeTemplate(row) : null
  }

  async saveTemplate(template: PrintTemplate, versionNote?: string): Promise<PrintTemplate> {
    if (!hasElectronDb()) {
      seedLocalStorage()
      const templates = readStorage<PrintTemplate[]>(STORAGE_KEYS.templates, [])
      const existing = templates.find((item) => item.id === template.id)
      const saved: PrintTemplate = {
        ...template,
        id: template.id || generateId(),
        versionNumber: existing ? (existing.versionNumber || 1) + 1 : 1,
      }
      writeStorage(
        STORAGE_KEYS.templates,
        [...templates.filter((item) => item.id !== saved.id), saved].sort((left, right) => left.name.localeCompare(right.name)),
      )

      const versions = readStorage<TemplateVersionRecord[]>(STORAGE_KEYS.versions, [])
      versions.push({
        id: generateId(),
        templateId: saved.id,
        versionNumber: saved.versionNumber || 1,
        snapshot: saved,
        notes: versionNote,
        createdAt: new Date().toISOString(),
      })
      writeStorage(STORAGE_KEYS.versions, versions)
      return saved
    }

    try {
      const currentTemplate = template.id ? await this.getTemplate(template.id) : null
      const nextVersionNumber = currentTemplate ? (currentTemplate.versionNumber || 1) + 1 : 1
      const persistedPayload = serializeTemplate({
        ...template,
        versionNumber: nextVersionNumber,
      })

      const row = template.id
        ? await runDbQuery<Record<string, unknown>>({
            model: 'printTemplate',
            operation: 'update',
            args: {
              where: { id: template.id },
              data: persistedPayload,
            },
          })
        : await runDbQuery<Record<string, unknown>>({
            model: 'printTemplate',
            operation: 'create',
            args: {
              data: persistedPayload,
            },
          })

      const saved = deserializeTemplate(row)

      await runDbQuery({
        model: 'templateVersion',
        operation: 'create',
        args: {
          data: {
            id: generateId(),
            templateId: saved.id,
            versionNumber: saved.versionNumber || 1,
            snapshotJson: JSON.stringify(saved),
            notes: versionNote || null,
            createdBy: saved.updatedBy || saved.createdBy || null,
          },
        },
      })

      return saved
    } catch (error) {
      logPrintingDbFallback('saveTemplate', error)
      seedLocalStorage()
      const templates = readStorage<PrintTemplate[]>(STORAGE_KEYS.templates, [])
      const existing = templates.find((item) => item.id === template.id)
      const saved: PrintTemplate = {
        ...template,
        id: template.id || generateId(),
        versionNumber: existing ? (existing.versionNumber || 1) + 1 : 1,
      }
      writeStorage(
        STORAGE_KEYS.templates,
        [...templates.filter((item) => item.id !== saved.id), saved].sort((left, right) => left.name.localeCompare(right.name)),
      )

      const versions = readStorage<TemplateVersionRecord[]>(STORAGE_KEYS.versions, [])
      versions.push({
        id: generateId(),
        templateId: saved.id,
        versionNumber: saved.versionNumber || 1,
        snapshot: saved,
        notes: versionNote,
        createdAt: new Date().toISOString(),
      })
      writeStorage(STORAGE_KEYS.versions, versions)
      return saved
    }
  }

  async duplicateTemplate(templateId: string): Promise<PrintTemplate> {
    const template = await this.getTemplate(templateId)
    if (!template) {
      throw new Error('Template not found')
    }

    const duplicate: PrintTemplate = {
      ...template,
      id: '',
      name: `${template.name} Copy`,
      source: 'USER',
      isDefault: false,
      createdAt: undefined,
      updatedAt: undefined,
    }

    return this.saveTemplate(duplicate, 'Duplicated from existing template')
  }

  async deleteTemplate(id: string): Promise<void> {
    if (!hasElectronDb()) {
      writeStorage(
        STORAGE_KEYS.templates,
        readStorage<PrintTemplate[]>(STORAGE_KEYS.templates, []).filter((item) => item.id !== id),
      )
      writeStorage(
        STORAGE_KEYS.assignments,
        readStorage<TemplateAssignment[]>(STORAGE_KEYS.assignments, []).filter((item) => item.templateId !== id),
      )
      return
    }

    await runDbQuery({
      model: 'templateAssignment',
      operation: 'deleteMany',
      args: {
        where: { templateId: id },
      },
    })

    await runDbQuery({
      model: 'printTemplate',
      operation: 'delete',
      args: {
        where: { id },
      },
    })
  }

  async setDefaultTemplate(templateId: string, documentType: PrintDocumentType): Promise<void> {
    const templates = await this.getTemplates()
    const matchingTemplates = templates.filter((item) => item.documentType === documentType)

    if (!hasElectronDb()) {
      writeStorage(
        STORAGE_KEYS.templates,
        templates.map((item) =>
          matchingTemplates.some((candidate) => candidate.id === item.id)
            ? { ...item, isDefault: item.id === templateId }
            : item,
        ),
      )
      return
    }

    await Promise.all(
      matchingTemplates.map((item) =>
        runDbQuery({
          model: 'printTemplate',
          operation: 'update',
          args: {
            where: { id: item.id },
            data: { isDefault: item.id === templateId },
          },
        }),
      ),
    )
  }

  async toggleTemplate(templateId: string, isEnabled: boolean): Promise<void> {
    if (!hasElectronDb()) {
      writeStorage(
        STORAGE_KEYS.templates,
        readStorage<PrintTemplate[]>(STORAGE_KEYS.templates, []).map((item) =>
          item.id === templateId ? { ...item, isEnabled } : item,
        ),
      )
      return
    }

    await runDbQuery({
      model: 'printTemplate',
      operation: 'update',
      args: {
        where: { id: templateId },
        data: { isEnabled },
      },
    })
  }

  async setTemplatePreferredPrinter(templateId: string, printerId?: string): Promise<PrintTemplate> {
    const template = await this.getTemplate(templateId)
    if (!template) {
      throw new Error('Template not found')
    }

    return this.saveTemplate(
      {
        ...template,
        preferredPrinterId: printerId,
      },
      'Updated preferred printer',
    )
  }

  async getPreferences(): Promise<PrintPreferences> {
    return {
      ...defaultPreferences,
      ...readStorage<PrintPreferences>(STORAGE_KEYS.preferences, defaultPreferences),
    }
  }

  async savePreferences(nextPreferences: Partial<PrintPreferences>): Promise<PrintPreferences> {
    const merged = {
      ...(await this.getPreferences()),
      ...nextPreferences,
    }
    writeStorage(STORAGE_KEYS.preferences, merged)
    return merged
  }

  async getTemplateVersions(templateId: string): Promise<TemplateVersionRecord[]> {
    if (!hasElectronDb()) {
      return readStorage<TemplateVersionRecord[]>(STORAGE_KEYS.versions, []).filter((item) => item.templateId === templateId)
    }

    const rows = await runDbQuery<Array<Record<string, unknown>>>({
      model: 'templateVersion',
      operation: 'findMany',
      args: {
        where: { templateId },
        orderBy: { versionNumber: 'desc' },
      },
    })
    return rows.map(deserializeVersion)
  }

  async getAssignments(): Promise<TemplateAssignment[]> {
    await this.bootstrapDefaults()
    if (!hasElectronDb()) {
      seedLocalStorage()
      return readStorage<TemplateAssignment[]>(STORAGE_KEYS.assignments, [])
    }
    try {
      const rows = await runDbQuery<Array<Record<string, unknown>>>({
        model: 'templateAssignment',
        operation: 'findMany',
        args: {
          orderBy: { createdAt: 'asc' },
        },
      })
      return rows.map(deserializeAssignment)
    } catch (error) {
      logPrintingDbFallback('getAssignments', error)
      seedLocalStorage()
      return readStorage<TemplateAssignment[]>(STORAGE_KEYS.assignments, [])
    }
  }

  async saveAssignment(assignment: TemplateAssignment): Promise<TemplateAssignment> {
    if (!hasElectronDb()) {
      seedLocalStorage()
      const assignments = readStorage<TemplateAssignment[]>(STORAGE_KEYS.assignments, [])
      const saved = { ...assignment, id: assignment.id || generateId() }
      writeStorage(
        STORAGE_KEYS.assignments,
        [...assignments.filter((item) => item.id !== saved.id && item.documentType !== saved.documentType), saved],
      )
      return saved
    }

    try {
      const existing = await runDbQuery<Record<string, unknown> | null>({
        model: 'templateAssignment',
        operation: 'findFirst',
        args: {
          where: { documentType: assignment.documentType },
        },
      })

      const row = existing
        ? await runDbQuery<Record<string, unknown>>({
            model: 'templateAssignment',
            operation: 'update',
            args: {
              where: { id: existing.id },
              data: serializeAssignment({ ...assignment, id: String(existing.id) }),
            },
          })
        : await runDbQuery<Record<string, unknown>>({
            model: 'templateAssignment',
            operation: 'create',
            args: {
              data: serializeAssignment(assignment),
            },
          })

      return deserializeAssignment(row)
    } catch (error) {
      logPrintingDbFallback('saveAssignment', error)
      seedLocalStorage()
      const assignments = readStorage<TemplateAssignment[]>(STORAGE_KEYS.assignments, [])
      const existing = assignments.find((item) => item.documentType === assignment.documentType)
      const saved = {
        ...assignment,
        id: assignment.id || existing?.id || generateId(),
      }
      writeStorage(
        STORAGE_KEYS.assignments,
        [...assignments.filter((item) => item.id !== saved.id && item.documentType !== saved.documentType), saved],
      )
      return saved
    }
  }

  async getHistory(limit = 30): Promise<PrintHistoryRecord[]> {
    if (!hasElectronDb()) {
      return readStorage<PrintHistoryRecord[]>(STORAGE_KEYS.history, []).slice(0, limit)
    }
    try {
      const rows = await runDbQuery<Array<Record<string, unknown>>>({
        model: 'printHistory',
        operation: 'findMany',
        args: {
          orderBy: { createdAt: 'desc' },
          take: limit,
        },
      })
      return rows.map(deserializeHistory)
    } catch (error) {
      logPrintingDbFallback('getHistory', error)
      return readStorage<PrintHistoryRecord[]>(STORAGE_KEYS.history, []).slice(0, limit)
    }
  }

  async recordHistory(entry: Omit<PrintHistoryRecord, 'id'>): Promise<void> {
    const payload = {
      id: generateId(),
      documentType: entry.documentType,
      templateId: entry.templateId || null,
      printerId: entry.printerId || null,
      status: entry.status,
      copies: entry.copies,
      payloadJson: JSON.stringify(entry.payload || {}),
      renderedHtml: entry.renderedHtml || null,
      errorMessage: entry.errorMessage || null,
      triggeredBy: entry.triggeredBy || null,
    }

    if (!hasElectronDb()) {
      const history = readStorage<PrintHistoryRecord[]>(STORAGE_KEYS.history, [])
      history.unshift({
        id: payload.id,
        documentType: entry.documentType,
        templateId: entry.templateId,
        printerId: entry.printerId,
        status: entry.status,
        copies: entry.copies,
        payload: entry.payload,
        renderedHtml: entry.renderedHtml,
        errorMessage: entry.errorMessage,
        triggeredBy: entry.triggeredBy,
        createdAt: new Date().toISOString(),
      })
      writeStorage(STORAGE_KEYS.history, history)
      return
    }

    try {
      await runDbQuery({
        model: 'printHistory',
        operation: 'create',
        args: { data: payload },
      })
    } catch (error) {
      logPrintingDbFallback('recordHistory', error)
      const history = readStorage<PrintHistoryRecord[]>(STORAGE_KEYS.history, [])
      history.unshift({
        id: payload.id,
        documentType: entry.documentType,
        templateId: entry.templateId,
        printerId: entry.printerId,
        status: entry.status,
        copies: entry.copies,
        payload: entry.payload,
        renderedHtml: entry.renderedHtml,
        errorMessage: entry.errorMessage,
        triggeredBy: entry.triggeredBy,
        createdAt: new Date().toISOString(),
      })
      writeStorage(STORAGE_KEYS.history, history)
    }
  }

  async resolveDocumentConfiguration(documentType: PrintDocumentType): Promise<{
    template: PrintTemplate
    printer?: PrinterRecord
    assignment?: TemplateAssignment
  }> {
    const preferences = await this.getPreferences()
    const [templates, printers, assignments] = await Promise.all([
      this.getTemplates(),
      this.getPrinters(),
      this.getAssignments(),
    ])

    const assignment = assignments.find((item) => item.documentType === documentType && item.isEnabled)
    const preferredTemplateId =
      documentType === 'PRODUCT_LABEL'
        ? preferences.defaultProductLabelTemplateId
        : documentType === 'POS_INVOICE'
          ? preferences.defaultPosTemplateId
          : documentType === 'A4_REPAIR_REQUEST'
            ? preferences.defaultRepairTicketTemplateId
            : undefined

    const template =
      templates.find((item) => item.id === preferredTemplateId && item.documentType === documentType) ||
      templates.find((item) => item.id === assignment?.templateId) ||
      templates.find((item) => item.documentType === documentType && item.isDefault) ||
      templates.find((item) => item.documentType === documentType)

    if (!template) {
      throw new Error(`No template configured for document type ${documentType}`)
    }

    const printer =
      printers.find((item) => item.id === template.preferredPrinterId) ||
      printers.find((item) => item.id === assignment?.printerId) ||
      printers.find((item) => item.technology === template.printerType && item.isDefault) ||
      printers.find((item) => item.technology === template.printerType)

    return { template, printer, assignment }
  }

  async printTestPage(documentType: PrintDocumentType): Promise<void> {
    const { template, printer } = await this.resolveDocumentConfiguration(documentType)
    return this.printTemplateTest(template, printer)
  }

  async executePrintHtml(params: {
    html: string
    title: string
    printer?: PrinterRecord
    silent?: boolean
  }): Promise<void> {
    const shouldUseDirectPrint = Boolean(params.silent && window.electronAPI?.printing?.printHtml && params.printer?.deviceName)

    if (shouldUseDirectPrint) {
      await window.electronAPI.printing.printHtml({
        html: params.html,
        title: params.title,
        printerName: params.printer.deviceName,
        silent: params.silent,
      })
      return
    }

    openPrintWindow(params.html, params.title)
  }

  async printTemplateTest(templateOrId: string | PrintTemplate, printerOverride?: PrinterRecord): Promise<void> {
    const template = typeof templateOrId === 'string' ? await this.getTemplate(templateOrId) : templateOrId
    if (!template) {
      throw new Error('Template not found')
    }

    const printers = await this.getPrinters()
    const printer =
      printerOverride ||
      printers.find((item) => item.id === template.preferredPrinterId) ||
      printers.find((item) => item.technology === template.printerType && item.isDefault) ||
      printers.find((item) => item.technology === template.printerType)

    const preferences = await this.getPreferences()
    const payload = buildTestPayload(template.documentType || 'POS_INVOICE')
    const job = preparePrintJob(template, printer, payload)

    try {
      await this.executePrintHtml({
        html: job.html,
        title: `Test Print - ${job.title}`,
        printer,
        silent: template.documentType === 'POS_INVOICE' ? preferences.silentPrintPos : false,
      })
      await this.recordHistory({
        documentType: template.documentType || 'POS_INVOICE',
        templateId: template.id,
        printerId: printer?.id,
        status: 'TEST',
        copies: 1,
        payload: payload,
        renderedHtml: job.html,
      })
    } catch (error) {
      await this.recordHistory({
        documentType: template.documentType || 'POS_INVOICE',
        templateId: template.id,
        printerId: printer?.id,
        status: 'FAILED',
        copies: 1,
        payload: payload,
        errorMessage: error instanceof Error ? error.message : 'Unknown print error',
      })
      throw error
    }
  }
}

export const printingManagementService = new PrintingManagementService()
