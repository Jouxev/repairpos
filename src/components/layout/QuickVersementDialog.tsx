import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Printer } from 'lucide-react'
import { toast } from 'sonner'
import { clientService, Client } from '@/services/clientService'
import { supplierService, Supplier } from '@/services/supplierService'
import {
  buildPaymentVoucherDocument,
  executePreparedPrintDocument,
  PreparedPrintDocument,
} from '@/services/printHelper'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { useLocaleFormatters } from '@/hooks/useLocaleFormatters'

type VersementMode = 'client' | 'supplier'
type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'check' | 'digital_wallet'

const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: 'Cash',
  card: 'Card',
  bank_transfer: 'Bank Transfer',
  check: 'Check',
  digital_wallet: 'Digital Wallet',
}

interface QuickVersementDialogProps {
  mode: VersementMode
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function QuickVersementDialog({
  mode,
  open,
  onOpenChange,
}: QuickVersementDialogProps) {
  const { t } = useAppSettings()
  const { formatCurrency } = useLocaleFormatters()
  const [clients, setClients] = useState<Client[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [notes, setNotes] = useState('')
  const [isLoadingOptions, setIsLoadingOptions] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [previewDocument, setPreviewDocument] = useState<PreparedPrintDocument | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)

  useEffect(() => {
    if (!open) {
      setSelectedId('')
      setAmount('')
      setPaymentMethod('cash')
      setNotes('')
      return
    }

    const loadOptions = async () => {
      try {
        setIsLoadingOptions(true)
        if (mode === 'client') {
          const data = await clientService.getClients()
          setClients(data)
        } else {
          const data = await supplierService.getSuppliers({ isActive: true })
          setSuppliers(Array.isArray(data) ? data : [])
        }
      } catch (error: any) {
        toast.error(`${mode === 'client' ? t('loadingClients') : t('loadingSuppliers')}: ${error.message}`)
      } finally {
        setIsLoadingOptions(false)
      }
    }

    loadOptions()
  }, [mode, open])

  const selectedEntity = useMemo(() => {
    return mode === 'client'
      ? clients.find((item) => item.id === selectedId) || null
      : suppliers.find((item) => item.id === selectedId) || null
  }, [clients, suppliers, mode, selectedId])

  const handleSubmit = async () => {
    if (!selectedEntity) {
      toast.error(mode === 'client' ? t('selectClient') : t('selectSupplierPrompt'))
      return
    }

    const numericAmount = Number(amount)
    if (!numericAmount || numericAmount <= 0) {
      toast.error(t('enterAmount'))
      return
    }

    try {
      setIsSubmitting(true)

      if (mode === 'client') {
        const client = selectedEntity as Client
        await clientService.addPayment(client.id, {
          amount: numericAmount,
          paymentMethod,
          notes: notes || undefined,
          date: new Date(),
        })
        const preview = await buildPaymentVoucherDocument(
          {
            reference: `PAY-IN-${Date.now()}`,
            date: new Date().toLocaleDateString(),
            amount: numericAmount,
            method: paymentMethodLabels[paymentMethod],
            notes: notes || undefined,
            direction: 'IN',
            customerName: client.fullName,
            customerPhone: client.phone,
            customerEmail: client.email,
          },
          'PAYMENT_IN',
        )
        setPreviewDocument(preview)
      } else {
        const supplier = selectedEntity as Supplier
        await supplierService.addPayment(supplier.id, {
          amount: numericAmount,
          paymentMethod,
          notes: notes || undefined,
          date: new Date(),
        })
        const preview = await buildPaymentVoucherDocument(
          {
            reference: `PAY-OUT-${Date.now()}`,
            date: new Date().toLocaleDateString(),
            amount: numericAmount,
            method: paymentMethodLabels[paymentMethod],
            notes: notes || undefined,
            direction: 'OUT',
            supplierName: supplier.name,
            supplierPhone: supplier.phone,
            supplierEmail: supplier.email,
          },
          'PAYMENT_OUT',
        )
        setPreviewDocument(preview)
      }

      setIsPreviewOpen(true)
      onOpenChange(false)
      toast.success(t('saveVersement'))
    } catch (error: any) {
      toast.error(`${t('saveVersement')}: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePrint = async () => {
    if (!previewDocument) {
      return
    }

    try {
      setIsPrinting(true)
      await executePreparedPrintDocument(previewDocument)
      toast.success(t('printVoucher'))
    } catch (error: any) {
      toast.error(`${t('printVoucher')}: ${error.message}`)
    } finally {
      setIsPrinting(false)
    }
  }

  const dialogTitle = mode === 'client' ? t('quickClientVersement') : t('quickSupplierVersement')
  const entityLabel = mode === 'client' ? t('clients') : t('suppliers')
  const entities = mode === 'client' ? clients : suppliers

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>
              {t('recordPaymentFromHeader', { mode: entityLabel.toLowerCase() })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{entityLabel}</Label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={isLoadingOptions ? (mode === 'client' ? t('loadingClients') : t('loadingSuppliers')) : (mode === 'client' ? t('selectClient') : t('selectSupplierPrompt'))}
                  />
                </SelectTrigger>
                <SelectContent>
                  {entities.map((entity) => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {mode === 'client'
                        ? `${(entity as Client).fullName} • ${formatCurrency((entity as Client).balance || 0)}`
                        : `${(entity as Supplier).name} • ${formatCurrency((entity as Supplier).balance || 0)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedEntity && (
              <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('currentBalance')}</span>
                  <span className="font-medium">
                    {formatCurrency((selectedEntity as Client | Supplier).balance || 0)}
                  </span>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor={`quick-${mode}-amount`}>{t('amount')}</Label>
              <Input
                id={`quick-${mode}-amount`}
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder={t('enterAmount')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`quick-${mode}-method`}>{t('paymentMethods')}</Label>
              <Select value={paymentMethod} onValueChange={(value: PaymentMethod) => setPaymentMethod(value)}>
                <SelectTrigger id={`quick-${mode}-method`}>
                  <SelectValue placeholder={t('paymentMethods')} />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(paymentMethodLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`quick-${mode}-notes`}>{t('notes')}</Label>
              <Textarea
                id={`quick-${mode}-notes`}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder={t('optionalNotes')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              {t('cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || isLoadingOptions}>
              {isSubmitting ? t('saving') : t('saveVersement')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{previewDocument?.title || t('versementPreview')}</DialogTitle>
            <DialogDescription>
              {t('previewVoucherTemplate')}
            </DialogDescription>
          </DialogHeader>
          <iframe
            title="Versement Preview"
            srcDoc={previewDocument?.html || ''}
            className="h-[70vh] w-full rounded-xl border bg-white"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handlePrint} disabled={!previewDocument || isPrinting}>
              <Printer className="mr-2 h-4 w-4" />
              {isPrinting ? t('printing') : t('printVoucher')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
