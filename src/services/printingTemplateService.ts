import { defaultTemplates } from '@/modules/printing/catalog'
import { printingManagementService } from '@/modules/printing/printingManagementService'
import { PrintTemplate } from '@/types/printing'

export const defaultThermalReceiptTemplate =
  defaultTemplates.find((template) => template.documentType === 'POS_INVOICE') || defaultTemplates[0]

export const defaultA4InvoiceTemplate =
  defaultTemplates.find((template) => template.documentType === 'A4_INVOICE') || defaultTemplates[0]

export const defaultRepairTicketTemplate =
  defaultTemplates.find((template) => template.documentType === 'A4_REPAIR_REQUEST') || defaultTemplates[0]

export const defaultThermalLabelTemplate =
  defaultTemplates.find((template) => template.documentType === 'PRODUCT_LABEL') || defaultTemplates[0]

export const sampleTemplates: PrintTemplate[] = defaultTemplates

class PrintingTemplateService {
  async getAllTemplates(): Promise<PrintTemplate[]> {
    await printingManagementService.bootstrapDefaults()
    return printingManagementService.getTemplates()
  }

  async getTemplateById(id: string): Promise<PrintTemplate | null> {
    await printingManagementService.bootstrapDefaults()
    return printingManagementService.getTemplate(id)
  }

  async getDefaultTemplate(type: string): Promise<PrintTemplate | null> {
    const templates = await this.getAllTemplates()
    return templates.find((template) => template.type === type && template.isDefault) || null
  }

  async createTemplate(template: PrintTemplate): Promise<PrintTemplate> {
    return printingManagementService.saveTemplate(template, 'Created from compatibility service')
  }

  async updateTemplate(id: string, template: Partial<PrintTemplate>): Promise<PrintTemplate> {
    const current = await this.getTemplateById(id)
    if (!current) {
      throw new Error('Template not found')
    }
    return printingManagementService.saveTemplate({ ...current, ...template }, 'Updated from compatibility service')
  }

  async deleteTemplate(id: string): Promise<void> {
    return printingManagementService.deleteTemplate(id)
  }

  async deleteAllTemplates(): Promise<void> {
    const templates = await this.getAllTemplates()
    await Promise.all(templates.map((template) => printingManagementService.deleteTemplate(template.id)))
  }

  async setAsDefault(id: string, type: string): Promise<void> {
    const template = (await this.getAllTemplates()).find((item) => item.id === id && item.type === type)
    if (template?.documentType) {
      await printingManagementService.setDefaultTemplate(id, template.documentType)
    }
  }
}

export const printingTemplateService = new PrintingTemplateService()

export const labelSizes = [
  { name: '58mm', width: 58, height: 40, unit: 'mm' as const },
  { name: '80mm', width: 80, height: 50, unit: 'mm' as const },
  { name: '50x30mm', width: 50, height: 30, unit: 'mm' as const },
  { name: '30x50mm', width: 30, height: 50, unit: 'mm' as const },
  { name: '40x60mm', width: 40, height: 60, unit: 'mm' as const },
  { name: '50x80mm', width: 50, height: 80, unit: 'mm' as const },
]

export interface LabelData {
  productName: string
  price: number
  currency?: string
  barcode?: string
  sku?: string
  storeName?: string
  storeAddress?: string
  storePhone?: string
}

export function getDefaultLabelTemplate(size: string): PrintTemplate | undefined {
  return defaultTemplates.find((template) => template.documentType === 'PRODUCT_LABEL' && template.paperSize === size)
}
