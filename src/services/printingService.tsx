import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export interface ReceiptData {
  shopName: string
  shopAddress?: string
  shopPhone?: string
  receiptNumber: string
  date: string
  customerName?: string
  items: Array<{
    name: string
    quantity: number
    price: number
  }>
  subtotal: number
  tax: number
  discount?: number
  total: number
  paymentMethod: string
  footer?: string
}

export interface ThermalReceiptData extends ReceiptData {
  printerWidth?: number // 58mm, 80mm
}

export class PrintingService {
  // Generate PDF for A4/Letter printing
  static generatePDF(receipt: ReceiptData): jsPDF {
    const doc = new jsPDF()
    
    // Header
    doc.setFontSize(20)
    doc.text(receipt.shopName, 105, 20, { align: 'center' })
    
    if (receipt.shopAddress) {
      doc.setFontSize(10)
      doc.text(receipt.shopAddress, 105, 28, { align: 'center' })
    }
    
    if (receipt.shopPhone) {
      doc.setFontSize(10)
      doc.text(`Phone: ${receipt.shopPhone}`, 105, 33, { align: 'center' })
    }
    
    // Receipt Info
    doc.setFontSize(12)
    doc.text(`Receipt #: ${receipt.receiptNumber}`, 20, 50)
    doc.text(`Date: ${receipt.date}`, 20, 58)
    
    if (receipt.customerName) {
      doc.text(`Customer: ${receipt.customerName}`, 20, 66)
    }
    
    // Items Table
    let yPos = 80
    
    // Table Header
    doc.setFillColor(240, 240, 240)
    doc.rect(20, yPos, 170, 10, 'F')
    doc.setFontSize(10)
    doc.text('Item', 25, yPos + 7)
    doc.text('Qty', 100, yPos + 7, { align: 'center' })
    doc.text('Price', 140, yPos + 7, { align: 'right' })
    doc.text('Total', 185, yPos + 7, { align: 'right' })
    
    yPos += 15
    
    // Items
    receipt.items.forEach((item) => {
      doc.text(item.name, 25, yPos)
      doc.text(item.quantity.toString(), 100, yPos, { align: 'center' })
      doc.text(`$${item.price.toFixed(2)}`, 140, yPos, { align: 'right' })
      doc.text(`$${(item.price * item.quantity).toFixed(2)}`, 185, yPos, { align: 'right' })
      yPos += 8
    })
    
    // Totals
    yPos += 10
    doc.line(120, yPos, 185, yPos)
    yPos += 8
    
    doc.text('Subtotal:', 140, yPos, { align: 'right' })
    doc.text(`$${receipt.subtotal.toFixed(2)}`, 185, yPos, { align: 'right' })
    yPos += 6
    
    if (receipt.discount && receipt.discount > 0) {
      doc.text('Discount:', 140, yPos, { align: 'right' })
      doc.text(`-$${receipt.discount.toFixed(2)}`, 185, yPos, { align: 'right' })
      yPos += 6
    }
    
    doc.text('Tax:', 140, yPos, { align: 'right' })
    doc.text(`$${receipt.tax.toFixed(2)}`, 185, yPos, { align: 'right' })
    yPos += 8
    
    doc.setFontSize(14)
    doc.text('Total:', 140, yPos, { align: 'right' })
    doc.text(`$${receipt.total.toFixed(2)}`, 185, yPos, { align: 'right' })
    
    // Footer
    yPos = 280
    doc.setFontSize(10)
    doc.text(`Payment Method: ${receipt.paymentMethod}`, 105, yPos, { align: 'center' })
    
    if (receipt.footer) {
      yPos += 10
      doc.text(receipt.footer, 105, yPos, { align: 'center' })
    }
    
    return doc
  }

