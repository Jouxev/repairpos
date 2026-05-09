import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Camera,
  Scan,
  X,
  Check,
  AlertCircle,
  Zap,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
} from 'lucide-react'
import { toast } from 'sonner'

interface BarcodeScannerProps {
  onScan: (barcode: string) => void
  onError?: (error: string) => void
  continuous?: boolean
  soundEnabled?: boolean
  className?: string
}

interface ScanResult {
  barcode: string
  timestamp: Date
  confidence: number
}

export default function BarcodeScanner({
  onScan,
  onError,
  continuous = false,
  soundEnabled: initialSoundEnabled = true,
  className = '',
}: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [hasCamera, setHasCamera] = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [scannedBarcodes, setScannedBarcodes] = useState<ScanResult[]>([])
  const [manualInput, setManualInput] = useState('')
  const [torchEnabled, setTorchEnabled] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(initialSoundEnabled)
  const [fullscreen, setFullscreen] = useState(false)
  const [lastScanned, setLastScanned] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>()

  // Check for camera availability
  useEffect(() => {
    checkCameraAvailability()
    return () => {
      stopScanning()
    }
  }, [])

  // Handle barcode detection loop
  useEffect(() => {
    if (isScanning && videoRef.current) {
      startDetectionLoop()
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isScanning])

  const checkCameraAvailability = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCamera(false)
        return
      }

      const devices = await navigator.mediaDevices.enumerateDevices()
      const hasVideoDevice = devices.some((device) => device.kind === 'videoinput')
      setHasCamera(hasVideoDevice)
    } catch (error) {
      console.error('Error checking camera:', error)
      setHasCamera(false)
    }
  }

  const startScanning = async () => {
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }

      setIsScanning(true)
      setPermissionDenied(false)
      toast.success('Camera started')
    } catch (error) {
      console.error('Error starting camera:', error)
      setPermissionDenied(true)
      onError?.('Camera permission denied or not available')
      toast.error('Failed to start camera')
    }
  }

  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    setIsScanning(false)
    setTorchEnabled(false)
  }

  const startDetectionLoop = () => {
    const detectFrame = () => {
      if (!isScanning || !videoRef.current || !canvasRef.current) return

      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')

      if (!ctx || video.readyState !== 4) {
        animationFrameRef.current = requestAnimationFrame(detectFrame)
        return
      }

      // Draw video frame to canvas for processing
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Simple barcode detection using canvas pixel analysis
      // In a production app, you'd use a library like zxing-js or quagga2
      // For now, we'll simulate detection

      animationFrameRef.current = requestAnimationFrame(detectFrame)
    }

    detectFrame()
  }

  const playBeep = () => {
    if (!soundEnabled) return

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }

      const oscillator = audioContextRef.current.createOscillator()
      const gainNode = audioContextRef.current.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContextRef.current.destination)

      oscillator.frequency.value = 1500
      oscillator.type = 'sine'

      gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.1)

      oscillator.start(audioContextRef.current.currentTime)
      oscillator.stop(audioContextRef.current.currentTime + 0.1)
    } catch (error) {
      console.error('Error playing beep:', error)
    }
  }

  const handleManualScan = () => {
    if (!manualInput.trim()) {
      toast.error('Please enter a barcode value')
      return
    }

    const barcode = manualInput.trim()
    handleBarcodeDetected(barcode)
    setManualInput('')
  }

  const handleBarcodeDetected = (barcode: string) => {
    // Check for duplicate if not in continuous mode
    if (!continuous && lastScanned === barcode) {
      toast.info('This barcode was just scanned')
      return
    }

    playBeep()
    setLastScanned(barcode)

    const scanResult: ScanResult = {
      barcode,
      timestamp: new Date(),
      confidence: 0.95,
    }

    setScannedBarcodes((prev) => [scanResult, ...prev])
    onScan(barcode)

    if (!continuous) {
      stopScanning()
    }

    toast.success(`Scanned: ${barcode}`)
  }

  const toggleTorch = async () => {
    try {
      if (!streamRef.current) return

      const track = streamRef.current.getVideoTracks()[0]
      if (!track) return

      const capabilities = track.getCapabilities() as any
      if (!capabilities.torch) {
        toast.error('Torch not supported on this device')
        return
      }

      await track.applyConstraints({
        advanced: [{ torch: !torchEnabled }],
      })

      setTorchEnabled(!torchEnabled)
    } catch (error) {
      console.error('Error toggling torch:', error)
      toast.error('Failed to toggle torch')
    }
  }

  const clearHistory = () => {
    setScannedBarcodes([])
    setLastScanned(null)
    toast.info('Scan history cleared')
  }

  return (
    <Card className={`${className} ${fullscreen ? 'fixed inset-0 z-50' : ''}`}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Scan className="h-5 w-5" />
          Barcode Scanner
        </CardTitle>
        <div className="flex items-center gap-2">
          {isScanning && (
            <Button variant="outline" size="icon" onClick={toggleTorch}>
              {torchEnabled ? <Zap className="h-4 w-4" /> : <Zap className="h-4 w-4 text-muted-foreground" />}
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={() => setSoundEnabled(!soundEnabled)}>
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="icon" onClick={() => setFullscreen(!fullscreen)}>
            {fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>
          {isScanning ? (
            <Button variant="destructive" onClick={stopScanning}>
              <X className="h-4 w-4 mr-2" />
              Stop
            </Button>
          ) : (
            <Button onClick={startScanning} disabled={!hasCamera || permissionDenied}>
              <Camera className="h-4 w-4 mr-2" />
              Start Camera
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Camera View */}
        {isScanning && (
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Scanning Overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-48 border-2 border-white/50 rounded-lg relative">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-primary" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-primary" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-primary" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-primary" />
              </div>
            </div>

            {/* Scanning Indicator */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-white text-sm">Scanning...</span>
            </div>
          </div>
        )}

        {/* Permission Denied Alert */}
        {permissionDenied && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Camera access was denied. Please allow camera access in your browser settings to use the scanner.
            </AlertDescription>
          </Alert>
        )}

        {/* Manual Entry */}
        <div className="space-y-2">
          <Label>Manual Entry</Label>
          <div className="flex gap-2">
            <Input
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Enter barcode manually..."
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleManualScan()
                }
              }}
            />
            <Button onClick={handleManualScan}>
              <Check className="h-4 w-4 mr-2" />
              Enter
            </Button>
          </div>
        </div>

        {/* Scan History */}
        {scannedBarcodes.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Scan History ({scannedBarcodes.length})</Label>
              <Button variant="ghost" size="sm" onClick={clearHistory}>
                Clear
              </Button>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {scannedBarcodes.map((scan, index) => (
                <div
                  key={`${scan.barcode}-${index}`}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="font-mono">{scan.barcode}</span>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {scan.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
