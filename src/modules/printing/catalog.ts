import {
  PrintDocumentType,
  PrintField,
  PrintTemplate,
  PrinterRecord,
  TemplateAssignment,
  TemplateBlock,
  TemplateChannel,
  TemplateSection,
  TemplateType,
} from '@/types/printing'

export interface PlaceholderGroup {
  group: string
  label: string
  variables: Array<{
    key: string
    label: string
    example: string
  }>
}

const section = (
  id: string,
  name: string,
  type: TemplateSection['type'],
  order: number,
  blocks: TemplateBlock[],
): TemplateSection => ({
  id,
  name,
  type,
  order,
  enabled: true,
  blocks,
})

const textBlock = (
  id: string,
  content: string,
  style: TemplateBlock['style'] = {},
): TemplateBlock => ({
  id,
  type: 'text',
  content,
  value: content,
  style,
})

const variableBlock = (
  id: string,
  placeholder: string,
  label: string,
  style: TemplateBlock['style'] = {},
): TemplateBlock => ({
  id,
  type: 'variable',
  label,
  placeholder,
  value: placeholder,
  binding: placeholder.replace(/[{}]/g, ''),
  style,
})

const tableBlock = (id: string, bindings: string[]): TemplateBlock => ({
  id,
  type: 'table',
  label: 'Line Items',
  style: {
    marginTop: 6,
    marginBottom: 6,
    fontSize: 11,
  },
  tableConfig: {
    headers: ['Item', 'Qty', 'Price', 'Total'],
    rows: [],
    bindings,
    showHeader: true,
    showBorders: true,
  },
})

const barcodeBlock = (id: string, value: string): TemplateBlock => ({
  id,
  type: 'barcode',
  label: 'Barcode',
  barcodeValue: value,
  style: {
    textAlign: 'center',
    marginTop: 8,
  },
})

const qrBlock = (id: string, value: string): TemplateBlock => ({
  id,
  type: 'qrcode',
  label: 'QR Code',
  qrCodeValue: value,
  style: {
    textAlign: 'center',
    marginTop: 8,
  },
})

const signatureBlock = (id: string, label: string): TemplateBlock => ({
  id,
  type: 'signature',
  label,
  content: label,
  style: {
    marginTop: 18,
    minHeight: '52px',
  },
})

const dividerBlock = (id: string): TemplateBlock => ({
  id,
  type: 'divider',
  style: {
    marginTop: 6,
    marginBottom: 6,
    borderStyle: 'dashed',
  },
})

const blockToField = (block: TemplateBlock) => ({
  ...block,
  type:
    block.type === 'divider'
      ? 'line'
      : block.type === 'variable'
        ? 'text'
        : block.type,
  value: block.value || block.content || block.placeholder,
})

const buildTemplate = ({
  id,
  name,
  description,
  type,
  documentType,
  channel,
  printerType,
  paperSize,
  orientation = 'portrait',
  sections,
  sampleData = {},
}: {
  id: string
  name: string
  description: string
  type: TemplateType
  documentType: PrintDocumentType
  channel: TemplateChannel
  printerType: 'THERMAL' | 'A4'
  paperSize: '58mm' | '80mm' | 'A4'
  orientation?: 'portrait' | 'landscape'
  sections: TemplateSection[]
  sampleData?: Record<string, unknown>
}): PrintTemplate => {
  const header = sections.find((item) => item.type === 'header')?.blocks || []
  const body = sections.find((item) => item.type === 'body')?.blocks || []
  const footer = sections.find((item) => item.type === 'footer')?.blocks || []

  return {
    id,
    name,
    description,
    type,
    documentType,
    channel,
    printerType,
    source: 'SYSTEM',
    status: 'ACTIVE',
    isEnabled: true,
    isDefault: true,
    versionNumber: 1,
    schemaVersion: 1,
    tags: [documentType.toLowerCase(), printerType.toLowerCase()],
    sampleData,
    definition: {
      version: 1,
      page: {
        size: paperSize,
        orientation,
        margin: paperSize === 'A4'
          ? { top: 12, right: 12, bottom: 12, left: 12 }
          : { top: 4, right: 4, bottom: 4, left: 4 },
      },
      sections,
    },
    paperSize,
    orientation,
    marginTop: paperSize === 'A4' ? 12 : 4,
    marginRight: paperSize === 'A4' ? 12 : 4,
    marginBottom: paperSize === 'A4' ? 12 : 4,
    marginLeft: paperSize === 'A4' ? 12 : 4,
    headerFields: header.map(blockToField) as PrintField[],
    bodyFields: body.map(blockToField) as PrintField[],
    footerFields: footer.map(blockToField) as PrintField[],
    customCss: '',
    showLogo: true,
    showHeader: true,
    showFooter: true,
    showDate: true,
    showTime: false,
    showPageNumber: paperSize === 'A4',
    pageNumberFormat: 'Page 1 of 10',
  }
}

