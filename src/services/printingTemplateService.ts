import { 
  PrintTemplate, 
  PrintField, 
  TemplateType, 
  TemplateStatus,
  ThermalPrinterConfig,
  A4PrinterConfig,
  PrinterSettings
} from '@/types/printing'

// Default thermal receipt template
export const defaultThermalReceiptTemplate: PrintTemplate = {
  id: 'default-thermal-receipt',
  name: 'Standard Thermal Receipt',
  description: 'Default 80mm thermal receipt template for POS',
  type: 'THERMAL_RECEIPT',
  status: 'ACTIVE',
  isDefault: true,
  paperSize: '80mm',
  orientation: 'portrait',
  marginTop: 0,
  marginRight: 0,
  marginBottom: 0,
  marginLeft: 0,
  headerFields: [
    {
      id: 'logo',
      type: 'image',
      style: { textAlign: 'center', width: '100%', margin: 10 },
    },
    {
      id: 'shopName',
      type: 'text',
      value: '{{shopName}}',
      style: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', margin: 5 },
    },
    {
      id: 'shopAddress',
      type: 'text',
      value: '{{shopAddress}}',
      style: { fontSize: 10, textAlign: 'center', margin: 2 },
    },
    {
      id: 'shopPhone',
      type: 'text',
      value: 'Phone: {{shopPhone}}',
      style: { fontSize: 10, textAlign: 'center', margin: 2 },
    },
    {
      id: 'line1',
      type: 'line',
      style: { borderStyle: 'dashed', margin: 10 },
    },
  ],
  bodyFields: [
    {
      id: 'receiptNumber',
      type: 'text',
      value: 'Receipt #: {{receiptNumber}}',
      style: { fontSize: 11, margin: 3 },
    },
    {
      id: 'date',
      type: 'text',
      value: 'Date: {{date}}',
      style: { fontSize: 11, margin: 3 },
    },
    {
      id: 'customer',
      type: 'text',
      value: 'Customer: {{customerName}}',
      style: { fontSize: 11, margin: 3 },
    },
    {
      id: 'line2',
      type: 'line',
      style: { borderStyle: 'solid', margin: 10 },
    },
    {
      id: 'itemsTable',
      type: 'table',
      tableConfig: {
        headers: ['Item', 'Qty', 'Price', 'Total'],
        rows: '{{items}}',
        showHeader: true,
        showBorders: false,
      },
      style: { fontSize: 10, margin: 5 },
    },
    {
      id: 'line3',
      type: 'line',
      style: { borderStyle: 'solid', margin: 10 },
    },
    {
      id: 'subtotal',
      type: 'text',
      value: 'Subtotal: {{subtotal}}',
      style: { fontSize: 11, textAlign: 'right', margin: 2 },
    },
    {
      id: 'tax',
      type: 'text',
      value: 'Tax: {{tax}}',
      style: { fontSize: 11, textAlign: 'right', margin: 2 },
    },
    {
      id: 'discount',
      type: 'text',
      value: 'Discount: -{{discount}}',
      style: { fontSize: 11, textAlign: 'right', margin: 2 },
    },
    {
      id: 'line4',
      type: 'line',
      style: { borderStyle: 'solid', margin: 10 },
    },
    {
      id: 'total',
      type: 'text',
      value: 'TOTAL: {{total}}',
      style: { fontSize: 14, fontWeight: 'bold', textAlign: 'right', margin: 5 },
    },
    {
      id: 'paymentMethod',
      type: 'text',
      value: 'Payment: {{paymentMethod}}',
      style: { fontSize: 11, textAlign: 'center', margin: 5 },
    },
  ],
  footerFields: [
    {
      id: 'line5',
      type: 'line',
      style: { borderStyle: 'dashed', margin: 10 },
    },
    {
      id: 'thankYou',
      type: 'text',
      value: 'Thank you for your business!',
      style: { fontSize: 12, textAlign: 'center', margin: 5 },
    },
    {
      id: 'footer',
      type: 'text',
      value: '{{footer}}',
      style: { fontSize: 9, textAlign: 'center', margin: 5, color: '#666' },
    },
    {
      id: 'qrCode',
      type: 'qrcode',
      value: '{{receiptNumber}}',
      style: { width: 80, height: 80, margin: '10 auto', textAlign: 'center' },
    },
  ],
  companyName: 'RepairPro',
  companyAddress: '123 Repair Street, Tech City',
  companyPhone: '+1 234 567 890',
  companyEmail: 'info@repairpro.com',
  companyWebsite: 'www.repairpro.com',
  taxNumber: 'TAX123456789',
  footerText: 'Thank you for choosing RepairPro!',
  showLogo: true,
  showHeader: true,
  showFooter: true,
  showDate: true,
  showTime: true,
  showPageNumber: false,
  pageNumberFormat: '1/10',
}

