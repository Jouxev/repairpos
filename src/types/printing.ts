export type TemplateType =
  | 'THERMAL_RECEIPT'
  | 'A4_INVOICE'
  | 'A4_PROFORMA'
  | 'ORDER_REQUEST'
  | 'DELIVERY_NOTE'
  | 'PURCHASE_VOUCHER'
  | 'REPAIR_TICKET'
  | 'THERMAL_LABEL'
  | 'PAYMENT_RECEIPT'
  | 'PAYMENT_IN'
  | 'PAYMENT_OUT'
  | 'SUPPLIER_INVOICE'
  | 'CUSTOMER_RECEIPT'

export type PrintDocumentType =
  | 'POS_INVOICE'
  | 'REPAIR_TICKET'
  | 'PRODUCT_LABEL'
  | 'ORDER_REQUEST'
  | 'DELIVERY_NOTE'
  | 'PURCHASE_VOUCHER'
  | 'A4_INVOICE'
  | 'A4_PROFORMA_INVOICE'
  | 'A4_REPAIR_REQUEST'
  | 'PAYMENT_RECEIPT'
  | 'PAYMENT_IN'
  | 'PAYMENT_OUT'
  | 'SUPPLIER_INVOICE'
  | 'CUSTOMER_RECEIPT'

export type PrinterTechnology = 'THERMAL' | 'A4'
export type TemplateChannel = 'RECEIPT' | 'LABEL' | 'DOCUMENT'
export type TemplateStatus = 'ACTIVE' | 'INACTIVE' | 'DRAFT'
export type TemplateSource = 'SYSTEM' | 'USER'
export type PrinterConnectionType = 'SYSTEM' | 'USB' | 'NETWORK' | 'SERIAL' | 'BLUETOOTH'
export type PrinterCapability =
  | 'THERMAL_58'
  | 'THERMAL_80'
  | 'THERMAL_LABEL'
  | 'A4_DOCUMENT'
  | 'A4_COLOR'
  | 'A4_DUPLEX'

export type PrintHistoryStatus = 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'TEST'
export type LabelSize = '58mm' | '80mm' | '30x50mm' | '40x60mm' | '50x80mm' | 'CUSTOM'
export type PrintConditionOperator =
  | 'exists'
  | 'notExists'
  | 'equals'
  | 'notEquals'
  | 'gt'
  | 'lt'
  | 'includes'

export interface TemplateCondition {
  id: string
  field: string
  operator: PrintConditionOperator
  value?: string | number | boolean
}

export interface TemplateStyle {
  fontSize?: number
  fontWeight?: 'normal' | 'bold' | 'semibold'
  fontStyle?: 'normal' | 'italic'
  textAlign?: 'left' | 'center' | 'right'
  color?: string
  backgroundColor?: string
  borderWidth?: number
  borderColor?: string
  borderStyle?: 'solid' | 'dashed' | 'dotted'
  borderRadius?: number
  padding?: number
  margin?: number
  marginTop?: number
  marginRight?: number
  marginBottom?: number
  marginLeft?: number
  width?: string
  height?: string
  minHeight?: string
  letterSpacing?: number
  lineHeight?: number
  textTransform?: 'none' | 'uppercase' | 'lowercase'
}

export interface PrintField {
  id: string
  type: 'text' | 'image' | 'barcode' | 'qrcode' | 'table' | 'line' | 'spacer' | 'signature'
  label?: string
  value?: string
  binding?: string
  hidden?: boolean
  style?: TemplateStyle
  condition?: TemplateCondition | null
  x?: number
  y?: number
  width?: number
  height?: number
  tableConfig?: {
    headers: string[]
    rows: string[]
    bindings?: string[]
    columnWidths?: number[]
    showHeader?: boolean
    showBorders?: boolean
    compact?: boolean
  }
  imageUrl?: string
  barcodeFormat?: 'CODE128' | 'QR' | 'EAN13' | 'EAN8' | 'UPC' | 'CODE39'
  barcodeValue?: string
  qrCodeValue?: string
  placeholder?: string
}

export type TemplateBlockType =
  | 'text'
  | 'variable'
  | 'image'
  | 'barcode'
  | 'qrcode'
  | 'table'
  | 'divider'
  | 'spacer'
  | 'signature'

export interface TemplateBlock extends Omit<PrintField, 'type'> {
  type: TemplateBlockType
  content?: string
  placeholder?: string
  settings?: Record<string, string | number | boolean | string[] | undefined>
}

export interface TemplateSection {
  id: string
  name: string
  type: 'header' | 'body' | 'footer'
  order: number
  enabled: boolean
  condition?: TemplateCondition | null
  blocks: TemplateBlock[]
}

export interface TemplateDefinition {
  version: number
  page: {
    size: '58mm' | '80mm' | 'A4' | 'A5' | 'LETTER' | 'CUSTOM'
    widthMm?: number
    heightMm?: number
    orientation: 'portrait' | 'landscape'
    margin: {
      top: number
      right: number
      bottom: number
      left: number
    }
  }
  sections: TemplateSection[]
}