export const placeholderCatalog: PlaceholderGroup[] = [
  {
    group: 'SYSTEM',
    label: 'System Variables',
    variables: [
      { key: '{{system.date}}', label: 'Current Date (YYYY-MM-DD)', example: '2026-05-16' },
    ],
  },
  {
    group: 'SHOP',
    label: 'Shop Variables',
    variables: [
      { key: '{{shop.name}}', label: 'Shop Name', example: 'RepairPro' },
      { key: '{{shop.address}}', label: 'Shop Address', example: '12 Main Street' },
      { key: '{{shop.phone}}', label: 'Shop Phone', example: '+213 555 000 111' },
      { key: '{{shop.email}}', label: 'Shop Email', example: 'support@repairpro.local' },
      { key: '{{shop.currency}}', label: 'Currency Symbol', example: 'DA' },
    ],
  },
  {
    group: 'CUSTOMER',
    label: 'Customer Variables',
    variables: [
      { key: '{{customer.name}}', label: 'Customer Name', example: 'John Carter' },
      { key: '{{customer.phone}}', label: 'Customer Phone', example: '+213 666 111 222' },
      { key: '{{customer.email}}', label: 'Customer Email', example: 'john@example.com' },
      { key: '{{customer.address}}', label: 'Customer Address', example: 'Oran, Algeria' },
      { key: '{{customer.balance}}', label: 'Customer Balance', example: '5500.00' },
    ],
  },
  {
    group: 'SUPPLIER',
    label: 'Supplier Variables',
    variables: [
      { key: '{{supplier.name}}', label: 'Supplier Name', example: 'Parts Global' },
      { key: '{{supplier.phone}}', label: 'Supplier Phone', example: '+213 777 333 999' },
      { key: '{{supplier.email}}', label: 'Supplier Email', example: 'sales@parts.io' },
      { key: '{{supplier.address}}', label: 'Supplier Address', example: 'Algiers Warehouse' },
    ],
  },
  {
    group: 'REPAIR',
    label: 'Repair Variables',
    variables: [
      { key: '{{repair.ticketNumber}}', label: 'Ticket Number', example: 'RPR-10024' },
      { key: '{{repair.deviceBrand}}', label: 'Device Brand', example: 'Apple' },
      { key: '{{repair.deviceModel}}', label: 'Device Model', example: 'iPhone 13' },
      { key: '{{repair.problem}}', label: 'Problem Description', example: 'Screen replacement' },
      { key: '{{repair.technician}}', label: 'Technician Name', example: 'Ahmed Technician' },
    ],
  },
  {
    group: 'ORDER',
    label: 'Order Variables',
    variables: [
      { key: '{{order.number}}', label: 'Order Number', example: 'PO-5032' },
      { key: '{{order.date}}', label: 'Order Date', example: '2026-05-23' },
      { key: '{{order.status}}', label: 'Order Status', example: 'Pending' },
      { key: '{{order.notes}}', label: 'Order Notes', example: 'Urgent supplier order' },
    ],
  },
  {
    group: 'PAYMENT',
    label: 'Payment Variables',
    variables: [
      { key: '{{payment.reference}}', label: 'Payment Reference', example: 'PAY-2201' },
      { key: '{{payment.method}}', label: 'Payment Method', example: 'Cash' },
      { key: '{{payment.amount}}', label: 'Payment Amount', example: '15000.00' },
      { key: '{{payment.direction}}', label: 'Payment Direction', example: 'IN' },
      { key: '{{payment.notes}}', label: 'Payment Notes', example: 'Advance repair payment' },
    ],
  },
  {
    group: 'PRODUCT',
    label: 'Product Variables',
    variables: [
      { key: '{{product.name}}', label: 'Product Name', example: 'Battery for iPhone 11' },
      { key: '{{product.sku}}', label: 'Product SKU', example: 'BAT-IP11' },
      { key: '{{product.barcode}}', label: 'Product Barcode', example: '123456789012' },
      { key: '{{product.price}}', label: 'Product Price', example: '4500.00' },
      { key: '{{product.quantity}}', label: 'Product Quantity', example: '2' },
    ],
  },
]

