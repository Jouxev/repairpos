import {
  PrintData,
  PrintDocumentType,
  PrintTemplate,
  PrinterRecord,
  TemplateBlock,
  TemplateCondition,
  TemplateDefinition,
  TemplateSection,
} from '@/types/printing'
import JsBarcode from 'jsbarcode'
import QRCode from 'qrcode'

const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

const formatDateYmd = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const normalizePageSize = (
  size: string,
  widthMm?: number,
  heightMm?: number,
): string => {
  if (size === 'CUSTOM' && widthMm && heightMm) {
    return `${widthMm}mm ${heightMm}mm`
  }

  const knownSizes: Record<string, string> = {
    A4: '210mm 297mm',
    '58mm': '58mm 40mm',
    '80mm': '80mm 50mm',
    '50x30mm': '50mm 30mm',
    '48x30mm': '48mm 30mm',
    '30x50mm': '30mm 50mm',
    '40x60mm': '40mm 60mm',
    '50x80mm': '50mm 80mm',
  }

  if (knownSizes[size]) {
    return knownSizes[size]
  }

  const sizeMatch = size.match(/^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)mm$/i)
  if (sizeMatch) {
    return `${sizeMatch[1]}mm ${sizeMatch[2]}mm`
  }

  if (/^\d+(?:\.\d+)?mm$/i.test(size) && heightMm) {
    return `${size} ${heightMm}mm`
  }

  return size
}

const pathLookup = (source: Record<string, unknown>, path: string): unknown => {
  return path
    .replace(/[{}]/g, '')
    .split('.')
    .filter(Boolean)
    .reduce<unknown>((accumulator, segment) => {
      if (accumulator && typeof accumulator === 'object' && segment in (accumulator as Record<string, unknown>)) {
        return (accumulator as Record<string, unknown>)[segment]
      }

      return undefined
    }, source)
}

export const interpolateTemplateString = (value: string | undefined, data: Record<string, unknown>): string => {
  const rawValue = value || ''

  return rawValue.replace(/\{\{([^}]+)\}\}/g, (_match, token: string) => {
    const resolved = pathLookup(data, token.trim())
    return resolved === undefined || resolved === null ? '' : String(resolved)
  })
}

const conditionMatches = (condition: TemplateCondition | null | undefined, data: Record<string, unknown>): boolean => {
  if (!condition) {
    return true
  }

  const actualValue = pathLookup(data, condition.field)

  switch (condition.operator) {
    case 'exists':
      return actualValue !== undefined && actualValue !== null && actualValue !== ''
    case 'notExists':
      return actualValue === undefined || actualValue === null || actualValue === ''
    case 'equals':
      return String(actualValue ?? '') === String(condition.value ?? '')
    case 'notEquals':
      return String(actualValue ?? '') !== String(condition.value ?? '')
    case 'gt':
      return Number(actualValue ?? 0) > Number(condition.value ?? 0)
    case 'lt':
      return Number(actualValue ?? 0) < Number(condition.value ?? 0)
    case 'includes':
      return String(actualValue ?? '').includes(String(condition.value ?? ''))
    default:
      return true
  }
}

const styleToCss = (style: TemplateBlock['style']): string => {
  if (!style) {
    return ''
  }

  return Object.entries(style)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => {
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase()
      const cssValue = typeof value === 'number' && !['font-weight', 'line-height', 'opacity'].includes(cssKey)
        ? `${value}px`
        : String(value)
      return `${cssKey}:${cssValue}`
    })
    .join(';')
}

const resolveBarcodeFormat = (
  value: string,
  format?: TemplateBlock['barcodeFormat'],
): NonNullable<TemplateBlock['barcodeFormat']> => {
  const normalizedValue = value.trim()
  const normalizedFormat = format || 'CODE128'

  if (/[^0-9]/.test(normalizedValue)) {
    return 'CODE128'
  }

  if (normalizedFormat === 'EAN13' && normalizedValue.length !== 13) {
    return 'CODE128'
  }

  if (normalizedFormat === 'EAN8' && normalizedValue.length !== 8) {
    return 'CODE128'
  }

  if (normalizedFormat === 'UPC' && normalizedValue.length !== 12) {
    return 'CODE128'
  }

  return normalizedFormat
}