// Default A4 invoice template
export const defaultA4InvoiceTemplate: PrintTemplate = {
  id: 'default-a4-invoice',
  name: 'Standard A4 Invoice',
  description: 'Default A4 invoice template with company branding',
  type: 'A4_INVOICE',
  status: 'ACTIVE',
  isDefault: true,
  paperSize: 'A4',
  orientation: 'portrait',
  marginTop: 20,
  marginRight: 20,
  marginBottom: 20,
  marginLeft: 20,
  headerFields: [
    {
      id: 'headerLogo',
      type: 'image',
      style: { width: '150px', height: 'auto', margin: '0 0 10px 0' },
      x: 20,
      y: 20,
    },
    {
      id: 'companyInfo',
      type: 'text',
      value: '{{companyName}}\n{{companyAddress}}\nPhone: {{companyPhone}}\nEmail: {{companyEmail}}',
      style: { fontSize: 10, textAlign: 'left', color: '#666' },
      x: 20,
      y: 80,
    },
    {
      id: 'invoiceTitle',
      type: 'text',
      value: 'INVOICE',
      style: { fontSize: 24, fontWeight: 'bold', textAlign: 'right', color: '#333' },
      x: 400,
      y: 20,
    },
    {
      id: 'invoiceDetails',
      type: 'text',
      value: 'Invoice #: {{invoiceNumber}}\nDate: {{invoiceDate}}\nDue Date: {{dueDate}}',
      style: { fontSize: 10, textAlign: 'right', color: '#666' },
      x: 400,
      y: 60,
    },
  ],
  bodyFields: [
    {
      id: 'billTo',
      type: 'text',
      value: 'BILL TO:\n{{customerName}}\n{{customerAddress}}\n{{customerEmail}}\n{{customerPhone}}',
      style: { fontSize: 10, margin: '20px 0' },
    },
    {
      id: 'itemsTable',
      type: 'table',
      tableConfig: {
        headers: ['Item', 'Description', 'Quantity', 'Unit Price', 'Total'],
        rows: '{{items}}',
        showHeader: true,
        showBorders: true,
      },
      style: { fontSize: 10, margin: '20px 0', width: '100%' },
    },
    {
      id: 'totalsSection',
      type: 'text',
      value: 'Subtotal: {{subtotal}}\nTax ({{taxRate}}%): {{taxAmount}}\nDiscount: -{{discount}}\nShipping: {{shipping}}\n\nTOTAL: {{total}}',
      style: { fontSize: 11, textAlign: 'right', margin: '20px 0', fontWeight: 'bold' },
    },
    {
      id: 'notes',
      type: 'text',
      value: 'Notes:\n{{notes}}',
      style: { fontSize: 10, margin: '20px 0', color: '#666' },
    },
  ],
  footerFields: [
    {
      id: 'paymentInfo',
      type: 'text',
      value: 'Payment Methods:\nBank Transfer: {{bankAccount}}\nPayPal: {{paypalEmail}}\n\nPayment Terms: {{paymentTerms}}',
      style: { fontSize: 9, textAlign: 'center', margin: '20px 0', color: '#666' },
    },
    {
      id: 'thankYou',
      type: 'text',
      value: 'Thank you for your business!',
      style: { fontSize: 12, textAlign: 'center', margin: '10px 0', fontWeight: 'bold', color: '#333' },
    },
    {
      id: 'footerText',
      type: 'text',
      value: '{{footerText}}',
      style: { fontSize: 8, textAlign: 'center', margin: '10px 0', color: '#999' },
    },
  ],
  companyName: 'RepairPro',
  companyAddress: '123 Repair Street, Tech City, TC 12345',
  companyPhone: '+1 234 567 890',
  companyEmail: 'info@repairpro.com',
  companyWebsite: 'www.repairpro.com',
  taxNumber: 'TAX123456789',
  footerText: 'This is a computer-generated invoice and does not require a signature.\nFor any questions, please contact us at info@repairpro.com',
  showLogo: true,
  showHeader: true,
  showFooter: true,
  showDate: true,
  showTime: false,
  showPageNumber: true,
  pageNumberFormat: 'Page 1 of 10',
}