export const defaultPrinters: PrinterRecord[] = [
  {
    id: 'printer-thermal-80',
    name: 'Thermal Receipt 80mm',
    code: 'THERMAL-80',
    technology: 'THERMAL',
    connectionType: 'SYSTEM',
    deviceName: 'POS-80mm',
    paperSize: '80mm',
    capabilities: ['THERMAL_80'],
    isEnabled: true,
    isDefault: true,
    settings: {
      autoCut: true,
      density: 'medium',
      copies: 1,
    },
  },
  {
    id: 'printer-thermal-58',
    name: 'Thermal Receipt 58mm',
    code: 'THERMAL-58',
    technology: 'THERMAL',
    connectionType: 'SYSTEM',
    deviceName: 'POS-58mm',
    paperSize: '58mm',
    capabilities: ['THERMAL_58'],
    isEnabled: true,
    isDefault: false,
    settings: {
      autoCut: false,
      density: 'medium',
      copies: 1,
    },
  },
  {
    id: 'printer-label',
    name: 'Thermal Label Printer',
    code: 'THERMAL-LABEL',
    technology: 'THERMAL',
    connectionType: 'SYSTEM',
    deviceName: 'LABEL-PRINTER',
    paperSize: '58mm',
    capabilities: ['THERMAL_LABEL'],
    isEnabled: true,
    isDefault: false,
    settings: {
      gap: 2,
      density: 'high',
      copies: 1,
    },
  },
  {
    id: 'printer-a4',
    name: 'Office A4 Printer',
    code: 'A4-OFFICE',
    technology: 'A4',
    connectionType: 'SYSTEM',
    deviceName: 'LASER-A4',
    paperSize: 'A4',
    capabilities: ['A4_DOCUMENT', 'A4_DUPLEX'],
    isEnabled: true,
    isDefault: true,
    supportsColor: false,
    supportsDuplex: true,
    settings: {
      duplex: true,
      quality: 'normal',
      copies: 1,
    },
  },
]

