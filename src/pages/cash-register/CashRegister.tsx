import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import EntityExportButton from '@/components/common/EntityExportButton'
import { ArrowDownLeft, ArrowUpRight, DollarSign, History, Loader2, Play, RefreshCcw, Square, Wallet } from 'lucide-react'
import { cashRegisterService, CashRegister, CashMovement } from '@/services/cashRegisterService'
import { useToast } from '@/hooks/use-toast'
import { useAuthStore } from '@/stores/authStore'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { useLocaleFormatters } from '@/hooks/useLocaleFormatters'

export default function CashRegisterPage() {
  const { toast } = useToast()
  const { user } = useAuthStore()
  const { t } = useAppSettings()
  const { formatCurrency, formatDateTime } = useLocaleFormatters()
  const [register, setRegister] = useState<CashRegister | null>(null)
  const [allRegisters, setAllRegisters] = useState<CashRegister[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [cashMovements, setCashMovements] = useState<CashMovement[]>([])
  const [openAmount, setOpenAmount] = useState('')
  const [openNotes, setOpenNotes] = useState('')
  const [closeAmount, setCloseAmount] = useState('')
  const [closeNotes, setCloseNotes] = useState('')
  const [cashInAmount, setCashInAmount] = useState('')
  const [cashInReason, setCashInReason] = useState('')
  const [cashOutAmount, setCashOutAmount] = useState('')
  const [cashOutReason, setCashOutReason] = useState('')

  useEffect(() => {
    loadRegister()
  }, [])

  const loadRegister = async () => {
    try {
      setIsLoading(true)
      const [openRegister, registerHistory] = await Promise.all([
        cashRegisterService.getOpenRegister(),
        cashRegisterService.getAllRegisters(),
      ])
      setRegister(openRegister)
      setAllRegisters(registerHistory)
      setCashMovements(openRegister?.cashMovements || [])
    } catch (error) {
      console.error('Error loading register:', error)
      toast({
        title: 'Error',
        description: 'Failed to load register data.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenRegister = async () => {
    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'You must be logged in to open a register.',
        variant: 'destructive',
      })
      return
    }

    try {
      const amount = parseFloat(openAmount)
      if (isNaN(amount) || amount < 0) {
        toast({
          title: 'Invalid Amount',
          description: 'Please enter a valid opening amount.',
          variant: 'destructive',
        })
        return
      }

      await cashRegisterService.openRegister({
        openingAmount: amount,
        openedById: user.id,
        notes: openNotes || undefined,
      })

      toast({
        title: 'Success',
        description: 'Register opened successfully.',
      })

      setOpenAmount('')
      setOpenNotes('')
      loadRegister()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to open register.',
        variant: 'destructive',
      })
    }
  }

  const handleCloseRegister = async () => {
    if (!user?.id || !register) {
      toast({
        title: 'Error',
        description: 'Unable to close register.',
        variant: 'destructive',
      })
      return
    }

    try {
      const amount = parseFloat(closeAmount)
      if (isNaN(amount) || amount < 0) {
        toast({
          title: 'Invalid Amount',
          description: 'Please enter a valid closing amount.',
          variant: 'destructive',
        })
        return
      }

      await cashRegisterService.closeRegister(register.id, {
        closingAmount: amount,
        closedById: user.id,
        notes: closeNotes || undefined,
      })

      toast({
        title: 'Success',
        description: 'Register closed successfully.',
      })

      setCloseAmount('')
      setCloseNotes('')
      loadRegister()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to close register.',
        variant: 'destructive',
      })
    }
  }

  const handleCashIn = async () => {
    if (!register) return

    try {
      const amount = parseFloat(cashInAmount)
      if (isNaN(amount) || amount <= 0) {
        toast({
          title: 'Invalid Amount',
          description: 'Please enter a valid amount.',
          variant: 'destructive',
        })
        return
      }

      await cashRegisterService.addCashMovement(register.id, {
        type: 'CASH_IN',
        amount,
        reason: cashInReason || 'Cash In',
      })

      toast({
        title: 'Success',
        description: 'Cash in recorded successfully.',
      })

      setCashInAmount('')
      setCashInReason('')
      loadRegister()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to record cash in.',
        variant: 'destructive',
      })
    }
  }

  const handleCashOut = async () => {
    if (!register) return

    try {
      const amount = parseFloat(cashOutAmount)
      if (isNaN(amount) || amount <= 0) {
        toast({
          title: 'Invalid Amount',
          description: 'Please enter a valid amount.',
          variant: 'destructive',
        })
        return
      }

      await cashRegisterService.addCashMovement(register.id, {
        type: 'CASH_OUT',
        amount,
        reason: cashOutReason || 'Cash Out',
      })

      toast({
        title: 'Success',
        description: 'Cash out recorded successfully.',
      })

      setCashOutAmount('')
      setCashOutReason('')
      loadRegister()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to record cash out.',
        variant: 'destructive',
      })
    }
  }

  const expectedBalance = register?.currentBalance || 0
  const countedClosingAmount = parseFloat(closeAmount || '0')
  const closingDifference = Number.isFinite(countedClosingAmount) ? countedClosingAmount - expectedBalance : 0
  const netCashMovement = (register?.cashIn || 0) - (register?.cashOut || 0)
  const recentRegisters = useMemo(() => allRegisters.slice(0, 8), [allRegisters])
  const quickAmounts = [5, 10, 20, 50, 100]

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('cashRegister')}</h1>
          <p className="text-muted-foreground">{t('cashRegisterTrackDescription')}</p>
        </div>
        <div className="flex items-center gap-2">
          <EntityExportButton entity="cash_register" />
          <Button variant="outline" onClick={loadRegister}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            {t('refresh')}
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <History className="mr-2 h-4 w-4" />
                {t('registerHistory')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>{t('registerHistory')}</DialogTitle>
                <DialogDescription>{t('reviewRecentRegisterSessions')}</DialogDescription>
              </DialogHeader>
              <ScrollArea className="h-[420px] pr-4">
                <div className="space-y-3">
                  {recentRegisters.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                      {t('noRegisterSessionsYet')}
                    </div>
                  ) : (
                    recentRegisters.map((item) => (
                      <div key={item.id} className="rounded-xl border p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">
                                {item.openedAt ? formatDateTime(item.openedAt) : t('session')}
                              </p>
                              <Badge variant={item.status === 'OPEN' ? 'default' : 'secondary'}>{item.status}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {t('openedBy')} {item.openedBy?.fullName || 'Unknown'}{item.closedBy?.fullName ? ` · Closed by ${item.closedBy.fullName}` : ''}
                            </p>
                          </div>
                          <div className="text-right text-sm">
                            <p className="font-medium">{formatCurrency(item.currentBalance || 0)}</p>
                            <p className="text-muted-foreground">{t('currentBalance')}</p>
                          </div>
                        </div>
                        <div className="mt-3 grid gap-2 text-sm md:grid-cols-4">
                          <div className="rounded-lg bg-muted/40 px-3 py-2">
                            <p className="text-muted-foreground">{t('opening')}</p>
                            <p className="font-medium">{formatCurrency(item.openingAmount || 0)}</p>
                          </div>
                          <div className="rounded-lg bg-muted/40 px-3 py-2">
                            <p className="text-muted-foreground">{t('sales')}</p>
                            <p className="font-medium">{formatCurrency(item.totalSales || 0)}</p>
                          </div>
                          <div className="rounded-lg bg-muted/40 px-3 py-2">
                            <p className="text-muted-foreground">{t('refunds')}</p>
                            <p className="font-medium">{formatCurrency(item.totalRefunds || 0)}</p>
                          </div>
                          <div className="rounded-lg bg-muted/40 px-3 py-2">
                            <p className="text-muted-foreground">{t('difference')}</p>
                            <p className="font-medium">{formatCurrency(item.difference || 0)}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {!register ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center space-y-4 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-semibold">{t('noActiveRegisterSession')}</h3>
              <p className="max-w-md text-sm text-muted-foreground">
                {t('openRegisterDescription')}
              </p>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Play className="mr-2 h-4 w-4" />
                  {t('openRegister')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('openCashRegister')}</DialogTitle>
                  <DialogDescription>{t('startNewShift')}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="openingAmount">{t('openingAmount')}</Label>
                    <Input
                      id="openingAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={openAmount}
                      onChange={(e) => setOpenAmount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="openingNotes">{t('notes')}</Label>
                    <Textarea
                      id="openingNotes"
                      placeholder={t('optionalShiftNotes')}
                      value={openNotes}
                      onChange={(e) => setOpenNotes(e.target.value)}
                      className="min-h-[88px] resize-none"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleOpenRegister}>{t('openRegister')}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="rounded-2xl border bg-card p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold">{t('activeSession')}</h2>
                  <Badge>OPEN</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('startedByUser', {
                    date: register?.openedAt ? formatDateTime(register.openedAt) : 'N/A',
                    name: register.openedBy?.fullName || 'Unknown user',
                  })}
                </p>
                {register.notes && <p className="text-sm text-muted-foreground">{register.notes}</p>}
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="destructive">
                    <Square className="mr-2 h-4 w-4" />
                    {t('closeRegister')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('closeCashRegister')}</DialogTitle>
                    <DialogDescription>{t('countDrawerBeforeClosing')}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="grid gap-3 rounded-xl border bg-muted/20 p-4 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{t('expectedBalance')}</span>
                        <span className="font-semibold">{formatCurrency(expectedBalance)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{t('differencePreview')}</span>
                        <span className={`font-semibold ${closingDifference === 0 ? '' : closingDifference > 0 ? 'text-green-600' : 'text-destructive'}`}>
                          {formatCurrency(closingDifference)}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="closingAmount">{t('countedAmount')}</Label>
                      <Input
                        id="closingAmount"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={closeAmount}
                        onChange={(e) => setCloseAmount(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="closingNotes">{t('closingNotes')}</Label>
                      <Textarea
                        id="closingNotes"
                        placeholder={t('optionalClosingNotes')}
                        value={closeNotes}
                        onChange={(e) => setCloseNotes(e.target.value)}
                        className="min-h-[88px] resize-none"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCloseAmount('')
                        setCloseNotes('')
                      }}
                    >
                      {t('cancel')}
                    </Button>
                    <Button variant="destructive" onClick={handleCloseRegister}>{t('closeRegister')}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t('currentBalance')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-semibold">{formatCurrency(register.currentBalance || 0)}</div>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{t('liveDrawerAmount')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t('sessionSales')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-semibold">{formatCurrency(register.totalSales || 0)}</div>
                  <ArrowDownLeft className="h-4 w-4 text-green-600" />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{t('completedSalesInSession')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t('netCashMovement')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{formatCurrency(netCashMovement)}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('cashIn')} {formatCurrency(register.cashIn || 0)} · {t('cashOut')} {formatCurrency(register.cashOut || 0)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t('refunds')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{formatCurrency(register.totalRefunds || 0)}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('manualMovementsCount', { count: cashMovements.length, suffix: cashMovements.length === 1 ? '' : 's' })}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <Card>
              <CardHeader>
                <CardTitle>{t('quickCashActions')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3 rounded-xl border p-4">
                    <div className="flex items-center gap-2">
                      <ArrowDownLeft className="h-4 w-4 text-green-600" />
                      <p className="font-medium">{t('cashIn')}</p>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {quickAmounts.map((amount) => (
                        <Button key={`in-${amount}`} type="button" variant="outline" className="h-8 px-2 text-xs" onClick={() => setCashInAmount(String(amount))}>
                          {amount}
                        </Button>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cashIn">{t('amount')}</Label>
                      <Input
                        id="cashIn"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={cashInAmount}
                        onChange={(e) => setCashInAmount(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cashInReason">{t('reason')}</Label>
                      <Input
                        id="cashInReason"
                        placeholder={t('cashInPlaceholder')}
                        value={cashInReason}
                        onChange={(e) => setCashInReason(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleCashIn} className="w-full" disabled={!cashInAmount}>
                      {t('recordCashIn')}
                    </Button>
                  </div>

                  <div className="space-y-3 rounded-xl border p-4">
                    <div className="flex items-center gap-2">
                      <ArrowUpRight className="h-4 w-4 text-destructive" />
                      <p className="font-medium">{t('cashOut')}</p>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {quickAmounts.map((amount) => (
                        <Button key={`out-${amount}`} type="button" variant="outline" className="h-8 px-2 text-xs" onClick={() => setCashOutAmount(String(amount))}>
                          {amount}
                        </Button>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cashOut">{t('amount')}</Label>
                      <Input
                        id="cashOut"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={cashOutAmount}
                        onChange={(e) => setCashOutAmount(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cashOutReason">{t('reason')}</Label>
                      <Input
                        id="cashOutReason"
                        placeholder={t('cashOutPlaceholder')}
                        value={cashOutReason}
                        onChange={(e) => setCashOutReason(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleCashOut} variant="outline" className="w-full" disabled={!cashOutAmount}>
                      {t('recordCashOut')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('sessionDetails')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 rounded-xl border bg-muted/20 p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('status')}</span>
                    <Badge>Open</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('openedBy')}</span>
                    <span className="font-medium">{register.openedBy?.fullName || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('openedAt')}</span>
                    <span className="font-medium">{register?.openedAt ? formatDateTime(register.openedAt) : 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('openingAmount')}</span>
                    <span className="font-medium">{formatCurrency(register.openingAmount || 0)}</span>
                  </div>
                </div>

                <div className="grid gap-3 text-sm">
                  <div className="rounded-xl border px-3 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t('cashInTotal')}</span>
                      <span className="font-medium text-green-600">{formatCurrency(register.cashIn || 0)}</span>
                    </div>
                  </div>
                  <div className="rounded-xl border px-3 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t('cashOutTotal')}</span>
                      <span className="font-medium text-destructive">{formatCurrency(register.cashOut || 0)}</span>
                    </div>
                  </div>
                  <div className="rounded-xl border px-3 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t('expectedClose')}</span>
                      <span className="font-medium">{formatCurrency(expectedBalance)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('recentCashMovements')}</CardTitle>
            </CardHeader>
            <CardContent>
              {cashMovements.length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  {t('noManualCashMovements')}
                </div>
              ) : (
                <div className="space-y-2">
                  {cashMovements.slice(0, 8).map((movement) => (
                    <div key={movement.id} className="flex items-center justify-between rounded-xl border px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-full ${movement.type === 'CASH_IN' ? 'bg-green-500/10 text-green-600' : 'bg-destructive/10 text-destructive'}`}>
                          {movement.type === 'CASH_IN' ? (
                            <ArrowDownLeft className="h-4 w-4" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{movement.reason}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(movement.createdAt)}
                          </p>
                        </div>
                      </div>
                      <p className={`font-medium ${movement.type === 'CASH_IN' ? 'text-green-600' : 'text-destructive'}`}>
                        {movement.type === 'CASH_IN' ? '+' : '-'}{formatCurrency(movement.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