export interface PrintTemplate {
  id: string
  name: string
  description?: string
  type: TemplateType
  documentType?: PrintDocumentType
  printerType?: PrinterTechnology
  channel?: TemplateChannel
  status: TemplateStatus
  source?: TemplateSource
  isDefault?: boolean
  isEnabled?: boolean
  versionNumber?: number
  schemaVersion?: number
  tags?: string[]
  sampleData?: Record<string, unknown>
  definition?: TemplateDefinition
  preferredPrinterId?: string
  paperSize: '58mm' | '80mm' | 'A4' | 'A5' | 'LETTER' | 'CUSTOM'
  paperWidth?: number
  paperHeight?: number
  orientation: 'portrait' | 'landscape'
  marginTop?: number
  marginRight?: number
  marginBottom?: number
  marginLeft?: number
  headerFields: PrintField[]
  bodyFields: PrintField[]
  footerFields: PrintField[]
  css?: string
  customCss?: string
  logoUrl?: string
  companyName?: string
  companyAddress?: string
  companyPhone?: string
  companyEmail?: string
  companyWebsite?: string
  taxNumber?: string
  footerText?: string
  showLogo?: boolean
  showHeader?: boolean
  showFooter?: boolean
  showDate?: boolean
  showTime?: boolean
  showPageNumber?: boolean
  pageNumberFormat?: '1/10' | 'Page 1 of 10' | '1'
  createdAt?: Date | string
  updatedAt?: Date | string
  createdBy?: string
  updatedBy?: string
}

export interface LabelTemplate extends PrintTemplate {
  type: 'THERMAL_LABEL'
  labelSize: LabelSize
  labelWidth: number
  labelHeight: number
  showProductName: boolean
  showPrice: boolean
  showBarcode: boolean
  showStoreName: boolean
  showSku: boolean
  fontSize: 'small' | 'medium' | 'large'
  barcodeType: 'CODE128' | 'EAN13' | 'UPC'
}

export interface PrinterRecord {
  id: string
  name: string
  code: string
  technology: PrinterTechnology
  connectionType: PrinterConnectionType
  deviceName?: string
  paperSize: '58mm' | '80mm' | 'A4' | 'A5' | 'LETTER' | 'CUSTOM'
  capabilities: PrinterCapability[]
  isEnabled: boolean
  isDefault: boolean
  supportsColor?: boolean
  supportsDuplex?: boolean
  settings: Record<string, unknown>
  notes?: string
  createdAt?: Date | string
  updatedAt?: Date | string
}

export interface TemplateAssignment {
  id: string
  documentType: PrintDocumentType
  templateId: string
  printerId?: string
  channel: TemplateChannel
  isEnabled: boolean
  createdAt?: Date | string
  updatedAt?: Date | string
}

export interface TemplateVersionRecord {
  id: string
  templateId: string
  versionNumber: number
  snapshot: PrintTemplate
  notes?: string
  createdBy?: string
  createdAt?: Date | string
}

export interface PrintHistoryRecord {
  id: string
  documentType: PrintDocumentType
  templateId?: string
  printerId?: string
  status: PrintHistoryStatus
  copies: number
  payload: Record<string, unknown>
  renderedHtml?: string
  errorMessage?: string
  triggeredBy?: string
  createdAt?: Date | string
}

export interface SystemPrinterInfo {
  name: string
  displayName: string
  description?: string
  isDefault: boolean
  status?: number
  isSaved?: boolean
}

export interface PrintPreferences {
  defaultProductLabelTemplateId?: string
  defaultPosTemplateId?: string
  defaultRepairTicketTemplateId?: string
  autoPrintPos: boolean
  silentPrintPos: boolean
}

export interface PrintData {
  [key: string]: unknown
}

export interface ThermalPrinterConfig {
  name: string
  width: 58 | 80
  cutPaper: boolean
  openCashDrawer: boolean
  characterSet: 'PC437' | 'PC850' | 'PC852' | 'PC860' | 'PC863' | 'PC865' | 'PC858'
  codePage: number
  encoding: 'UTF-8' | 'ASCII' | 'ISO-8859-1'
}

export interface A4PrinterConfig {
  name: string
  paperSize: 'A4' | 'A5' | 'LETTER' | 'LEGAL'
  orientation: 'portrait' | 'landscape'
  duplex: boolean
  color: boolean
  quality: 'draft' | 'normal' | 'high'
}

export interface PrinterSettings {
  id: string
  thermalPrinter?: ThermalPrinterConfig
  a4Printer?: A4PrinterConfig
  defaultThermalTemplate?: string
  defaultA4Template?: string
  autoPrintReceipt: boolean
  showPrintPreview: boolean
  printHeader: boolean
  printFooter: boolean
  createdAt?: Date | string
  updatedAt?: Date | string
}