export const defaultTemplates: PrintTemplate[] = [
  buildTemplate({
    id: 'tpl-pos-thermal-80',
    name: 'POS Receipt 80mm',
    description: 'Default 80mm thermal template for POS receipts.',
    type: 'THERMAL_RECEIPT',
    documentType: 'POS_INVOICE',
    channel: 'RECEIPT',
    printerType: 'THERMAL',
    paperSize: '80mm',
    sections: [
      section('header', 'Header', 'header', 1, [
        variableBlock('shop-name', '{{shop.name}}', 'Shop Name', { fontSize: 16, fontWeight: 'bold', textAlign: 'center' }),
        variableBlock('shop-address', '{{shop.address}}', 'Shop Address', { fontSize: 10, textAlign: 'center' }),
        variableBlock('shop-phone', '{{shop.phone}}', 'Shop Phone', { fontSize: 10, textAlign: 'center' }),
        dividerBlock('header-divider'),
      ]),
      section('body', 'Body', 'body', 2, [
        textBlock('invoice', 'Invoice: {{sale.invoiceNumber}}', { fontSize: 11 }),
        textBlock('date', 'Date: {{sale.date}}', { fontSize: 11 }),
        textBlock('customer', 'Customer: {{customer.name}}', { fontSize: 11 }),
        tableBlock('items', ['name', 'quantity', 'price', 'total']),
      ]),
      section('footer', 'Footer', 'footer', 3, [
        textBlock('subtotal', 'Subtotal: {{sale.subtotal}}', { textAlign: 'right', fontSize: 11 }),
        textBlock('tax', 'Tax: {{sale.tax}}', { textAlign: 'right', fontSize: 11 }),
        textBlock('total', 'TOTAL: {{sale.total}}', { textAlign: 'right', fontSize: 15, fontWeight: 'bold' }),
        qrBlock('qr', '{{sale.invoiceNumber}}'),
        textBlock('thanks', 'Thank you for your business', { textAlign: 'center', fontSize: 10 }),
      ]),
    ],
    sampleData: {
      sale: { invoiceNumber: 'INV-1001', date: '2026-05-23', subtotal: '1500.00', tax: '0.00', total: '1500.00' },
      customer: { name: 'Walk-in Customer' },
      items: [{ name: 'Screen Protector', quantity: 1, price: '1500.00', total: '1500.00' }],
    },
  }),
  buildTemplate({
    id: 'tpl-pos-thermal-58',
    name: 'POS Receipt 58mm',
    description: 'Compact 58mm thermal template for smaller counters.',
    type: 'THERMAL_RECEIPT',
    documentType: 'CUSTOMER_RECEIPT',
    channel: 'RECEIPT',
    printerType: 'THERMAL',
    paperSize: '58mm',
    sections: [
      section('header', 'Header', 'header', 1, [
        variableBlock('shop-name', '{{shop.name}}', 'Shop Name', { fontSize: 14, fontWeight: 'bold', textAlign: 'center' }),
        dividerBlock('divider'),
      ]),
      section('body', 'Body', 'body', 2, [
        textBlock('invoice', 'Receipt #: {{sale.invoiceNumber}}', { fontSize: 10 }),
        textBlock('date', 'Date: {{sale.date}}', { fontSize: 10 }),
        tableBlock('items', ['name', 'quantity', 'price', 'total']),
      ]),
      section('footer', 'Footer', 'footer', 3, [
        textBlock('total', 'TOTAL: {{sale.total}}', { textAlign: 'right', fontSize: 14, fontWeight: 'bold' }),
        textBlock('method', 'Payment: {{payment.method}}', { fontSize: 10 }),
      ]),
    ],
  }),
  buildTemplate({
    id: 'tpl-product-label',
    name: 'Product Label',
    description: 'Thermal label for products with price and barcode.',
    type: 'THERMAL_LABEL',
    documentType: 'PRODUCT_LABEL',
    channel: 'LABEL',
    printerType: 'THERMAL',
    paperSize: '58mm',
    sections: [
      section('body', 'Body', 'body', 1, [
        variableBlock('product-name', '{{product.name}}', 'Product Name', { fontSize: 12, fontWeight: 'bold', textAlign: 'center' }),
        textBlock('sku', 'SKU: {{product.sku}}', { textAlign: 'center', fontSize: 10 }),
        textBlock('price', '{{shop.currency}}{{product.price}}', { textAlign: 'center', fontSize: 18, fontWeight: 'bold' }),
        barcodeBlock('barcode', '{{product.barcode}}'),
      ]),
    ],
  }),
  buildTemplate({
    id: 'tpl-a4-invoice',
    name: 'A4 Invoice',
    description: 'Full A4 invoice for customer billing.',
    type: 'A4_INVOICE',
    documentType: 'A4_INVOICE',
    channel: 'DOCUMENT',
    printerType: 'A4',
    paperSize: 'A4',
    sections: [
      section('header', 'Header', 'header', 1, [
        variableBlock('shop-name', '{{shop.name}}', 'Shop Name', { fontSize: 24, fontWeight: 'bold' }),
        variableBlock('shop-address', '{{shop.address}}', 'Shop Address', { fontSize: 11 }),
        textBlock('meta', 'Invoice #: {{sale.invoiceNumber}} | Date: {{sale.date}}', { fontSize: 11, marginTop: 8 }),
      ]),
      section('body', 'Body', 'body', 2, [
        textBlock('bill-to', 'Bill To: {{customer.name}}', { fontSize: 12, fontWeight: 'bold', marginTop: 12 }),
        tableBlock('items', ['name', 'quantity', 'price', 'total']),
      ]),
      section('footer', 'Footer', 'footer', 3, [
        textBlock('subtotal', 'Subtotal: {{sale.subtotal}}', { textAlign: 'right' }),
        textBlock('tax', 'Tax: {{sale.tax}}', { textAlign: 'right' }),
        textBlock('total', 'Grand Total: {{sale.total}}', { textAlign: 'right', fontSize: 16, fontWeight: 'bold' }),
        signatureBlock('customer-signature', 'Customer Signature'),
      ]),
    ],
  }),
  buildTemplate({
    id: 'tpl-a4-proforma',
    name: 'A4 Proforma Invoice',
    description: 'Proforma quotation-style invoice template.',
    type: 'A4_PROFORMA',
    documentType: 'A4_PROFORMA_INVOICE',
    channel: 'DOCUMENT',
    printerType: 'A4',
    paperSize: 'A4',
    sections: [
      section('header', 'Header', 'header', 1, [
        variableBlock('shop-name', '{{shop.name}}', 'Shop Name', { fontSize: 24, fontWeight: 'bold' }),
        textBlock('title', 'PROFORMA INVOICE', { fontSize: 18, fontWeight: 'bold', textAlign: 'right' }),
      ]),
      section('body', 'Body', 'body', 2, [
        textBlock('order', 'Ref: {{order.number}} | Date: {{order.date}}', { fontSize: 11 }),
        textBlock('customer', 'Customer: {{customer.name}}', { fontSize: 11 }),
        tableBlock('items', ['name', 'quantity', 'price', 'total']),
      ]),
      section('footer', 'Footer', 'footer', 3, [
        textBlock('note', 'Prices subject to stock availability.', { fontSize: 11 }),
        textBlock('total', 'Estimated Total: {{sale.total}}', { textAlign: 'right', fontWeight: 'bold' }),
      ]),
    ],
  }),
  buildTemplate({
    id: 'tpl-order-request',
    name: 'Purchase Order Request',
    description: 'A4 purchase order request for supplier ordering.',
    type: 'ORDER_REQUEST',
    documentType: 'ORDER_REQUEST',
    channel: 'DOCUMENT',
    printerType: 'A4',
    paperSize: 'A4',
    sections: [
      section('header', 'Header', 'header', 1, [
        variableBlock('shop-name', '{{shop.name}}', 'Shop Name', { fontSize: 24, fontWeight: 'bold' }),
        textBlock('title', 'PURCHASE ORDER REQUEST', { fontSize: 18, fontWeight: 'bold', textAlign: 'right' }),
        textBlock('meta', 'Order #: {{order.number}} | Date: {{order.date}}', { fontSize: 11, marginTop: 8 }),
      ]),
      section('body', 'Body', 'body', 2, [
        textBlock('supplier', 'Supplier: {{supplier.name}}', { fontSize: 12, fontWeight: 'bold', marginTop: 12 }),
        textBlock('supplier-phone', 'Phone: {{supplier.phone}}', { fontSize: 11 }),
        textBlock('supplier-email', 'Email: {{supplier.email}}', { fontSize: 11 }),
        textBlock('expected', 'Expected Delivery: {{order.expectedDeliveryDate}}', { fontSize: 11 }),
        tableBlock('items', ['name', 'quantity', 'price', 'total']),
      ]),
      section('footer', 'Footer', 'footer', 3, [
        textBlock('subtotal', 'Subtotal: {{order.subtotal}}', { textAlign: 'right' }),
        textBlock('tax', 'Tax: {{order.tax}}', { textAlign: 'right' }),
        textBlock('total', 'Total: {{order.total}}', { textAlign: 'right', fontSize: 16, fontWeight: 'bold' }),
        textBlock('notes', 'Notes: {{order.notes}}', { fontSize: 11, marginTop: 8 }),
        signatureBlock('buyer-signature', 'Authorized Signature'),
      ]),
    ],
    sampleData: {
      supplier: {
        name: 'Parts Global',
        phone: '+213 777 333 999',
        email: 'sales@parts.io',
      },
      order: {
        number: 'PO-5032',
        date: '2026-05-23',
        expectedDeliveryDate: '2026-05-30',
        notes: 'Urgent supplier order',
        subtotal: '12000.00',
        tax: '0.00',
        total: '12000.00',
      },
      items: [
        { name: 'Charging Port', quantity: 5, price: '1200.00', total: '6000.00' },
        { name: 'Battery Connector', quantity: 10, price: '600.00', total: '6000.00' },
      ],
    },
  }),
  buildTemplate({
    id: 'tpl-delivery-note',
    name: 'Bon de Route',
    description: 'A4 delivery and dispatch note.',
    type: 'DELIVERY_NOTE',
    documentType: 'DELIVERY_NOTE',
    channel: 'DOCUMENT',
    printerType: 'A4',
    paperSize: 'A4',
    sections: [
      section('header', 'Header', 'header', 1, [
        variableBlock('shop-name', '{{shop.name}}', 'Shop Name', { fontSize: 24, fontWeight: 'bold' }),
        textBlock('title', 'BON DE ROUTE', { fontSize: 18, fontWeight: 'bold', textAlign: 'right' }),
        textBlock('meta', 'Reference: {{document.number}} | Date: {{document.date}}', { fontSize: 11, marginTop: 8 }),
      ]),
      section('body', 'Body', 'body', 2, [
        textBlock('party', '{{party.label}}: {{party.name}}', { fontSize: 12, fontWeight: 'bold', marginTop: 12 }),
        textBlock('contact', 'Contact: {{party.phone}} | {{party.email}}', { fontSize: 11 }),
        tableBlock('items', ['name', 'quantity', 'price', 'total']),
        barcodeBlock('barcode', '{{document.number}}'),
      ]),
      section('footer', 'Footer', 'footer', 3, [
        textBlock('notes', 'Notes: {{document.notes}}', { fontSize: 11 }),
        signatureBlock('dispatch-signature', 'Dispatch Signature'),
      ]),
    ],
    sampleData: {
      document: { number: 'BR-1005', date: '2026-05-28', notes: 'Handle with care' },
      party: { label: 'Customer', name: 'Ahmed Salah', phone: '+213 555 123 456', email: 'ahmed@mail.com' },
      items: [
        { name: 'Laptop Screen', quantity: 1, price: '18000.00', total: '18000.00' },
      ],
    },
  }),
  buildTemplate({
    id: 'tpl-purchase-voucher',
    name: "Bon d'Achat",
    description: 'A4 purchase voucher / commercial slip.',
    type: 'PURCHASE_VOUCHER',
    documentType: 'PURCHASE_VOUCHER',
    channel: 'DOCUMENT',
    printerType: 'A4',
    paperSize: 'A4',
    sections: [
      section('header', 'Header', 'header', 1, [
        variableBlock('shop-name', '{{shop.name}}', 'Shop Name', { fontSize: 24, fontWeight: 'bold' }),
        textBlock('title', "BON D'ACHAT", { fontSize: 18, fontWeight: 'bold', textAlign: 'right' }),
        textBlock('meta', 'Reference: {{document.number}} | Date: {{document.date}}', { fontSize: 11, marginTop: 8 }),
      ]),
      section('body', 'Body', 'body', 2, [
        textBlock('party', '{{party.label}}: {{party.name}}', { fontSize: 12, fontWeight: 'bold', marginTop: 12 }),
        textBlock('address', 'Address: {{party.address}}', { fontSize: 11 }),
        tableBlock('items', ['name', 'quantity', 'price', 'total']),
        qrBlock('voucher-qr', '{{document.number}}'),
      ]),
      section('footer', 'Footer', 'footer', 3, [
        textBlock('subtotal', 'Subtotal: {{totals.subtotal}}', { textAlign: 'right' }),
        textBlock('tax', 'Tax: {{totals.tax}}', { textAlign: 'right' }),
        textBlock('discount', 'Discount: {{totals.discount}}', { textAlign: 'right' }),
        textBlock('total', 'Total: {{totals.total}}', { textAlign: 'right', fontSize: 16, fontWeight: 'bold' }),
        signatureBlock('approval-signature', 'Approved By'),
      ]),
    ],
    sampleData: {
      document: { number: 'BA-2044', date: '2026-05-28' },
      party: { label: 'Supplier', name: 'Tech Parts Distribution', address: 'Algiers' },
      totals: { subtotal: '18000.00', tax: '0.00', discount: '0.00', total: '18000.00' },
      items: [
        { name: 'Power IC', quantity: 4, price: '4500.00', total: '18000.00' },
      ],
    },
  }),
  buildTemplate({
    id: 'tpl-a4-repair-request',
    name: 'A4 Repair Request',
    description: 'Detailed repair intake and customer approval form.',
    type: 'ORDER_REQUEST',
    documentType: 'A4_REPAIR_REQUEST',
    channel: 'DOCUMENT',
    printerType: 'A4',
    paperSize: 'A4',
    sections: [
      section('header', 'Header', 'header', 1, [
        variableBlock('shop-name', '{{shop.name}}', 'Shop Name', { fontSize: 22, fontWeight: 'bold' }),
        textBlock('title', 'Repair / Order Request', { fontSize: 18, fontWeight: 'bold' }),
      ]),
      section('body', 'Body', 'body', 2, [
        textBlock('ticket', 'Ticket #: {{repair.ticketNumber}}', { fontSize: 12 }),
        textBlock('customer', 'Customer: {{customer.name}} | {{customer.phone}}', { fontSize: 12 }),
        textBlock('device', 'Device: {{repair.deviceBrand}} {{repair.deviceModel}}', { fontSize: 12 }),
        textBlock('problem', 'Problem: {{repair.problem}}', { fontSize: 12 }),
        signatureBlock('approval', 'Customer Approval'),
      ]),
      section('footer', 'Footer', 'footer', 3, [
        textBlock('terms', 'By signing, the customer approves diagnostics and repair workflow.', { fontSize: 11 }),
      ]),
    ],
  }),
  buildTemplate({
    id: 'tpl-payment-receipt',
    name: 'Payment Receipt',
    description: 'Universal payment receipt for IN/OUT movements.',
    type: 'PAYMENT_RECEIPT',
    documentType: 'PAYMENT_RECEIPT',
    channel: 'DOCUMENT',
    printerType: 'A4',
    paperSize: 'A4',
    sections: [
      section('header', 'Header', 'header', 1, [
        variableBlock('shop-name', '{{shop.name}}', 'Shop Name', { fontSize: 22, fontWeight: 'bold' }),
        textBlock('title', 'Payment Receipt', { fontSize: 18, fontWeight: 'bold' }),
      ]),
      section('body', 'Body', 'body', 2, [
        textBlock('reference', 'Reference: {{payment.reference}}', { fontSize: 12 }),
        textBlock('method', 'Method: {{payment.method}}', { fontSize: 12 }),
        textBlock('amount', 'Amount: {{shop.currency}}{{payment.amount}}', { fontSize: 16, fontWeight: 'bold' }),
        qrBlock('payment-qr', '{{payment.reference}}'),
      ]),
      section('footer', 'Footer', 'footer', 3, [
        signatureBlock('cashier-signature', 'Cashier Signature'),
      ]),
    ],
  }),
  buildTemplate({
    id: 'tpl-payment-in',
    name: 'Payment IN Voucher',
    description: 'Incoming payment voucher for customer collections.',
    type: 'PAYMENT_IN',
    documentType: 'PAYMENT_IN',
    channel: 'DOCUMENT',
    printerType: 'A4',
    paperSize: 'A4',
    sections: [
      section('body', 'Body', 'body', 1, [
        textBlock('title', 'Payment IN', { fontSize: 20, fontWeight: 'bold' }),
        textBlock('details', 'Received from {{customer.name}} the amount of {{shop.currency}}{{payment.amount}}', { fontSize: 12 }),
        textBlock('notes', 'Notes: {{payment.notes}}', { fontSize: 12 }),
      ]),
    ],
  }),
  buildTemplate({
    id: 'tpl-payment-out',
    name: 'Payment OUT Voucher',
    description: 'Outgoing payment voucher for suppliers or expenses.',
    type: 'PAYMENT_OUT',
    documentType: 'PAYMENT_OUT',
    channel: 'DOCUMENT',
    printerType: 'A4',
    paperSize: 'A4',
    sections: [
      section('body', 'Body', 'body', 1, [
        textBlock('title', 'Payment OUT', { fontSize: 20, fontWeight: 'bold' }),
        textBlock('details', 'Paid to {{supplier.name}} the amount of {{shop.currency}}{{payment.amount}}', { fontSize: 12 }),
        textBlock('notes', 'Reason: {{payment.notes}}', { fontSize: 12 }),
      ]),
    ],
  }),
]

