import { shopSettingsService } from './shopSettingsService'
import { mergePrintPayload, openPrintWindow, renderTemplateHtml } from '@/modules/printing/engine'
import { printingManagementService } from '@/modules/printing/printingManagementService'
import { PrintDocumentType, PrinterRecord } from '@/types/printing'

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

export interface PurchaseOrderData {
  orderNumber: string
  date: string
  expectedDeliveryDate?: string
  supplierName?: string
  supplierPhone?: string
  supplierEmail?: string
  supplierAddress?: string
  items: Array<{
    name: string
    quantity: number
    unitCost: number
    total?: number
  }>
  subtotal: number
  tax: number
  total: number
  notes?: string
  status?: string
}

export interface CommercialDocumentData {
  number: string
  date: string
  partyName?: string
  partyPhone?: string
  partyEmail?: string
  partyAddress?: string
  partyLabel?: string
  items: Array<{
    name: string
    quantity: number
    unitPrice: number
    total?: number
  }>
  subtotal: number
  tax: number
  discount?: number
  total: number
  notes?: string
  status?: string
}

export interface PaymentVoucherData {
  reference: string
  date: string
  amount: number
  method: string
  notes?: string
  direction: 'IN' | 'OUT'
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  supplierName?: string
  supplierPhone?: string
  supplierEmail?: string
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

export interface PreparedPrintDocument {
  html: string
  title: string
  printer?: PrinterRecord
  silent?: boolean
  documentType: PrintDocumentType
  templateId?: string
  payload: Record<string, unknown>
}

export function printHTML(html: string, title: string = 'Print'): void {
  openPrintWindow(html, title)
}

export async function executePreparedPrintDocument(document: PreparedPrintDocument): Promise<void> {
  await printingManagementService.executePrintHtml({
    html: document.html,
    title: document.title,
    printer: document.printer,
    silent: document.silent,
  })
  await printingManagementService.recordHistory({
    documentType: document.documentType,
    templateId: document.templateId,
    printerId: document.printer?.id,
    status: 'SUCCESS',
    copies: 1,
    payload: document.payload,
    renderedHtml: document.html,
  })
}

export async function buildReceiptDocument(
  data: ReceiptData,
  documentType: 'POS_INVOICE' | 'A4_INVOICE' | 'A4_PROFORMA_INVOICE' = 'POS_INVOICE',
): Promise<PreparedPrintDocument> {
  const shopSettings = await shopSettingsService.getSettings()
  const { template, printer } = await printingManagementService.resolveDocumentConfiguration(documentType)
  const preferences = await printingManagementService.getPreferences()
  const payload = mergePrintPayload(template.sampleData as Record<string, unknown> | undefined, {
    shop: {
      name: data.shopName || shopSettings.shopName,
      address: data.shopAddress || shopSettings.shopAddress,
      phone: data.shopPhone || shopSettings.shopPhone,
      email: data.shopEmail || shopSettings.shopEmail,
      currency: shopSettings.currencySymbol,
    },
    sale: {
      invoiceNumber: data.receiptNumber,
      date: data.date,
      subtotal: data.subtotal.toFixed(2),
      discount: (data.discount || 0).toFixed(2),
      tax: data.tax.toFixed(2),
      total: data.total.toFixed(2),
    },
    order: {
      number: data.receiptNumber,
      date: data.date,
    },
    payment: {
      method: data.paymentMethod,
    },
    customer: {
      name: data.customerName,
      address: data.customerAddress,
      phone: data.customerPhone,
      email: data.customerEmail,
    },
    items: data.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price.toFixed(2),
      total: ((item.total || item.price * item.quantity)).toFixed(2),
    })),
  })

  return {
    html: renderTemplateHtml(template, payload),
    title:
      documentType === 'A4_INVOICE'
        ? 'Invoice Preview'
        : documentType === 'A4_PROFORMA_INVOICE'
          ? 'Proforma Invoice Preview'
          : 'Receipt Preview',
    printer,
    silent: documentType === 'POS_INVOICE' ? preferences.silentPrintPos : false,
    documentType,
    templateId: template.id,
    payload,
  }
}

