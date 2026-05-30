import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Download, Printer, RefreshCw, Copy, Barcode } from 'lucide-react'
import { toast } from 'sonner'
import { barcodeService, BarcodeFormat } from '@/services/barcodeService'

interface BarcodeGeneratorProps {
  defaultValue?: string
  defaultFormat?: BarcodeFormat
  onGenerate?: (value: string, dataUrl: string) => void
}

export default function BarcodeGenerator({
  defaultValue = '',
  defaultFormat = 'CODE128',
  onGenerate,
}: BarcodeGeneratorProps) {
  const [value, setValue] = useState(defaultValue)
  const [format, setFormat] = useState<BarcodeFormat>(defaultFormat)
  const [width, setWidth] = useState(2)
  const [height, setHeight] = useState(100)
  const [displayValue, setDisplayValue] = useState(true)
  const [dataUrl, setDataUrl] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const barcodeFormats: { value: BarcodeFormat; label: string }[] = [
    { value: 'CODE128', label: 'CODE128 (Universal)' },
    { value: 'EAN13', label: 'EAN-13 (Retail)' },
    { value: 'EAN8', label: 'EAN-8 (Small Retail)' },
    { value: 'UPC', label: 'UPC (North America)' },
    { value: 'CODE39', label: 'CODE39 (Industrial)' },
    { value: 'ITF14', label: 'ITF-14 (Shipping)' },
    { value: 'MSI', label: 'MSI (Inventory)' },
    { value: 'Pharmacode', label: 'Pharmacode (Pharmaceutical)' },
  ]

  const generateBarcode = async () => {
    if (!value.trim()) {
      toast.error('Please enter a value to encode')
      return
    }

    // Validate barcode for the selected format
    if (!barcodeService.validateBarcode(value, format)) {
      toast.error(`Invalid barcode format for ${format}`)
      return
    }

    setIsGenerating(true)
    try {
      const url = await barcodeService.generateBarcodeDataURL(value, {
        format,
        width,
        height,
        displayValue,
      })
      setDataUrl(url)
      onGenerate?.(value, url)
      toast.success('Barcode generated successfully')
    } catch (error) {
      console.error('Barcode generation error:', error)
      toast.error('Failed to generate barcode')
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadBarcode = () => {
    if (!dataUrl) {
      toast.error('Please generate a barcode first')
      return
    }

    const link = document.createElement('a')
    link.href = dataUrl
    link.download = `barcode-${value}-${Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Barcode downloaded')
  }

  const printBarcode = () => {
    if (!dataUrl) {
      toast.error('Please generate a barcode first')
      return
    }

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error('Please allow popups to print')
      return
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Barcode - ${value}</title>
          <style>
            body {
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
              font-family: Arial, sans-serif;
            }
            .barcode-container {
              text-align: center;
            }
            .barcode-value {
              margin-top: 10px;
              font-size: 14px;
              color: #666;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="barcode-container">
            <img src="${dataUrl}" alt="Barcode ${value}" />
            <div class="barcode-value">${value}</div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 200);
            };
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const copyToClipboard = () => {
    if (!value) {
      toast.error('No value to copy')
      return
    }
    navigator.clipboard.writeText(value)
    toast.success('Barcode value copied to clipboard')
  }

  const generateRandomBarcode = () => {
    const barcode = barcodeService.generateEAN13()
    setValue(barcode)
    setFormat('EAN13')
    toast.success('Random EAN-13 barcode generated')
  }

  // Auto-generate on mount if default value provided
  useEffect(() => {
    if (defaultValue && canvasRef.current) {
      generateBarcode()
    }
  }, [])

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Barcode className="h-5 w-5" />
          Barcode Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Barcode Value Input */}
        <div className="space-y-2">
          <Label>Barcode Value</Label>
          <div className="flex gap-2">
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Enter value to encode..."
              className="flex-1"
            />
            <Button variant="outline" size="icon" onClick={copyToClipboard}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={generateRandomBarcode}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Random
            </Button>
          </div>
        </div>

        {/* Format Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Barcode Format</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as BarcodeFormat)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {barcodeFormats.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Display Text</Label>
            <div className="flex items-center space-x-2 pt-2">
              <input
                type="checkbox"
                checked={displayValue}
                onChange={(e) => setDisplayValue(e.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm">Show value below barcode</span>
            </div>
          </div>
        </div>

        {/* Size Settings */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Width: {width}px</Label>
            <input
              type="range"
              min={1}
              max={4}
              step={1}
              value={width}
              onChange={(e) => setWidth(parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label>Height: {height}px</Label>
            <input
              type="range"
              min={30}
              max={150}
              step={10}
              value={height}
              onChange={(e) => setHeight(parseInt(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        {/* Preview */}
        <div className="border rounded-lg p-4 bg-white">
          <Label className="mb-2 block">Preview</Label>
          <div className="flex justify-center">
            <canvas ref={canvasRef} id="barcode-canvas" />
          </div>
          {!dataUrl && (
            <p className="text-center text-muted-foreground text-sm mt-4">
              Click "Generate" to create barcode
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button onClick={generateBarcode} disabled={isGenerating} className="flex-1">
            <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
            Generate Barcode
          </Button>
          <Button variant="outline" onClick={downloadBarcode} disabled={!dataUrl}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button variant="outline" onClick={printBarcode} disabled={!dataUrl}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
