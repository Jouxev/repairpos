export type TemplateType = 'THERMAL_RECEIPT' | 'A4_INVOICE' | 'A4_PROFORMA' | 'ORDER_REQUEST' | 'REPAIR_TICKET' | 'THERMAL_LABEL'

export type LabelSize = '58mm' | '80mm' | '30x50mm' | '40x60mm' | '50x80mm' | 'CUSTOM'

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

export type TemplateStatus = 'ACTIVE' | 'INACTIVE' | 'DRAFT'

export interface PrintField {
  id: string
  type: 'text' | 'image' | 'barcode' | 'qrcode' | 'table' | 'line' | 'spacer'
  label?: string
  value?: string
  style?: {
    fontSize?: number
    fontWeight?: 'normal' | 'bold'
    fontStyle?: 'normal' | 'italic'
    textAlign?: 'left' | 'center' | 'right'
    color?: string
    backgroundColor?: string
    borderWidth?: number
    borderColor?: string
    borderStyle?: 'solid' | 'dashed' | 'dotted'
    padding?: number
    margin?: number
    width?: string
    height?: string
  }
  x?: number
  y?: number
  width?: number
  height?: number
  tableConfig?: {
    headers: string[]
    rows: string[]
    columnWidths?: number[]
    showHeader?: boolean
    showBorders?: boolean
  }
  imageUrl?: string
  barcodeFormat?: 'CODE128' | 'QR' | 'EAN13' | 'EAN8' | 'UPC' | 'CODE39'
  barcodeValue?: string
  qrCodeValue?: string
}

export interface PrintTemplate {
  id: string
  name: string
  description?: string
  type: TemplateType
  status: TemplateStatus
  isDefault?: boolean
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
  createdAt?: Date
  updatedAt?: Date
  createdBy?: string
  updatedBy?: string
}

export interface PrintData {
  [key: string]: any
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
  createdAt?: Date
  updatedAt?: Date
}