// Default repair ticket template
export const defaultRepairTicketTemplate: PrintTemplate = {
  id: 'default-repair-ticket',
  name: 'Standard Repair Ticket',
  description: 'Default repair ticket template for thermal printers',
  type: 'REPAIR_TICKET',
  status: 'ACTIVE',
  isDefault: true,
  paperSize: '80mm',
  orientation: 'portrait',
  marginTop: 0,
  marginRight: 0,
  marginBottom: 0,
  marginLeft: 0,
  headerFields: [
    {
      id: 'shopLogo',
      type: 'image',
      style: { textAlign: 'center', width: '100%', margin: 10 },
    },
    {
      id: 'shopName',
      type: 'text',
      value: '{{shopName}}',
      style: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', margin: 5 },
    },
    {
      id: 'shopContact',
      type: 'text',
      value: '{{shopAddress}}\nPhone: {{shopPhone}}',
      style: { fontSize: 10, textAlign: 'center', margin: 3 },
    },
    {
      id: 'line1',
      type: 'line',
      style: { borderStyle: 'dashed', margin: 8 },
    },
  ],
  bodyFields: [
    {
      id: 'ticketTitle',
      type: 'text',
      value: 'REPAIR TICKET',
      style: { fontSize: 14, fontWeight: 'bold', textAlign: 'center', margin: 5 },
    },
    {
      id: 'ticketNumber',
      type: 'text',
      value: 'Ticket #: {{ticketNumber}}',
      style: { fontSize: 12, margin: 3 },
    },
    {
      id: 'dateTime',
      type: 'text',
      value: 'Date: {{date}} {{time}}',
      style: { fontSize: 10, margin: 3 },
    },
    {
      id: 'line2',
      type: 'line',
      style: { borderStyle: 'solid', margin: 8 },
    },
    {
      id: 'customerSection',
      type: 'text',
      value: 'CUSTOMER:',
      style: { fontSize: 11, fontWeight: 'bold', margin: 5 },
    },
    {
      id: 'customerName',
      type: 'text',
      value: '{{customerName}}',
      style: { fontSize: 11, margin: 3 },
    },
    {
      id: 'customerPhone',
      type: 'text',
      value: 'Phone: {{customerPhone}}',
      style: { fontSize: 10, margin: 3 },
    },
    {
      id: 'customerEmail',
      type: 'text',
      value: 'Email: {{customerEmail}}',
      style: { fontSize: 10, margin: 3 },
    },
    {
      id: 'line3',
      type: 'line',
      style: { borderStyle: 'solid', margin: 8 },
    },
    {
      id: 'deviceSection',
      type: 'text',
      value: 'DEVICE INFORMATION:',
      style: { fontSize: 11, fontWeight: 'bold', margin: 5 },
    },
    {
      id: 'deviceType',
      type: 'text',
      value: 'Type: {{deviceType}}',
      style: { fontSize: 10, margin: 3 },
    },
    {
      id: 'deviceBrand',
      type: 'text',
      value: 'Brand: {{deviceBrand}}',
      style: { fontSize: 10, margin: 3 },
    },
    {
      id: 'deviceModel',
      type: 'text',
      value: 'Model: {{deviceModel}}',
      style: { fontSize: 10, margin: 3 },
    },
    {
      id: 'serialNumber',
      type: 'text',
      value: 'S/N: {{serialNumber}}',
      style: { fontSize: 10, margin: 3 },
    },
    {
      id: 'line4',
      type: 'line',
      style: { borderStyle: 'solid', margin: 8 },
    },
    {
      id: 'problemSection',
      type: 'text',
      value: 'PROBLEM DESCRIPTION:',
      style: { fontSize: 11, fontWeight: 'bold', margin: 5 },
    },
    {
      id: 'problemDescription',
      type: 'text',
      value: '{{problemDescription}}',
      style: { fontSize: 10, margin: 3, lineHeight: 1.4 },
    },
    {
      id: 'line5',
      type: 'line',
      style: { borderStyle: 'solid', margin: 8 },
    },
    {
      id: 'costSection',
      type: 'text',
      value: 'COST ESTIMATE:',
      style: { fontSize: 11, fontWeight: 'bold', margin: 5 },
    },
    {
      id: 'estimatedCost',
      type: 'text',
      value: 'Estimated: {{estimatedCost}}',
      style: { fontSize: 11, margin: 3 },
    },
    {
      id: 'prepayment',
      type: 'text',
      value: 'Prepaid: {{prepayment}}',
      style: { fontSize: 11, margin: 3 },
    },
    {
      id: 'balanceDue',
      type: 'text',
      value: 'Balance Due: {{balanceDue}}',
      style: { fontSize: 11, fontWeight: 'bold', margin: 3 },
    },
    {
      id: 'line6',
      type: 'line',
      style: { borderStyle: 'solid', margin: 8 },
    },
    {
      id: 'termsSection',
      type: 'text',
      value: 'TERMS & CONDITIONS:',
      style: { fontSize: 10, fontWeight: 'bold', margin: 5 },
    },
    {
      id: 'termsText',
      type: 'text',
      value: '1. We are not responsible for data loss.\n2. Unclaimed devices after 30 days will be recycled.\n3. Warranty covers parts and labor for 90 days.',
      style: { fontSize: 9, margin: 3, lineHeight: 1.3, color: '#666' },
    },
    {
      id: 'line7',
      type: 'line',
      style: { borderStyle: 'solid', margin: 10 },
    },
    {
      id: 'signatureSection',
      type: 'text',
      value: 'CUSTOMER SIGNATURE',
      style: { fontSize: 11, fontWeight: 'bold', textAlign: 'center', margin: 5 },
    },
    {
      id: 'signatureLine',
      type: 'text',
      value: '_________________________________',
      style: { fontSize: 12, textAlign: 'center', margin: 5 },
    },
    {
      id: 'signatureName',
      type: 'text',
      value: '{{customerName}}',
      style: { fontSize: 10, textAlign: 'center', margin: 5 },
    },
    {
      id: 'dateSigned',
      type: 'text',
      value: 'Date: _______________',
      style: { fontSize: 10, textAlign: 'center', margin: 5 },
    },
  ],
  footerFields: [
    {
      id: 'finalLine',
      type: 'line',
      style: { borderStyle: 'dashed', margin: 10 },
    },
    {
      id: 'barcode',
      type: 'barcode',
      barcodeFormat: 'CODE128',
      barcodeValue: '{{ticketNumber}}',
      style: { textAlign: 'center', margin: 10 },
    },
    {
      id: 'barcodeText',
      type: 'text',
      value: '{{ticketNumber}}',
      style: { fontSize: 10, textAlign: 'center', margin: 5 },
    },
    {
      id: 'thankYouFinal',
      type: 'text',
      value: 'Thank you for choosing {{shopName}}!',
      style: { fontSize: 11, textAlign: 'center', margin: 10, fontWeight: 'bold' },
    },
    {
      id: 'website',
      type: 'text',
      value: '{{shopWebsite}}',
      style: { fontSize: 9, textAlign: 'center', margin: 5, color: '#0066cc' },
    },
  ],
  companyName: 'RepairPro',
  companyAddress: '123 Repair Street, Tech City, TC 12345',
  companyPhone: '+1 234 567 890',
  companyEmail: 'info@repairpro.com',
  companyWebsite: 'www.repairpro.com',
  taxNumber: 'TAX123456789',
  footerText: 'This repair ticket constitutes an agreement between the customer and {{shopName}}. By signing above, the customer agrees to all terms and conditions outlined herein.',
  showLogo: true,
  showHeader: true,
  showFooter: true,
  showDate: true,
  showTime: true,
  showPageNumber: true,
  pageNumberFormat: 'Page 1 of 10',
}