export const defaultAssignments: TemplateAssignment[] = [
  {
    id: 'assignment-pos',
    documentType: 'POS_INVOICE',
    templateId: 'tpl-pos-thermal-80',
    printerId: 'printer-thermal-80',
    channel: 'RECEIPT',
    isEnabled: true,
  },
  {
    id: 'assignment-customer-receipt',
    documentType: 'CUSTOMER_RECEIPT',
    templateId: 'tpl-pos-thermal-58',
    printerId: 'printer-thermal-58',
    channel: 'RECEIPT',
    isEnabled: true,
  },
  {
    id: 'assignment-label',
    documentType: 'PRODUCT_LABEL',
    templateId: 'tpl-product-label',
    printerId: 'printer-label',
    channel: 'LABEL',
    isEnabled: true,
  },
  {
    id: 'assignment-a4-invoice',
    documentType: 'A4_INVOICE',
    templateId: 'tpl-a4-invoice',
    printerId: 'printer-a4',
    channel: 'DOCUMENT',
    isEnabled: true,
  },
  {
    id: 'assignment-proforma',
    documentType: 'A4_PROFORMA_INVOICE',
    templateId: 'tpl-a4-proforma',
    printerId: 'printer-a4',
    channel: 'DOCUMENT',
    isEnabled: true,
  },
  {
    id: 'assignment-order-request',
    documentType: 'ORDER_REQUEST',
    templateId: 'tpl-order-request',
    printerId: 'printer-a4',
    channel: 'DOCUMENT',
    isEnabled: true,
  },
  {
    id: 'assignment-delivery-note',
    documentType: 'DELIVERY_NOTE',
    templateId: 'tpl-delivery-note',
    printerId: 'printer-a4',
    channel: 'DOCUMENT',
    isEnabled: true,
  },
  {
    id: 'assignment-purchase-voucher',
    documentType: 'PURCHASE_VOUCHER',
    templateId: 'tpl-purchase-voucher',
    printerId: 'printer-a4',
    channel: 'DOCUMENT',
    isEnabled: true,
  },
  {
    id: 'assignment-repair',
    documentType: 'A4_REPAIR_REQUEST',
    templateId: 'tpl-a4-repair-request',
    printerId: 'printer-a4',
    channel: 'DOCUMENT',
    isEnabled: true,
  },
  {
    id: 'assignment-payment',
    documentType: 'PAYMENT_RECEIPT',
    templateId: 'tpl-payment-receipt',
    printerId: 'printer-a4',
    channel: 'DOCUMENT',
    isEnabled: true,
  },
  {
    id: 'assignment-payment-in',
    documentType: 'PAYMENT_IN',
    templateId: 'tpl-payment-in',
    printerId: 'printer-a4',
    channel: 'DOCUMENT',
    isEnabled: true,
  },
  {
    id: 'assignment-payment-out',
    documentType: 'PAYMENT_OUT',
    templateId: 'tpl-payment-out',
    printerId: 'printer-a4',
    channel: 'DOCUMENT',
    isEnabled: true,
  },
]