export async function buildCommercialDocument(
  data: CommercialDocumentData,
  documentType: 'DELIVERY_NOTE' | 'PURCHASE_VOUCHER',
): Promise<PreparedPrintDocument> {
  const shopSettings = await shopSettingsService.getSettings()
  const { template, printer } = await printingManagementService.resolveDocumentConfiguration(documentType)
  const payload = mergePrintPayload(template.sampleData as Record<string, unknown> | undefined, {
    shop: {
      name: shopSettings.shopName,
      address: shopSettings.shopAddress,
      phone: shopSettings.shopPhone,
      email: shopSettings.shopEmail,
      currency: shopSettings.currencySymbol,
    },
    document: {
      number: data.number,
      date: data.date,
      status: data.status,
      notes: data.notes,
      partyLabel: data.partyLabel,
      subtotal: data.subtotal.toFixed(2),
      tax: data.tax.toFixed(2),
      discount: (data.discount || 0).toFixed(2),
      total: data.total.toFixed(2),
    },
    party: {
      name: data.partyName,
      phone: data.partyPhone,
      email: data.partyEmail,
      address: data.partyAddress,
      label: data.partyLabel,
    },
    items: data.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      price: item.unitPrice.toFixed(2),
      total: ((item.total || item.unitPrice * item.quantity)).toFixed(2),
    })),
    totals: {
      subtotal: data.subtotal.toFixed(2),
      tax: data.tax.toFixed(2),
      discount: (data.discount || 0).toFixed(2),
      total: data.total.toFixed(2),
    },
  })

  return {
    html: renderTemplateHtml(template, payload),
    title: documentType === 'DELIVERY_NOTE' ? 'Bon de Route Preview' : "Bon d'Achat Preview",
    printer,
    silent: false,
    documentType,
    templateId: template.id,
    payload,
  }
}

export async function buildPaymentVoucherDocument(
  data: PaymentVoucherData,
  documentType: 'PAYMENT_IN' | 'PAYMENT_OUT',
): Promise<PreparedPrintDocument> {
  const shopSettings = await shopSettingsService.getSettings()
  const { template, printer } = await printingManagementService.resolveDocumentConfiguration(documentType)
  const payload = mergePrintPayload(template.sampleData as Record<string, unknown> | undefined, {
    shop: {
      name: shopSettings.shopName,
      address: shopSettings.shopAddress,
      phone: shopSettings.shopPhone,
      email: shopSettings.shopEmail,
      currency: shopSettings.currencySymbol,
    },
    payment: {
      reference: data.reference,
      date: data.date,
      amount: data.amount.toFixed(2),
      method: data.method,
      direction: data.direction,
      notes: data.notes,
    },
    customer: {
      name: data.customerName,
      phone: data.customerPhone,
      email: data.customerEmail,
    },
    supplier: {
      name: data.supplierName,
      phone: data.supplierPhone,
      email: data.supplierEmail,
    },
  })

  return {
    html: renderTemplateHtml(template, payload),
    title: documentType === 'PAYMENT_IN' ? 'Client Versement Preview' : 'Supplier Versement Preview',
    printer,
    silent: false,
    documentType,
    templateId: template.id,
    payload,
  }
}

export async function buildPurchaseOrderDocument(
  data: PurchaseOrderData,
  documentType: 'ORDER_REQUEST' = 'ORDER_REQUEST',
): Promise<PreparedPrintDocument> {
  const shopSettings = await shopSettingsService.getSettings()
  const { template, printer } = await printingManagementService.resolveDocumentConfiguration(documentType)
  const payload = mergePrintPayload(template.sampleData as Record<string, unknown> | undefined, {
    shop: {
      name: shopSettings.shopName,
      address: shopSettings.shopAddress,
      phone: shopSettings.shopPhone,
      email: shopSettings.shopEmail,
      currency: shopSettings.currencySymbol,
    },
    supplier: {
      name: data.supplierName,
      phone: data.supplierPhone,
      email: data.supplierEmail,
      address: data.supplierAddress,
    },
    order: {
      number: data.orderNumber,
      date: data.date,
      expectedDeliveryDate: data.expectedDeliveryDate,
      status: data.status || 'Open',
      notes: data.notes,
      subtotal: data.subtotal.toFixed(2),
      tax: data.tax.toFixed(2),
      total: data.total.toFixed(2),
    },
    sale: {
      subtotal: data.subtotal.toFixed(2),
      tax: data.tax.toFixed(2),
      total: data.total.toFixed(2),
    },
    items: data.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      price: item.unitCost.toFixed(2),
      total: ((item.total || item.unitCost * item.quantity)).toFixed(2),
    })),
  })

  return {
    html: renderTemplateHtml(template, payload),
    title: 'Order Request Preview',
    printer,
    silent: false,
    documentType,
    templateId: template.id,
    payload,
  }
}