// Sample template list
export const sampleTemplates: PrintTemplate[] = [
  defaultThermalReceiptTemplate,
  defaultA4InvoiceTemplate,
  defaultRepairTicketTemplate,
]

class PrintingTemplateService {
  private static instance: PrintingTemplateService
  private templates: Map<string, PrintTemplate> = new Map()
  private printerSettings: PrinterSettings | null = null

  private constructor() {
    // Initialize with default templates
    sampleTemplates.forEach(template => {
      this.templates.set(template.id, template)
    })
  }

  static getInstance(): PrintingTemplateService {
    if (!PrintingTemplateService.instance) {
      PrintingTemplateService.instance = new PrintingTemplateService()
    }
    return PrintingTemplateService.instance
  }

  // Get all templates
  async getAllTemplates(): Promise<PrintTemplate[]> {
    return Array.from(this.templates.values())
  }

  // Get templates by type
  async getTemplatesByType(type: TemplateType): Promise<PrintTemplate[]> {
    return Array.from(this.templates.values()).filter(t => t.type === type)
  }

  // Get default template by type
  async getDefaultTemplate(type: TemplateType): Promise<PrintTemplate | null> {
    return Array.from(this.templates.values()).find(t => t.type === type && t.isDefault) || null
  }

  // Get template by ID
  async getTemplateById(id: string): Promise<PrintTemplate | null> {
    return this.templates.get(id) || null
  }