const renderBarcodeMarkup = (value: string, format?: TemplateBlock['barcodeFormat']): string => {
  const normalizedValue = value.trim()
  if (!normalizedValue) {
    return ''
  }

  if (typeof document === 'undefined') {
    return `<div style="font-family:'Courier New',monospace;text-align:center;">${escapeHtml(normalizedValue)}</div>`
  }

  try {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    JsBarcode(svg, normalizedValue, {
      format: resolveBarcodeFormat(normalizedValue, format),
      displayValue: true,
      margin: 0,
      width: 2,
      height: 54,
      fontSize: 12,
      textMargin: 4,
      background: '#ffffff',
      lineColor: '#111827',
    })
    svg.setAttribute('width', '100%')
    svg.setAttribute('height', '72')
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
    return svg.outerHTML
  } catch {
    return `<div style="font-family:'Courier New',monospace;text-align:center;">${escapeHtml(normalizedValue)}</div>`
  }
}

const renderQrCodeMarkup = (value: string): string => {
  const normalizedValue = value.trim()
  if (!normalizedValue) {
    return ''
  }

  try {
    const qr = QRCode.create(normalizedValue, {
      errorCorrectionLevel: 'M',
    })
    const size = qr.modules.size
    let path = ''

    for (let row = 0; row < size; row += 1) {
      for (let column = 0; column < size; column += 1) {
        if (qr.modules.get(column, row)) {
          path += `M${column},${row}h1v1h-1z`
        }
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="96" height="96" shape-rendering="crispEdges" aria-label="QR Code"><rect width="${size}" height="${size}" fill="#ffffff"></rect><path d="${path}" fill="#111827"></path></svg>`
  } catch {
    return `<div style="width:96px;height:96px;border:1px dashed #a1a1aa;display:flex;align-items:center;justify-content:center;text-align:center;font-size:10px;margin:0 auto;">QR<br />${escapeHtml(normalizedValue)}</div>`
  }
}

const firstNonEmptyValue = (...values: Array<string | undefined>): string =>
  values.find((value) => String(value ?? '').trim().length > 0)?.trim() || ''

const renderTableBlock = (block: TemplateBlock, data: Record<string, unknown>): string => {
  const items = Array.isArray(data.items) ? (data.items as Array<Record<string, unknown>>) : []
  const headers = block.tableConfig?.headers || ['Item', 'Qty', 'Price', 'Total']
  const bindings = block.tableConfig?.bindings || ['name', 'quantity', 'price', 'total']
  const showBorders = block.tableConfig?.showBorders ?? true
  const showHeader = block.tableConfig?.showHeader ?? true

  const headerRow = showHeader
    ? `<thead><tr>${headers
        .map(
          (header) =>
            `<th style="padding:8px;border:${showBorders ? '1px solid #d4d4d8' : 'none'};background:#f4f4f5;text-align:left;">${escapeHtml(header)}</th>`,
        )
        .join('')}</tr></thead>`
    : ''

  const bodyRows = items.length
    ? items
        .map((item) => {
          const columns = bindings
            .map((binding) => {
              const resolved = pathLookup(item, binding) ?? item[binding]
              return `<td style="padding:8px;border:${showBorders ? '1px solid #e4e4e7' : 'none'};">${escapeHtml(resolved ?? '')}</td>`
            })
            .join('')

          return `<tr>${columns}</tr>`
        })
        .join('')
    : `<tr><td colspan="${headers.length}" style="padding:10px;border:${showBorders ? '1px solid #e4e4e7' : 'none'};color:#71717a;">No items</td></tr>`

  return `<table style="width:100%;border-collapse:collapse;${styleToCss(block.style)}">${headerRow}<tbody>${bodyRows}</tbody></table>`
}

const renderBlock = (block: TemplateBlock, data: Record<string, unknown>): string => {
  if (!conditionMatches(block.condition, data)) {
    return ''
  }

  const style = styleToCss(block.style)
  const content = interpolateTemplateString(block.content || block.value || block.placeholder || '', data)

  switch (block.type) {
    case 'text':
    case 'variable':
      return `<div style="${style}">${escapeHtml(content).replace(/\n/g, '<br />')}</div>`
    case 'image':
      return `<div style="${style}"><img src="${escapeHtml(block.imageUrl || content)}" alt="${escapeHtml(block.label || 'image')}" style="max-width:100%;height:auto;" /></div>`
    case 'barcode':
      return `<div style="${style}">${renderBarcodeMarkup(firstNonEmptyValue(interpolateTemplateString(block.barcodeValue || '', data), content, interpolateTemplateString(block.value || '', data), interpolateTemplateString(block.placeholder || '', data)), block.barcodeFormat)}</div>`
    case 'qrcode':
      return `<div style="${style}">${renderQrCodeMarkup(firstNonEmptyValue(interpolateTemplateString(block.qrCodeValue || '', data), content, interpolateTemplateString(block.value || '', data), interpolateTemplateString(block.placeholder || '', data)))}</div>`
    case 'table':
      return renderTableBlock(block, data)
    case 'divider':
      return `<hr style="border:none;border-top:1px ${block.style?.borderStyle || 'solid'} ${block.style?.borderColor || '#d4d4d8'};${style}" />`
    case 'spacer':
      return `<div style="height:${block.height || 16}px;${style}"></div>`
    case 'signature':
      return `<div style="${style}"><div style="border-bottom:1px solid #18181b;min-height:32px;"></div><div style="margin-top:6px;font-size:11px;color:#52525b;">${escapeHtml(block.label || block.content || 'Signature')}</div></div>`
    default:
      return ''
  }
}

const legacyDefinition = (template: PrintTemplate): TemplateDefinition => ({
  version: 1,
  page: {
    size: template.paperSize,
    widthMm: template.paperWidth,
    heightMm: template.paperHeight,
    orientation: template.orientation,
    margin: {
      top: template.marginTop || 0,
      right: template.marginRight || 0,
      bottom: template.marginBottom || 0,
      left: template.marginLeft || 0,
    },
  },
  sections: [
    {
      id: 'legacy-header',
      name: 'Header',
      type: 'header',
      order: 1,
      enabled: template.showHeader !== false,
      blocks: template.headerFields.map((field) => ({
        ...field,
        type: field.type === 'line' ? 'divider' : field.type,
        content: field.value,
      })) as TemplateBlock[],
    },
    {
      id: 'legacy-body',
      name: 'Body',
      type: 'body',
      order: 2,
      enabled: true,
      blocks: template.bodyFields.map((field) => ({
        ...field,
        type: field.type === 'line' ? 'divider' : field.type,
        content: field.value,
      })) as TemplateBlock[],
    },
    {
      id: 'legacy-footer',
      name: 'Footer',
      type: 'footer',
      order: 3,
      enabled: template.showFooter !== false,
      blocks: template.footerFields.map((field) => ({
        ...field,
        type: field.type === 'line' ? 'divider' : field.type,
        content: field.value,
      })) as TemplateBlock[],
    },
  ],
})

export const normalizeTemplateDefinition = (template: PrintTemplate): TemplateDefinition => {
  if (template.definition?.sections?.length) {
    return template.definition
  }

  return legacyDefinition(template)
}

export const getTemplateSections = (template: PrintTemplate): TemplateSection[] =>
  normalizeTemplateDefinition(template).sections
    .filter((section) => section.enabled)
    .sort((left, right) => left.order - right.order)

export const renderTemplateHtml = (
  template: PrintTemplate,
  data: Record<string, unknown>,
  options?: {
    title?: string
  },
): string => {
  const definition = normalizeTemplateDefinition(template)
  const mergedData: Record<string, unknown> = {
    ...data,
    system: {
      date: formatDateYmd(new Date()),
      ...((data.system as Record<string, unknown> | undefined) || {}),
    },
  }
  const page = definition.page
  const pageSize = normalizePageSize(page.size, page.widthMm, page.heightMm)

  const sectionsHtml = getTemplateSections(template)
    .filter((section) => conditionMatches(section.condition, mergedData))
    .map((section) =>
      `<section data-section="${section.type}" style="margin-bottom:${section.type === 'footer' ? 0 : 10}px;">${section.blocks
        .map((block) => renderBlock(block, mergedData))
        .join('')}</section>`,
    )
    .join('')

  const margins = `${page.margin.top}mm ${page.margin.right}mm ${page.margin.bottom}mm ${page.margin.left}mm`

  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <title>${escapeHtml(options?.title || template.name)}</title>
      <style>
        @page {
          size: ${pageSize} ${page.orientation};
          margin: ${margins};
        }
        body {
          margin: 0;
          font-family: Arial, sans-serif;
          color: #18181b;
          background: white;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .print-root {
          width: 100%;
          min-height: 100vh;
        }
        ${template.customCss || template.css || ''}
      </style>
    </head>
    <body>
      <main class="print-root">
        ${sectionsHtml}
      </main>
    </body>
  </html>`
}

export const openPrintWindow = (html: string, title: string): void => {
  const printWindow = window.open('', '_blank', 'width=1024,height=768')

  if (!printWindow) {
    throw new Error('Unable to open print window. Please allow popups for printing.')
  }

  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.document.title = title
  printWindow.focus()

  setTimeout(() => {
    printWindow.print()
  }, 250)
}

export const buildTestPayload = (documentType: PrintDocumentType): Record<string, unknown> => ({
  shop: {
    name: 'RepairPro',
    address: '12 Main Street, Oran',
    phone: '+213 555 000 111',
    email: 'hello@repairpro.local',
    currency: 'DA',
  },
  sale: {
    invoiceNumber: 'INV-TEST-001',
    date: new Date().toLocaleDateString(),
    subtotal: '25000.00',
    tax: '0.00',
    total: '25000.00',
  },
  customer: {
    name: 'Test Customer',
    phone: '+213 666 111 222',
    email: 'customer@example.com',
    address: 'Oran',
  },
  supplier: {
    name: 'Test Supplier',
    phone: '+213 777 888 999',
    email: 'supplier@example.com',
    address: 'Algiers',
  },
  repair: {
    ticketNumber: 'RPR-TEST-500',
    deviceBrand: 'Samsung',
    deviceModel: 'Galaxy S23',
    problem: 'Charging port replacement',
    technician: 'Senior Technician',
  },
  order: {
    number: 'ORD-9001',
    date: new Date().toLocaleDateString(),
    status: 'Open',
    notes: `Generated test page for ${documentType}`,
  },
  payment: {
    reference: 'PAY-TEST-001',
    method: 'Cash',
    amount: '12000.00',
    direction: 'IN',
    notes: 'Test payment document',
  },
  product: {
    name: 'Battery for iPhone 11',
    sku: 'BAT-IP11',
    barcode: '123456789012',
    price: '4500.00',
    quantity: '1',
  },
  items: [
    { name: 'Battery for iPhone 11', quantity: 1, price: '4500.00', total: '4500.00' },
    { name: 'Labor', quantity: 1, price: '7500.00', total: '7500.00' },
  ],
})

export interface PreparedPrintJob {
  html: string
  title: string
  payload: Record<string, unknown>
  printer?: PrinterRecord
  template: PrintTemplate
}

export const preparePrintJob = (
  template: PrintTemplate,
  printer: PrinterRecord | undefined,
  payload: Record<string, unknown>,
): PreparedPrintJob => ({
  html: renderTemplateHtml(template, payload, { title: template.name }),
  title: template.name,
  payload,
  printer,
  template,
})

export const flattenPayloadForLegacy = (payload: Record<string, unknown>): Record<string, unknown> => {
  const output: Record<string, unknown> = { ...payload }

  const flatten = (prefix: string, value: unknown) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return
    }

    Object.entries(value).forEach(([key, nested]) => {
      output[`${prefix}${key}`] = nested
      flatten(`${prefix}${key}.`, nested)
    })
  }

  Object.entries(payload).forEach(([key, value]) => {
    flatten(`${key}.`, value)
  })

  return output
}

export const mergePrintPayload = (...payloads: Array<Record<string, unknown> | undefined>): PrintData =>
  payloads.reduce<Record<string, unknown>>((accumulator, item) => {
    if (!item) {
      return accumulator
    }

    return {
      ...accumulator,
      ...item,
    }
  }, {})
