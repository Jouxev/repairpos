import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Truck, Package, Check, AlertCircle, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { purchaseService, Purchase, PurchaseItem, PurchaseStatus } from '@/services/purchaseService'

interface PurchaseReceiveDialogProps {
  isOpen: boolean
  onClose: () => void
  purchase: Purchase | null
  onSuccess: () => void
}

export default function PurchaseReceiveDialog({
  isOpen,
  onClose,
  purchase,
  onSuccess,
}: PurchaseReceiveDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>({})
  const [batchNumbers, setBatchNumbers] = useState<Record<string, string>>({})
  const [expiryDates, setExpiryDates] = useState<Record<string, string>>({})

  // Initialize quantities when purchase changes
  if (purchase && Object.keys(receivedQuantities).length === 0) {
    const initialQuantities: Record<string, number> = {}
    purchase.items?.forEach((item) => {
      initialQuantities[item.id] = 0
    })
    setReceivedQuantities(initialQuantities)
  }

  const handleQuantityChange = (itemId: string, value: number) => {
    const item = purchase?.items?.find((i) => i.id === itemId)
    if (!item) return

    // Clamp value between 0 and ordered quantity
    const clampedValue = Math.max(0, Math.min(value, item.quantity))
    setReceivedQuantities((prev) => ({ ...prev, [itemId]: clampedValue }))
  }

  const getReceivedTotal = () => {
    return Object.values(receivedQuantities).reduce((sum, qty) => sum + qty, 0)
  }

  const getExpectedTotal = () => {
    return purchase?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0
  }

  const determineNewStatus = (): PurchaseStatus => {
    const expected = getExpectedTotal()
    const received = getReceivedTotal()

    if (received === 0) return 'ORDERED'
    if (received === expected) return 'RECEIVED'
    return 'PARTIAL'
  }

  const handleReceive = async () => {
    if (!purchase) return

    const newStatus = determineNewStatus()

    // Prepare received items
    const receivedItems = purchase.items?.map((item) => ({
      itemId: item.id,
      quantity: receivedQuantities[item.id] || 0,
      batchNumber: batchNumbers[item.id] || undefined,
      expiryDate: expiryDates[item.id] || undefined,
    }))

    try {
      setIsLoading(true)
      await purchaseService.receiveStock(
        purchase.id,
        {
          items: receivedItems || [],
          notes: `Stock received. Status changed to ${newStatus}`,
        }
      )
      toast.success('Stock received successfully')
      onSuccess()
    } catch (error: any) {
      toast.error('Failed to receive stock: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setReceivedQuantities({})
    setBatchNumbers({})
    setExpiryDates({})
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  if (!purchase) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Receive Stock
          </DialogTitle>
          <DialogDescription>
            Record received quantities for purchase order <strong>{purchase.invoiceNumber}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Progress */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Receiving Progress</p>
                <p className="text-sm text-muted-foreground">
                  {getReceivedTotal()} of {getExpectedTotal()} items received
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">
                {Math.round((getReceivedTotal() / Math.max(getExpectedTotal(), 1)) * 100)}%
              </p>
            </div>
          </div>

          {/* Items Table */}
          <ScrollArea className="h-[300px] border rounded-md">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Ordered</TableHead>
                  <TableHead className="text-center">Receive</TableHead>
                  <TableHead>Batch # (Optional)</TableHead>
                  <TableHead>Expiry (Optional)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchase.items?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">{item.product?.name}</div>
                      <div className="text-xs text-muted-foreground">{item.product?.sku}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline">{item.quantity}</Badge>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        max={item.quantity}
                        value={receivedQuantities[item.id] || 0}
                        onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 0)}
                        className="w-20 text-center"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        placeholder="Batch #"
                        value={batchNumbers[item.id] || ''}
                        onChange={(e) =>
                          setBatchNumbers((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                        className="w-28 text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        value={expiryDates[item.id] || ''}
                        onChange={(e) =>
                          setExpiryDates((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                        className="w-36"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>

          {/* Status Preview */}
          <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">New Status:</span>
              {determineNewStatus() === 'RECEIVED' && (
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  <Check className="h-3 w-3 mr-1" />
                  RECEIVED
                </Badge>
              )}
              {determineNewStatus() === 'PARTIAL' && (
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  PARTIAL
                </Badge>
              )}
              {determineNewStatus() === 'ORDERED' && (
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                  <Clock className="h-3 w-3 mr-1" />
                  ORDERED
                </Badge>
              )}
            </div>
            <div className="flex-1" />
            <div className="text-sm text-muted-foreground">
              {getReceivedTotal() === 0
                ? 'No items will be received'
                : `${getReceivedTotal()} items will be received`}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleReceive}
            disabled={isLoading || getReceivedTotal() === 0}
          >
            {isLoading ? 'Receiving...' : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Confirm Receipt
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}