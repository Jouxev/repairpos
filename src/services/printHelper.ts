import { printingTemplateService } from './printingTemplateService'
import { PrintTemplate, PrintField } from '@/types/printing'

export interface ReceiptData {
  shopName: string
  shopAddress?: string
  shopPhone?: string
  shopEmail?: string
  shopWebsite?: string
  receiptNumber: string
  date: string
  time?: string
  customerName?: string
  customerAddress?: string
  customerPhone?: string
  customerEmail?: string
  items: Array<{
    name: string
    quantity: number
    price: number
    total?: number
  }>
  subtotal: number
  tax: number
  discount?: number
  total: number
  paymentMethod: string
  footer?: string
}

export interface RepairTicketData {
  shopName: string
  shopAddress?: string
  shopPhone?: string
  shopEmail?: string
  ticketNumber: string
  date: string
  time?: string
  customerName: string
  customerPhone?: string
  customerEmail?: string
  customerAddress?: string
  deviceType: string
  deviceBrand: string
  deviceModel: string
  deviceColor?: string
  serialNumber?: string
  imei?: string
  problemDescription: string
  estimatedCost: number
  prepayment?: number
  balanceDue?: number
  technicianName?: string
  notes?: string
  terms?: string
}

// Generate HTML from template and data
function generateHTMLFromTemplate(template: PrintTemplate, data: Record<string, any>): string {
  const renderField = (field: PrintField): string => {
    const value = interpolateValue(field.value || '', data)
    const style = compileStyle(field.style)

    switch (field.type) {
      case 'text':
        return `<div style="${style}">${value.replace(/\n/g, '<br>')}</div>`
      
      case 'image':
        return `<div style="${style}"><img src="${field.imageUrl || data.logoUrl || ''}" style="max-width: 100%;" /></div>`
      
      case 'barcode':
        return `<div style="${style}"><div class="barcode" style="text-align: center; font-family: 'Courier New', monospace; font-size: 24px; letter-spacing: 4px;">${field.barcodeValue || value}</div></div>`
      
      case 'qrcode':
        return `<div style="${style}"><div class="qrcode" style="width: 80px; height: 80px; margin: 0 auto; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; font-size: 10px; text-align: center;">QR<br>${field.qrCodeValue || value}</div></div>`
      
      case 'table':
        return renderTable(field, data)
      
      case 'line':
        return `<div style="${style}"><hr style="border: none; border-top: 1px ${field.style?.borderStyle || 'solid'} #000; margin: ${field.style?.margin || 5}px 0;" /></div>`
      
      case 'spacer':
        return `<div style="${style}; height: ${field.style?.height || 20}px;"></div>`
      
      default:
        return ''
    }
  }

  const renderTable = (field: PrintField, data: Record<string, any>): string => {
    const config = field.tableConfig
    if (!config) return ''

    let html = '<table style="width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12px;">'
    
    // Header
    if (config.showHeader && config.headers) {
      html += '<thead><tr>'
      config.headers.forEach(header => {
        html += `<th style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5; font-weight: bold; text-align: left;">${header}</th>`
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

  const interpolateValue = (template: string, data: Record<string, any>): string => {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match
    })
  }

  const compileStyle = (style?: Record<string, any>): string => {
    if (!style) return ''
    
    return Object.entries(style)
      .map(([key, value]) => {
        const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase()
        return `${cssKey}: ${value}`
      })
      .join('; ')
  }

  // Build HTML
  let html = `<div style="font-family: Arial, sans-serif; line-height: 1.4;">`
  
  // Header
  template.headerFields.forEach(field => {
    html += renderField(field)
  })
  
  // Body
  template.bodyFields.forEach(field => {
    html += renderField(field)
  })
  
  // Footer
  template.footerFields.forEach(field => {
    html += renderField(field)
  })
  
  html += `</div>`
  
  return html
}

// Print HTML content
function printHTML(html: string, title: string = 'Print'): void {
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('Please allow popups for this website to print')
    return
  }
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        @page { margin: 0; }
        body { 
          margin: 0; 
          padding: 20px; 
          font-family: Arial, sans-serif;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px; text-align: left; border: 1px solid #ddd; }
        th { background: #f5f5f5; }
        .barcode { font-family: 'Courier New', monospace; letter-spacing: 4px; }
        .qrcode { text-align: center; }
        @media print {
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      ${html}
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
            setTimeout(function() {
              window.close();
            }, 1000);
          }, 500);
        };
      </script>
    </body>
    </html>
  `)
  
  printWindow.document.close()
}

// Main print helper functions
export async function printReceipt(data: ReceiptData): Promise<void> {
  try {
    // Get default thermal receipt template
    const template = await printingTemplateService.getDefaultTemplate('THERMAL_RECEIPT')
    
    if (!template) {
      // Fallback to basic receipt if no template found
      console.warn('No thermal receipt template found, using basic print')
      const basicHTML = generateBasicReceiptHTML(data)
      printHTML(basicHTML, 'Receipt')
      return
    }
    
    // Generate HTML from template
    const html = generateHTMLFromTemplate(template, {
      ...data,
      items: data.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price.toFixed(2),
        total: ((item.total || item.price * item.quantity)).toFixed(2),
      })),
    })
    
    printHTML(html, 'Receipt')
  } catch (error) {
    console.error('Error printing receipt:', error)
    throw error
  }
}

export async function printRepairTicket(data: RepairTicketData): Promise<void> {
  try {
    // Get default repair ticket template
    const template = await printingTemplateService.getDefaultTemplate('REPAIR_TICKET')
    
    if (!template) {
      console.warn('No repair ticket template found')
      throw new Error('No repair ticket template found. Please create one in Settings > Printing.')
    }
    
    // Generate HTML from template
    const html = generateHTMLFromTemplate(template, data)
    
    printHTML(html, 'Repair Ticket')
  } catch (error) {
    console.error('Error printing repair ticket:', error)
    throw error
  }
}

export async function printInvoice(data: ReceiptData): Promise<void> {
  try {
    // Get default A4 invoice template
    const template = await printingTemplateService.getDefaultTemplate('A4_INVOICE')
    
    if (!template) {
      console.warn('No invoice template found')
      throw new Error('No invoice template found. Please create one in Settings > Printing.')
    }
    
    // Generate HTML from template
    const html = generateHTMLFromTemplate(template, {
      ...data,
      items: data.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price.toFixed(2),
        total: ((item.total || item.price * item.quantity)).toFixed(2),
      })),
    })
    
    printHTML(html, 'Invoice')
  } catch (error) {
    console.error('Error printing invoice:', error)
    throw error
  }
}

// Generate basic receipt HTML as fallback
function generateBasicReceiptHTML(data: ReceiptData): string {
  return `
    <div style="font-family: monospace; width: 300px; padding: 20px;">
      <h2 style="text-align: center; margin-bottom: 10px;">${data.shopName}</h2>
      ${data.shopAddress ? `<p style="text-align: center; font-size: 12px; margin: 2px 0;">${data.shopAddress}</p>` : ''}
      ${data.shopPhone ? `<p style="text-align: center; font-size: 12px; margin: 2px 0;">Phone: ${data.shopPhone}</p>` : ''}
      <hr style="border: none; border-top: 1px dashed #000; margin: 10px 0;" />
      
      <p style="font-size: 12px; margin: 2px 0;">Receipt #: ${data.receiptNumber}</p>
      <p style="font-size: 12px; margin: 2px 0;">Date: ${data.date}</p>
      ${data.customerName ? `<p style="font-size: 12px; margin: 2px 0;">Customer: ${data.customerName}</p>` : ''}
      
      <hr style="border: none; border-top: 1px dashed #000; margin: 10px 0;" />
      
      <table style="width: 100%; font-size: 12px;">
        <thead>
          <tr>
            <th style="text-align: left;">Item</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${data.items.map(item => `
            <tr>
              <td style="text-align: left;">${item.name}</td>
              <td style="text-align: center;">${item.quantity}</td>
              <td style="text-align: right;">$${item.price.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <hr style="border: none; border-top: 1px dashed #000; margin: 10px 0;" />
      
      <div style="font-size: 12px;">
        <div style="display: flex; justify-content: space-between; margin: 2px 0;">
          <span>Subtotal:</span>
          <span>$${data.subtotal.toFixed(2)}</span>
        </div>
        ${data.discount ? `
        <div style="display: flex; justify-content: space-between; margin: 2px 0;">
          <span>Discount:</span>
          <span>-$${data.discount.toFixed(2)}</span>
        </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; margin: 2px 0;">
          <span>Tax:</span>
          <span>$${data.tax.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin: 4px 0; font-weight: bold; font-size: 14px;">
          <span>TOTAL:</span>
          <span>$${data.total.toFixed(2)}</span>
        </div>
      </div>
      
      <hr style="border: none; border-top: 1px dashed #000; margin: 10px 0;" />
      
      <p style="text-align: center; font-size: 12px; margin: 2px 0;">Payment Method: ${data.paymentMethod}</p>
      
      ${data.footer ? `<p style="text-align: center; font-size: 12px; margin: 10px 0;">${data.footer}</p>` : ''}
      
      <p style="text-align: center; font-size: 12px; margin-top: 20px;">Thank you for your business!</p>
    </div>
  `
}