  // Create template
  async createTemplate(template: Omit<PrintTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<PrintTemplate> {
    const newTemplate: PrintTemplate = {
      ...template,
      id: `template-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.templates.set(newTemplate.id, newTemplate)
    return newTemplate
  }

  // Update template
  async updateTemplate(id: string, updates: Partial<PrintTemplate>): Promise<PrintTemplate | null> {
    const template = this.templates.get(id)
    if (!template) return null

    const updatedTemplate: PrintTemplate = {
      ...template,
      ...updates,
      id: template.id, // Preserve ID
      updatedAt: new Date(),
    }
    this.templates.set(id, updatedTemplate)
    return updatedTemplate
  }

  // Delete template
  async deleteTemplate(id: string): Promise<boolean> {
    return this.templates.delete(id)
  }

  // Set default template
  async setDefaultTemplate(type: TemplateType, templateId: string): Promise<void> {
    // Remove default flag from all templates of this type
    Array.from(this.templates.values())
      .filter(t => t.type === type)
      .forEach(t => {
        t.isDefault = false
      })

    // Set new default
    const template = this.templates.get(templateId)
    if (template) {
      template.isDefault = true
    }
  }

  // Clone template
  async cloneTemplate(templateId: string, newName: string): Promise<PrintTemplate | null> {
    const template = this.templates.get(templateId)
    if (!template) return null

    const clonedTemplate: PrintTemplate = {
      ...template,
      id: `template-${Date.now()}`,
      name: newName,
      isDefault: false,
      status: 'DRAFT',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.templates.set(clonedTemplate.id, clonedTemplate)
    return clonedTemplate
  }

  // Get printer settings
  async getPrinterSettings(): Promise<PrinterSettings | null> {
    return this.printerSettings
  }

  // Save printer settings
  async savePrinterSettings(settings: PrinterSettings): Promise<PrinterSettings> {
    this.printerSettings = settings
    return settings
  }

  // Render template with data
  renderTemplate(template: PrintTemplate, data: Record<string, any>): string {
    let html = ''

    // Render header
    template.headerFields.forEach(field => {
      html += this.renderField(field, data)
    })

    // Render body
    template.bodyFields.forEach(field => {
      html += this.renderField(field, data)
    })

    // Render footer
    template.footerFields.forEach(field => {
      html += this.renderField(field, data)
    })

    return html
  }

  // Render individual field
  private renderField(field: PrintField, data: Record<string, any>): string {
    const value = this.interpolateValue(field.value || '', data)
    const style = this.compileStyle(field.style)

    switch (field.type) {
      case 'text':
        return `<div style="${style}">${value.replace(/\n/g, '<br>')}</div>`
      
      case 'image':
        return `<div style="${style}"><img src="${field.imageUrl || data.logoUrl || ''}" style="max-width: 100%;" /></div>`
      
      case 'barcode':
        return `<div style="${style}"><svg class="barcode" data-value="${field.barcodeValue || value}"></svg></div>`
      
      case 'qrcode':
        return `<div style="${style}"><div class="qrcode" data-value="${field.qrCodeValue || value}"></div></div>`
      
      case 'table':
        return this.renderTable(field, data)
      
      case 'line':
        return `<div style="${style}"><hr style="border: none; border-top: 1px ${field.style?.borderStyle || 'solid'} #000;" /></div>`
      
      case 'spacer':
        return `<div style="${style}">&nbsp;</div>`
      
      default:
        return ''
    }
  }

  // Interpolate template values
  private interpolateValue(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match
    })
  }

  // Compile style object to CSS string
  private compileStyle(style?: Record<string, any>): string {
    if (!style) return ''
    
    return Object.entries(style)
      .map(([key, value]) => {
        const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase()
        return `${cssKey}: ${value}`
      })
      .join('; ')
  }

  // Render table
  private renderTable(field: PrintField, data: Record<string, any>): string {
    const config = field.tableConfig
    if (!config) return ''

    let html = '<table style="width: 100%; border-collapse: collapse; margin: 10px 0;">'
    
    // Header
    if (config.showHeader && config.headers) {
      html += '<thead><tr>'
      config.headers.forEach(header => {
        html += `<th style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5; font-weight: bold;">${header}</th>`
      })
      html += '</tr></thead>'
    }
    
    // Body
    html += '<tbody>'
    const items = data.items || []
    items.forEach((item: any) => {
      html += '<tr>'
      config.headers?.forEach(header => {
        const key = header.toLowerCase().replace(/\s+/g, '')
        const value = item[key] || item[header] || ''
        html += `<td style="padding: 8px; border: 1px solid #ddd;">${value}</td>`
      })
      html += '</tr>'
    })
    html += '</tbody></table>'
    
    return html
  }
}

export const printingTemplateService = PrintingTemplateService.getInstance()
export default PrintingTemplateService
