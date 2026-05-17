import { PrintTemplate } from '@/types/printing'

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

export interface LabelSize {
  name: string
  width: number
  height: number
  unit: 'mm'
}

export const labelSizes: LabelSize[] = [
  { name: '58mm', width: 58, height: 40, unit: 'mm' },
  { name: '80mm', width: 80, height: 50, unit: 'mm' },
  { name: '30x50mm', width: 30, height: 50, unit: 'mm' },
  { name: '40x60mm', width: 40, height: 60, unit: 'mm' },
  { name: '50x80mm', width: 50, height: 80, unit: 'mm' },
]

export const defaultLabelTemplates: PrintTemplate[] = [
  {
    id: 'label-58mm-default',
    name: 'Default 58mm Label',
    type: 'THERMAL_LABEL',
    status: 'ACTIVE',
    isDefault: true,
    paperSize: '58mm',
    orientation: 'portrait',
    headerFields: [],
    bodyFields: [
      {
        id: 'store-name',
        type: 'text',
        label: 'Store Name',
        value: '{{storeName}}',
        style: {
          fontSize: 10,
          fontWeight: 'bold',
          textAlign: 'center',
        },
      },
      {
        id: 'product-name',
        type: 'text',
        label: 'Product Name',
        value: '{{productName}}',
        style: {
          fontSize: 12,
          fontWeight: 'bold',
          textAlign: 'center',
        },
      },
      {
        id: 'price',
        type: 'text',
        label: 'Price',
        value: '{{currency}}{{price}}',
        style: {
          fontSize: 16,
          fontWeight: 'bold',
          textAlign: 'center',
        },
      },
      {
        id: 'barcode',
        type: 'barcode',
        label: 'Barcode',
        barcodeValue: '{{barcode}}',
        barcodeFormat: 'CODE128',
        style: {
          textAlign: 'center',
        },
      },
    ],
    footerFields: [],
    showLogo: false,
    showHeader: false,
    showFooter: false,
    showDate: false,
    showTime: false,
  },
  {
    id: 'label-80mm-default',
    name: 'Default 80mm Label',
    type: 'THERMAL_LABEL',
    status: 'ACTIVE',
    isDefault: false,
    paperSize: '80mm',
    orientation: 'portrait',
    headerFields: [],
    bodyFields: [
      {
        id: 'store-name',
        type: 'text',
        label: 'Store Name',
        value: '{{storeName}}',
        style: {
          fontSize: 12,
          fontWeight: 'bold',
          textAlign: 'center',
        },
      },
      {
        id: 'product-name',
        type: 'text',
        label: 'Product Name',
        value: '{{productName}}',
        style: {
          fontSize: 14,
          fontWeight: 'bold',
          textAlign: 'center',
        },
      },
      {
        id: 'sku',
        type: 'text',
        label: 'SKU',
        value: 'SKU: {{sku}}',
        style: {
          fontSize: 10,
          textAlign: 'center',
        },
      },
      {
        id: 'price',
        type: 'text',
        label: 'Price',
        value: '{{currency}}{{price}}',
        style: {
          fontSize: 18,
          fontWeight: 'bold',
          textAlign: 'center',
        },
      },
      {
        id: 'barcode',
        type: 'barcode',
        label: 'Barcode',
        barcodeValue: '{{barcode}}',
        barcodeFormat: 'CODE128',
        style: {
          textAlign: 'center',
        },
      },
    ],
    footerFields: [],
    showLogo: false,
    showHeader: false,
    showFooter: false,
    showDate: false,
    showTime: false,
  },
]

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
  return defaultLabelTemplates.find(t => t.paperSize === size)
}