export async function buildRepairTicketDocument(data: RepairTicketData): Promise<PreparedPrintDocument> {
  const shopSettings = await shopSettingsService.getSettings()
  const { template, printer } = await printingManagementService.resolveDocumentConfiguration('A4_REPAIR_REQUEST')
  const payload = mergePrintPayload(template.sampleData as Record<string, unknown> | undefined, {
    shop: {
      name: data.shopName || shopSettings.shopName,
      address: data.shopAddress || shopSettings.shopAddress,
      phone: data.shopPhone || shopSettings.shopPhone,
      email: data.shopEmail || shopSettings.shopEmail,
    },
    customer: {
      name: data.customerName,
      phone: data.customerPhone,
      email: data.customerEmail,
      address: data.customerAddress,
    },
    repair: {
      ticketNumber: data.ticketNumber,
      deviceBrand: data.deviceBrand,
      deviceModel: data.deviceModel,
      problem: data.problemDescription,
      technician: data.technicianName,
    },
  })

  return {
    html: renderTemplateHtml(template, payload),
    title: 'Repair Ticket Preview',
    printer,
    silent: false,
    documentType: 'A4_REPAIR_REQUEST',
    templateId: template.id,
    payload,
  }
}

export async function printReceipt(data: ReceiptData): Promise<void> {
  try {
    await executePreparedPrintDocument(await buildReceiptDocument(data, 'POS_INVOICE'))
  } catch (error) {
    console.error('Error printing receipt:', error)
    throw error
  }
}

export async function printRepairTicket(data: RepairTicketData): Promise<void> {
  try {
    await executePreparedPrintDocument(await buildRepairTicketDocument(data))
  } catch (error) {
    console.error('Error printing repair ticket:', error)
    throw error
  }
}

export async function printInvoice(data: ReceiptData): Promise<void> {
  try {
    await executePreparedPrintDocument(await buildReceiptDocument(data, 'A4_INVOICE'))
  } catch (error) {
    console.error('Error printing invoice:', error)
    throw error
  }
}

export async function printProformaInvoice(data: ReceiptData): Promise<void> {
  try {
    await executePreparedPrintDocument(await buildReceiptDocument(data, 'A4_PROFORMA_INVOICE'))
  } catch (error) {
    console.error('Error printing proforma invoice:', error)
    throw error
  }
}

export async function printPurchaseOrder(data: PurchaseOrderData): Promise<void> {
  try {
    await executePreparedPrintDocument(await buildPurchaseOrderDocument(data))
  } catch (error) {
    console.error('Error printing purchase order:', error)
    throw error
  }
}

export async function printCommercialDocument(
  data: CommercialDocumentData,
  documentType: 'DELIVERY_NOTE' | 'PURCHASE_VOUCHER',
): Promise<void> {
  try {
    await executePreparedPrintDocument(await buildCommercialDocument(data, documentType))
  } catch (error) {
    console.error('Error printing commercial document:', error)
    throw error
  }
}

export async function printPaymentVoucher(
  data: PaymentVoucherData,
  documentType: 'PAYMENT_IN' | 'PAYMENT_OUT',
): Promise<void> {
  try {
    await executePreparedPrintDocument(await buildPaymentVoucherDocument(data, documentType))
  } catch (error) {
    console.error('Error printing payment voucher:', error)
    throw error
  }
}