  // Generate thermal receipt (for 80mm/58mm printers)
  static generateThermalReceipt(receipt: ThermalReceiptData): string {
    const width = receipt.printerWidth || 80
    const isNarrow = width === 58
    
    let output = ''
    
    // Header
    output += '\x1B\x61\x01' // Center align
    output += '\x1B\x21\x30' // Double height & width
    output += `${receipt.shopName}\n`
    output += '\x1B\x21\x00' // Normal text
    
    if (receipt.shopAddress) {
      output += `${receipt.shopAddress}\n`
    }
    if (receipt.shopPhone) {
      output += `Phone: ${receipt.shopPhone}\n`
    }
    
    output += '\x1B\x61\x00' // Left align
    output += '-'.repeat(isNarrow ? 32 : 48) + '\n'
    
    // Receipt info
    output += `Receipt: ${receipt.receiptNumber}\n`
    output += `Date: ${receipt.date}\n`
    if (receipt.customerName) {
      output += `Customer: ${receipt.customerName}\n`
    }
    
    output += '-'.repeat(isNarrow ? 32 : 48) + '\n'
    
    // Items header
    if (isNarrow) {
      output += 'Item\nQty x Price = Total\n'
    } else {
      output += `${'Item'.padEnd(24)} ${'Qty'.padStart(4)} ${'Price'.padStart(8)} ${'Total'.padStart(8)}\n`
    }
    
    output += '-'.repeat(isNarrow ? 32 : 48) + '\n'
    
    // Items
    receipt.items.forEach((item) => {
      const total = item.price * item.quantity
      
      if (isNarrow) {
        output += `${item.name.substring(0, 30)}\n`
        output += `${item.quantity} x $${item.price.toFixed(2)} = $${total.toFixed(2)}\n`
      } else {
        output += `${item.name.substring(0, 24).padEnd(24)} ${item.quantity.toString().padStart(4)} $${item.price.toFixed(2).padStart(7)} $${total.toFixed(2).padStart(7)}\n`
      }
    })
    
    output += '-'.repeat(isNarrow ? 32 : 48) + '\n'
    
    // Totals
    if (isNarrow) {
      output += `Subtotal: $${receipt.subtotal.toFixed(2)}\n`
      if (receipt.discount && receipt.discount > 0) {
        output += `Discount: -$${receipt.discount.toFixed(2)}\n`
      }
      output += `Tax: $${receipt.tax.toFixed(2)}\n`
      output += '----------------\n'
      output += `TOTAL: $${receipt.total.toFixed(2)}\n`
    } else {
      output += `${'Subtotal:'.padStart(40)} $${receipt.subtotal.toFixed(2).padStart(8)}\n`
      if (receipt.discount && receipt.discount > 0) {
        output += `${'Discount:'.padStart(40)} -$${receipt.discount.toFixed(2).padStart(7)}\n`
      }
      output += `${'Tax:'.padStart(40)} $${receipt.tax.toFixed(2).padStart(8)}\n`
      output += '-'.repeat(48) + '\n'
      output += `${'TOTAL:'.padStart(40)} $${receipt.total.toFixed(2).padStart(8)}\n`
    }
    
    output += '-'.repeat(isNarrow ? 32 : 48) + '\n'
    
    // Payment info
    output += `Payment: ${receipt.paymentMethod}\n`
    
    // Footer
    if (receipt.footer) {
      output += '\n'
      output += '\x1B\x61\x01' // Center align
      output += `${receipt.footer}\n`
      output += '\x1B\x61\x00' // Left align
    }
    
    // Cut paper command
    output += '\n\n\n\n'
    output += '\x1D\x56\x00' // Cut paper (partial cut)
    
    return output
  }

