import { PrintTemplate, PrintField, TemplateType, TemplateStatus } from '@/types/printing'

const STORAGE_KEY = 'printTemplates'

// Default templates
export const defaultThermalReceiptTemplate: PrintTemplate = {
  id: 'default-thermal-receipt',
  name: 'Default Thermal Receipt',
  description: 'Default 80mm thermal receipt template',
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
      id: 'shop-name',
      type: 'text',
      label: 'Shop Name',
      value: '{{shopName}}',
      style: { fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
    },
    {
      id: 'shop-address',
      type: 'text',
      label: 'Shop Address',
      value: '{{shopAddress}}',
      style: { fontSize: 10, textAlign: 'center' },
    },
    {
      id: 'shop-phone',
      type: 'text',
      label: 'Shop Phone',
      value: '{{shopPhone}}',
      style: { fontSize: 10, textAlign: 'center' },
    },
  ],
  bodyFields: [
    {
      id: 'receipt-number',
      type: 'text',
      label: 'Receipt Number',
      value: 'Receipt #: {{receiptNumber}}',
      style: { fontSize: 10, textAlign: 'left' },
    },
    {
      id: 'date',
      type: 'text',
      label: 'Date',
      value: 'Date: {{date}}',
      style: { fontSize: 10, textAlign: 'left' },
    },
    {
      id: 'customer',
      type: 'text',
      label: 'Customer',
      value: 'Customer: {{customerName}}',
      style: { fontSize: 10, textAlign: 'left' },
    },
  ],
  footerFields: [
    {
      id: 'subtotal',
      type: 'text',
      label: 'Subtotal',
      value: 'Subtotal: {{subtotal}}',
      style: { fontSize: 10, textAlign: 'right' },
    },
    {
      id: 'tax',
      type: 'text',
      label: 'Tax',
      value: 'Tax: {{tax}}',
      style: { fontSize: 10, textAlign: 'right' },
    },
    {
      id: 'total',
      type: 'text',
      label: 'Total',
      value: 'TOTAL: {{total}}',
      style: { fontSize: 14, fontWeight: 'bold', textAlign: 'right' },
    },
    {
      id: 'thank-you',
      type: 'text',
      label: 'Thank You',
      value: 'Thank you for your business!',
      style: { fontSize: 10, textAlign: 'center', marginTop: 10 },
    },
  ],
  showLogo: false,
  showHeader: true,
  showFooter: true,
  showDate: true,
  showTime: false,
}

export const defaultA4InvoiceTemplate: PrintTemplate = {
  id: 'default-a4-invoice',
  name: 'Default A4 Invoice',
  description: 'Default A4 invoice template',
  type: 'A4_INVOICE',
  status: 'ACTIVE',
  isDefault: true,
  paperSize: 'A4',
  orientation: 'portrait',
  marginTop: 20,
  marginRight: 20,
  marginBottom: 20,
  marginLeft: 20,
  headerFields: [],
  bodyFields: [],
  footerFields: [],
  showLogo: true,
  showHeader: true,
  showFooter: true,
  showDate: true,
  showTime: false,
}

export const defaultRepairTicketTemplate: PrintTemplate = {
  id: 'default-repair-ticket',
  name: 'Default Repair Ticket',
  description: 'Default repair ticket template',
  type: 'REPAIR_TICKET',
  status: 'ACTIVE',
  isDefault: true,
  paperSize: '80mm',
  orientation: 'portrait',
  marginTop: 0,
  marginRight: 0,
  marginBottom: 0,
  marginLeft: 0,
  headerFields: [],
  bodyFields: [],
  footerFields: [],
  showLogo: false,
  showHeader: true,
  showFooter: true,
  showDate: true,
  showTime: false,
}

