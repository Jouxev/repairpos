import { useEffect, useState } from 'react'
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
import { useAuthStore } from '@/stores/authStore'
import { cashRegisterService, CashRegister } from '@/services/cashRegisterService'
import { toast } from 'sonner'
import { useAppSettings } from '@/contexts/AppSettingsContext'

interface OpenRegisterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  allowSkip?: boolean
  onSkip?: () => void
  onOpened?: (register: CashRegister) => void
}

export default function OpenRegisterDialog({
  open,
  onOpenChange,
  allowSkip = false,
  onSkip,
  onOpened,
}: OpenRegisterDialogProps) {
  const { user } = useAuthStore()
  const { t } = useAppSettings()
  const [openingAmount, setOpeningAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      setOpeningAmount('')
      setNotes('')
      setIsSubmitting(false)
    }
  }, [open])

  const handleOpenRegister = async () => {
    if (!user?.id) {
      toast.error(t('signIn'))
      return
    }

    const amount = Number(openingAmount)
    if (Number.isNaN(amount) || amount < 0) {
      toast.error(t('openingAmount'))
      return
    }

    try {
      setIsSubmitting(true)
      const register = await cashRegisterService.openRegister({
        openingAmount: amount,
        openedById: user.id,
        notes: notes || undefined,
      })
      toast.success(t('openRegister'))
      onOpenChange(false)
      onOpened?.(register)
    } catch (error: any) {
      toast.error(error?.message || t('openRegister'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('openCashRegister')}</DialogTitle>
          <DialogDescription>
            {t('startSessionCurrentOpeningAmount')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="shared-opening-amount">{t('openingAmount')}</Label>
            <Input
              id="shared-opening-amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={openingAmount}
              onChange={(event) => setOpeningAmount(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shared-opening-notes">{t('notes')}</Label>
            <Textarea
              id="shared-opening-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={t('optionalShiftNotes')}
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          {allowSkip && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false)
                onSkip?.()
              }}
              disabled={isSubmitting}
            >
              {t('skip')}
            </Button>
          )}
          <Button type="button" onClick={handleOpenRegister} disabled={isSubmitting}>
            {isSubmitting ? t('saving') : t('openRegister')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