  // Print receipt using browser's print dialog
  static printReceipt(receipt: ReceiptData): void {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('Please allow popups to print receipts')
      return
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt ${receipt.receiptNumber}</title>
        <style>
          @media print {
            @page { margin: 0; }
            body { margin: 1cm; }
          }
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.4;
            max-width: 80mm;
            margin: 0 auto;
            padding: 10px;
          }
          .header { text-align: center; margin-bottom: 20px; }
          .shop-name { font-size: 18px; font-weight: bold; }
          .info { margin-bottom: 10px; }
          .items { width: 100%; margin: 10px 0; }
          .items td { padding: 2px 0; }
          .total { border-top: 1px dashed #000; padding-top: 10px; margin-top: 10px; }
          .footer { text-align: center; margin-top: 20px; font-size: 10px; }
          .right { text-align: right; }
          .center { text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="shop-name">${receipt.shopName}</div>
          ${receipt.shopAddress ? `<div>${receipt.shopAddress}</div>` : ''}
          ${receipt.shopPhone ? `<div>Phone: ${receipt.shopPhone}</div>` : ''}
        </div>
        
        <div class="info">
          <div>Receipt #: ${receipt.receiptNumber}</div>
          <div>Date: ${receipt.date}</div>
          ${receipt.customerName ? `<div>Customer: ${receipt.customerName}</div>` : ''}
        </div>
        
        <table class="items">
          ${receipt.items.map(item => `
            <tr>
              <td>${item.name}</td>
              <td class="center">${item.quantity}</td>
              <td class="right">$${item.price.toFixed(2)}</td>
              <td class="right">$${(item.price * item.quantity).toFixed(2)}</td>
            </tr>
          `).join('')}
        </table>
        
        <div class="total">
          <div>Subtotal: $${receipt.subtotal.toFixed(2)}</div>
          ${receipt.discount ? `<div>Discount: -$${receipt.discount.toFixed(2)}</div>` : ''}
          <div>Tax: $${receipt.tax.toFixed(2)}</div>
          <div style="font-size: 14px; font-weight: bold; margin-top: 5px;">
            TOTAL: $${receipt.total.toFixed(2)}
          </div>
        </div>
        
        <div style="margin-top: 10px;">
          Payment Method: ${receipt.paymentMethod}
        </div>
        
        ${receipt.footer ? `<div class="footer">${receipt.footer}</div>` : ''}
        
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `

    printWindow.document.write(html)
    printWindow.document.close()
  }

  // Export receipt as PDF
  static exportToPDF(receipt: ReceiptData): void {
    const doc = this.generatePDF(receipt)
    doc.save(`receipt-${receipt.receiptNumber}.pdf`)
  }

  // Print thermal receipt (for ESC/POS compatible printers)
  static printThermal(receipt: ThermalReceiptData): void {
    const commands = this.generateThermalReceipt(receipt)
    
    // In a real implementation, you would send these commands
    // to a connected thermal printer via USB/Bluetooth
    console.log('Thermal print commands:', commands)
    
    // For browser-based printing, convert to a printable format
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <html>
        <head>
          <style>
            body { 
              font-family: 'Courier New', monospace; 
              font-size: 12px;
              width: ${width === 58 ? '58mm' : '80mm'};
              margin: 0 auto;
              padding: 10px;
            }
            pre { white-space: pre-wrap; word-wrap: break-word; }
          </style>
        </head>
        <body>
          <pre>${commands}</pre>
          <script>window.onload = function() { window.print(); }</script>
        </body>
        </html>
      `)
      printWindow.document.close()
    }
  }
}

// React component for print preview
import React from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Printer, FileDown } from 'lucide-react'

interface PrintPreviewProps {
  receipt: ReceiptData
  children: React.ReactNode
}

export const PrintPreview: React.FC<PrintPreviewProps> = ({ receipt, children }) => {
  const handlePrint = () => {
    PrintingService.printReceipt(receipt)
  }

  const handleExportPDF = () => {
    PrintingService.exportToPDF(receipt)
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Print Preview</DialogTitle>
          <DialogDescription>Preview and print your receipt</DialogDescription>
        </DialogHeader>

        {/* Receipt Preview */}
        <div className="bg-white p-8 border rounded-lg shadow-sm my-4">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold">{receipt.shopName}</h2>
            {receipt.shopAddress && (
              <p className="text-gray-600 text-sm">{receipt.shopAddress}</p>
            )}
            {receipt.shopPhone && (
              <p className="text-gray-600 text-sm">Phone: {receipt.shopPhone}</p>
            )}
          </div>

          <div className="border-t border-b py-4 mb-4">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Receipt #:</span>
              <span className="font-medium">{receipt.receiptNumber}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Date:</span>
              <span>{receipt.date}</span>
            </div>
            {receipt.customerName && (
              <div className="flex justify-between">
                <span className="text-gray-600">Customer:</span>
                <span>{receipt.customerName}</span>
              </div>
            )}
          </div>

          <table className="w-full mb-4">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Item</th>
                <th className="text-center py-2">Qty</th>
                <th className="text-right py-2">Price</th>
                <th className="text-right py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {receipt.items.map((item, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="py-2">{item.name}</td>
                  <td className="text-center py-2">{item.quantity}</td>
                  <td className="text-right py-2">${item.price.toFixed(2)}</td>
                  <td className="text-right py-2">
                    ${(item.price * item.quantity).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t pt-4">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Subtotal:</span>
              <span>${receipt.subtotal.toFixed(2)}</span>
            </div>
            {receipt.discount && receipt.discount > 0 && (
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Discount:</span>
                <span className="text-green-600">-${receipt.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Tax:</span>
              <span>${receipt.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold mt-4 pt-4 border-t">
              <span>TOTAL:</span>
              <span>${receipt.total.toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t text-center">
            <p className="text-gray-600">Payment Method: {receipt.paymentMethod}</p>
            {receipt.footer && (
              <p className="text-gray-500 text-sm mt-2">{receipt.footer}</p>
            )}
            <p className="text-gray-400 text-xs mt-4">Thank you for your business!</p>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleExportPDF}>
            <FileDown className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print Receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default PrintingService