export const defaultThermalLabelTemplate: PrintTemplate = {
  id: 'default-thermal-label',
  name: 'Standard Product Label',
  description: 'Default 58mm/80mm thermal label for products',
  type: 'THERMAL_LABEL',
  status: 'ACTIVE',
  isDefault: true,
  paperSize: '58mm',
  orientation: 'portrait',
  marginTop: 0,
  marginRight: 0,
  marginBottom: 0,
  marginLeft: 0,
  headerFields: [],
  bodyFields: [
    {
      id: 'store-name',
      type: 'text',
      label: 'Store Name',
      value: '{{shopName}}',
      style: { fontSize: 10, fontWeight: 'bold', textAlign: 'center' },
    },
    {
      id: 'product-name',
      type: 'text',
      label: 'Product Name',
      value: '{{productName}}',
      style: { fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
    },
    {
      id: 'price',
      type: 'text',
      label: 'Price',
      value: '{{currency}}{{price}}',
      style: { fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
    },
    {
      id: 'barcode',
      type: 'barcode',
      label: 'Barcode',
      barcodeValue: '{{barcode}}',
      barcodeFormat: 'CODE128',
      style: { textAlign: 'center' },
    },
  ],
  footerFields: [],
  showLogo: false,
  showHeader: false,
  showFooter: false,
  showDate: false,
  showTime: false,
}

// Sample template list
export const sampleTemplates: PrintTemplate[] = [
  defaultThermalReceiptTemplate,
  defaultA4InvoiceTemplate,
  defaultRepairTicketTemplate,
  defaultThermalLabelTemplate,
]

// Local storage service for development/testing
class PrintingTemplateService {
  private getStorage(): PrintTemplate[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (e) {
      console.error('Error reading from storage:', e)
    }
    // Return default templates if nothing in storage
    return sampleTemplates.map(t => ({ ...t }))
  }

  private saveStorage(templates: PrintTemplate[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
    } catch (e) {
      console.error('Error saving to storage:', e)
    }
  }

  async getAllTemplates(): Promise<PrintTemplate[]> {
    return this.getStorage()
  }

  async getTemplateById(id: string): Promise<PrintTemplate | null> {
    const templates = this.getStorage()
    return templates.find(t => t.id === id) || null
  }

  async getDefaultTemplate(type: string): Promise<PrintTemplate | null> {
    const templates = this.getStorage()
    return templates.find(t => t.type === type && t.isDefault) || null
  }

  async createTemplate(template: PrintTemplate): Promise<PrintTemplate> {
    const templates = this.getStorage()
    const newTemplate = {
      ...template,
      id: `template-${Date.now()}`,
    }
    templates.push(newTemplate)
    this.saveStorage(templates)
    return newTemplate
  }

  async updateTemplate(id: string, template: Partial<PrintTemplate>): Promise<PrintTemplate> {
    const templates = this.getStorage()
    const index = templates.findIndex(t => t.id === id)
    if (index === -1) {
      throw new Error('Template not found')
    }
    templates[index] = { ...templates[index], ...template }
    this.saveStorage(templates)
    return templates[index]
  }

  async deleteTemplate(id: string): Promise<void> {
    const templates = this.getStorage()
    const filtered = templates.filter(t => t.id !== id)
    this.saveStorage(filtered)
  }

  async deleteAllTemplates(): Promise<void> {
    this.saveStorage([])
  }

  async setAsDefault(id: string, type: string): Promise<void> {
    const templates = this.getStorage()
    // Remove default from all templates of this type
    templates.forEach(t => {
      if (t.type === type) {
        t.isDefault = false
      }
    })
    // Set new default
    const template = templates.find(t => t.id === id)
    if (template) {
      template.isDefault = true
    }
    this.saveStorage(templates)
  }
}

export const printingTemplateService = new PrintingTemplateService()

export const labelSizes = [
  { name: '58mm', width: 58, height: 40, unit: 'mm' },
  { name: '80mm', width: 80, height: 50, unit: 'mm' },
  { name: '30x50mm', width: 30, height: 50, unit: 'mm' },
  { name: '40x60mm', width: 40, height: 60, unit: 'mm' },
  { name: '50x80mm', width: 50, height: 80, unit: 'mm' },
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

export function generateLabelHTML(template: PrintTemplate, data: LabelData): string {
  const { bodyFields } = template
  
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page {
          size: ${template.paperSize};
          margin: 0;
        }
        body {
          margin: 0;
          padding: 8px;
          font-family: Arial, sans-serif;
          width: 100%;
          box-sizing: border-box;
        }
        .label-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
        }
        .text-field {
          width: 100%;
          margin-bottom: 4px;
        }
        .barcode-field {
          width: 100%;
          margin-top: 8px;
        }
        svg {
          max-width: 100%;
          height: auto;
        }
      </style>
    </head>
    <body>
      <div class="label-content">
  `

  bodyFields.forEach((field) => {
    let value = field.value || ''
    
    // Replace placeholders with actual data
    value = value.replace(/\{\{productName\}\}/g, data.productName || '')
    value = value.replace(/\{\{price\}\}/g, data.price?.toFixed(2) || '0.00')
    value = value.replace(/\{\{currency\}\}/g, data.currency || '$')
    value = value.replace(/\{\{barcode\}\}/g, data.barcode || '')
    value = value.replace(/\{\{sku\}\}/g, data.sku || '')
    value = value.replace(/\{\{storeName\}\}/g, data.storeName || '')
    value = value.replace(/\{\{storeAddress\}\}/g, data.storeAddress || '')
    value = value.replace(/\{\{storePhone\}\}/g, data.storePhone || '')

    const style = field.style || {}
    const textAlign = style.textAlign || 'center'
    const fontSize = style.fontSize || 12
    const fontWeight = style.fontWeight || 'normal'

    if (field.type === 'text') {
      html += `
        <div class="text-field" style="
          text-align: ${textAlign};
          font-size: ${fontSize}px;
          font-weight: ${fontWeight};
        ">
          ${value}
        </div>
      `
    } else if (field.type === 'barcode' && data.barcode) {
      // Generate barcode using JsBarcode library (will be loaded in print window)
      html += `
        <div class="barcode-field" style="text-align: center;">
          <svg class="barcode"
            jsbarcode-format="${field.barcodeFormat || 'CODE128'}"
            jsbarcode-value="${data.barcode}"
            jsbarcode-textmargin="0"
            jsbarcode-fontoptions="bold">
          </svg>
        </div>
      `
    }
  })

  html += `
      </div>
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
      <script>
        window.onload = function() {
          JsBarcode(".barcode").init();
          setTimeout(function() {
            window.print();
          }, 500);
        };
      </script>
    </body>
    </html>
  `

  return html
}

export function printLabel(template: PrintTemplate, data: LabelData): void {
  const html = generateLabelHTML(template, data)
  
  const printWindow = window.open('', '_blank', 'width=600,height=400')
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
  }
}

export function getDefaultLabelTemplate(size: string): PrintTemplate | undefined {
  return defaultThermalLabelTemplate
}
