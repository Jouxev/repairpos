import JsBarcode from 'jsbarcode'

export interface BarcodeOptions {
  format?: string
  width?: number
  height?: number
  displayValue?: boolean
  fontOptions?: string
  font?: string
  textAlign?: string
  textPosition?: string
  textMargin?: number
  fontSize?: number
  background?: string
  lineColor?: string
  margin?: number
  marginTop?: number
  marginBottom?: number
  marginLeft?: number
  marginRight?: number
}

export type BarcodeFormat =
  | 'CODE128'
  | 'EAN13'
  | 'EAN8'
  | 'UPC'
  | 'CODE39'
  | 'ITF14'
  | 'MSI'
  | 'Pharmacode'

class BarcodeService {
  private static instance: BarcodeService

  private constructor() {}

  static getInstance(): BarcodeService {
    if (!BarcodeService.instance) {
      BarcodeService.instance = new BarcodeService()
    }
    return BarcodeService.instance
  }

  generateBarcode(
    value: string,
    canvasId: string,
    options: BarcodeOptions = {}
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.getElementById(canvasId) as HTMLCanvasElement
        if (!canvas) {
          reject(new Error(`Canvas with id ${canvasId} not found`))
          return
        }

        const defaultOptions: BarcodeOptions = {
          format: 'CODE128',
          width: 2,
          height: 100,
          displayValue: true,
          font: 'monospace',
          fontSize: 14,
          textAlign: 'center',
          textPosition: 'bottom',
          textMargin: 2,
          background: '#ffffff',
          lineColor: '#000000',
          margin: 10,
        }

        JsBarcode(canvas, value, { ...defaultOptions, ...options })
        resolve()
      } catch (error) {
        reject(error)
      }
    })
  }

  generateBarcodeDataURL(
    value: string,
    options: BarcodeOptions = {}
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas')

        const defaultOptions: BarcodeOptions = {
          format: 'CODE128',
          width: 2,
          height: 100,
          displayValue: true,
          font: 'monospace',
          fontSize: 14,
          textAlign: 'center',
          textPosition: 'bottom',
          textMargin: 2,
          background: '#ffffff',
          lineColor: '#000000',
          margin: 10,
        }

        JsBarcode(canvas, value, { ...defaultOptions, ...options })
        resolve(canvas.toDataURL('image/png'))
      } catch (error) {
        reject(error)
      }
    })
  }

  generateProductBarcode(
    productId: string,
    prefix: string = 'PROD'
  ): string {
    // Generate EAN-13 compatible barcode
    const timestamp = Date.now().toString().slice(-6)
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    const barcode = `${prefix}${productId.slice(-4)}${timestamp}${random}`
    return barcode.slice(0, 13) // EAN-13 is 13 digits
  }

  generateSerialNumber(prefix: string = 'SN'): string {
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    return `${prefix}-${timestamp}-${random}`
  }

  validateBarcode(value: string, format: BarcodeFormat = 'CODE128'): boolean {
    switch (format) {
      case 'EAN13':
        return /^\d{13}$/.test(value) && this.validateEAN13Checksum(value)
      case 'EAN8':
        return /^\d{8}$/.test(value) && this.validateEAN8Checksum(value)
      case 'UPC':
        return /^\d{12}$/.test(value)
      case 'CODE39':
        return /^[A-Z0-9\-\.\s\$\/\+\%]+$/.test(value)
      case 'CODE128':
        return value.length > 0 && value.length <= 80
      default:
        return value.length > 0
    }
  }

  private validateEAN13Checksum(barcode: string): boolean {
    let sum = 0
    for (let i = 0; i < 12; i++) {
      sum += parseInt(barcode[i]) * (i % 2 === 0 ? 1 : 3)
    }
    const checksum = (10 - (sum % 10)) % 10
    return checksum === parseInt(barcode[12])
  }

  private validateEAN8Checksum(barcode: string): boolean {
    let sum = 0
    for (let i = 0; i < 7; i++) {
      sum += parseInt(barcode[i]) * (i % 2 === 0 ? 3 : 1)
    }
    const checksum = (10 - (sum % 10)) % 10
    return checksum === parseInt(barcode[7])
  }

  calculateEAN13Checksum(barcodeWithoutChecksum: string): number {
    let sum = 0
    for (let i = 0; i < 12; i++) {
      sum += parseInt(barcodeWithoutChecksum[i]) * (i % 2 === 0 ? 1 : 3)
    }
    return (10 - (sum % 10)) % 10
  }

  generateEAN13(): string {
    const prefix = '20' // Country code for internal use
    const manufacturer = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    const product = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    const base = prefix + manufacturer + product
    const checksum = this.calculateEAN13Checksum(base)
    return base + checksum
  }
}

export const barcodeService = BarcodeService.getInstance()
export default barcodeService
