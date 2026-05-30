import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Printer, X } from 'lucide-react'
import { Product } from '@/services/productService'

interface ProductLabelProps {
  product: Product
  onClose: () => void
}

export default function ProductLabel({ product, onClose }: ProductLabelProps) {
  const labelRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const labelContent = labelRef.current?.innerHTML
    if (!labelContent) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Label</title>
          <style>
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: #f5f5f5;
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            ${labelContent}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                setTimeout(function() {
                  window.close();
                }, 500);
              }, 250);
            };
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  // Generate barcode (Code 128 pattern)
  const generateBarcode = (text: string): Array<{ bar: number; space: number }> => {
    if (!text) return []
    // Simple visual representation of barcode
    const pattern: Array<{ bar: number; space: number }> = []
    const chars = text.split('')
    for (let i = 0; i < chars.length; i++) {
      const charCode = chars[i].charCodeAt(0)
      const barWidth = (charCode % 3) + 1
      const spaceWidth = ((charCode * 7) % 2) + 1
      pattern.push({ bar: barWidth, space: spaceWidth })
    }
    return pattern
  }

  const barcodePattern = generateBarcode(product.barcode || product.sku || '')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Product Label</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Label Preview */}
        <div className="p-4">
          <div
            ref={labelRef}
            className="bg-white border-2 border-gray-300 rounded-lg p-6 w-full"
            style={{ aspectRatio: '3/2' }}
          >
            {/* Product Name */}
            <div className="text-center mb-4">
              <h4 className="text-lg font-bold text-gray-900 truncate">
                {product.name}
              </h4>
            </div>

            {/* Price */}
            <div className="text-center mb-4">
              <span className="text-2xl font-bold text-gray-900">
                ${product.sellingPrice || product.price || 0}
              </span>
            </div>

            {/* Barcode */}
            {(product.barcode || product.sku) && (
              <div className="flex flex-col items-center">
                {/* Barcode Visual */}
                <div className="flex items-center h-12 mb-1">
                  {barcodePattern.map((pattern, idx) => (
                    <div key={idx} className="flex">
                      <div
                        className="bg-black"
                        style={{ width: pattern.bar * 2 + 'px', height: '40px' }}
                      />
                      <div style={{ width: pattern.space * 2 + 'px' }} />
                    </div>
                  ))}
                </div>
                {/* Barcode Number */}
                <span className="text-xs text-gray-600 font-mono tracking-wider">
                  {product.barcode || product.sku}
                </span>
              </div>
            )}

            {/* SKU if no barcode */}
            {!product.barcode && product.sku && (
              <div className="text-center mt-2">
                <span className="text-xs text-gray-500">SKU: {product.sku}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 p-4 border-t">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Close
          </Button>
          <Button className="flex-1" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print Label
          </Button>
        </div>
      </div>
    </div>
  )
}
