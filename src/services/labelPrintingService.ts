import { defaultTemplates } from '@/modules/printing/catalog'
import { mergePrintPayload, openPrintWindow, renderTemplateHtml } from '@/modules/printing/engine'
import { printingManagementService } from '@/modules/printing/printingManagementService'
import { PrintTemplate } from '@/types/printing'
import { shopSettingsService } from './shopSettingsService'

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
  { name: '50x35mm', width: 50, height: 35, unit: 'mm' },
  { name: '30x50mm', width: 30, height: 50, unit: 'mm' },
  { name: '48x30mm', width: 48, height: 30, unit: 'mm' },
  { name: '40x60mm', width: 40, height: 60, unit: 'mm' },
  { name: '50x80mm', width: 50, height: 80, unit: 'mm' },
]

export const defaultLabelTemplates: PrintTemplate[] = [
  ...defaultTemplates.filter((template) => template.documentType === 'PRODUCT_LABEL'),
]

export function generateLabelHTML(template: PrintTemplate, data: LabelData): string {
  return renderTemplateHtml(template, {
    shop: {
      name: data.storeName || '',
      address: data.storeAddress || '',
      phone: data.storePhone || '',
      currency: data.currency || '$',
    },
    product: {
      name: data.productName,
      price: data.price.toFixed(2),
      barcode: data.barcode || '',
      sku: data.sku || '',
    },
  })
}

export function printLabel(template: PrintTemplate, data: LabelData): void {
  openPrintWindow(generateLabelHTML(template, data), template.name)
}

export function getDefaultLabelTemplate(size: string): PrintTemplate | undefined {
  return defaultLabelTemplates.find(t => t.paperSize === size)
}

// Print product label using database template
export async function printProductLabel(data: LabelData): Promise<void> {
  try {
    const shopSettings = await shopSettingsService.getSettings()
    const mergedData = {
      ...data,
      storeName: data.storeName || shopSettings.shopName,
      storeAddress: data.storeAddress || shopSettings.shopAddress,
      storePhone: data.storePhone || shopSettings.shopPhone,
      currency: data.currency || shopSettings.currencySymbol
    }

    const { template, printer } = await printingManagementService.resolveDocumentConfiguration('PRODUCT_LABEL')
    const payload = mergePrintPayload(
      template.sampleData as Record<string, unknown> | undefined,
      {
        shop: {
          name: mergedData.storeName,
          address: mergedData.storeAddress,
          phone: mergedData.storePhone,
          currency: mergedData.currency,
        },
        product: {
          name: mergedData.productName,
          price: mergedData.price.toFixed(2),
          barcode: mergedData.barcode,
          sku: mergedData.sku,
        },
      },
    )
    const html = renderTemplateHtml(template, payload)
    await printingManagementService.executePrintHtml({
      html,
      title: printer?.name || 'Product Label',
      printer,
      silent: false,
    })
    await printingManagementService.recordHistory({
      documentType: 'PRODUCT_LABEL',
      templateId: template.id,
      printerId: printer?.id,
      status: 'SUCCESS',
      copies: 1,
      payload,
      renderedHtml: html,
    })
  } catch (error) {
    console.error('Error printing label:', error)
    throw error
  }
}
