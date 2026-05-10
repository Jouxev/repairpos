import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DollarSign, ArrowDownLeft, ArrowUpRight, History, Loader2, Play, Square } from 'lucide-react'
import { cashRegisterService, CashRegister, CashMovement } from '@/services/cashRegisterService'
import { useToast } from '@/hooks/use-toast'
import { useAuthStore } from '@/stores/authStore'

export default function CashRegisterPage() {
  const { toast } = useToast()
  const { user } = useAuthStore()
  const [register, setRegister] = useState<CashRegister | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [cashMovements, setCashMovements] = useState<CashMovement[]>([])
  
  // Form states
  const [openAmount, setOpenAmount] = useState('')
  const [closeAmount, setCloseAmount] = useState('')
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
      const openRegister = await cashRegisterService.getOpenRegister()
      setRegister(openRegister)
      if (openRegister?.cashMovements) {
        setCashMovements(openRegister.cashMovements)
      }
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
      })

      toast({
        title: 'Success',
        description: 'Register opened successfully.',
      })

      setOpenAmount('')
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
      })

      toast({
        title: 'Success',
        description: 'Register closed successfully.',
      })

      setCloseAmount('')
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cash Register</h1>
        <p className="text-muted-foreground">Manage cash flow and register operations</p>
      </div>

      {!register ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Play className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold">No Register Open</h3>
                <p className="text-sm text-muted-foreground">
                  You need to open a cash register to start accepting payments.
                </p>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Play className="mr-2 h-4 w-4" />
                    Open Register
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Open Cash Register</DialogTitle>
                    <DialogDescription>
                      Enter the opening cash amount to start the register.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="openingAmount">Opening Amount ($)</Label>
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
                  </div>
                  <DialogFooter>
                    <Button onClick={handleOpenRegister}>Open Register</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${register.currentBalance?.toFixed(2) || '0.00'}</div>
                <p className="text-xs text-muted-foreground">In register</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                <ArrowDownLeft className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${register.totalSales?.toFixed(2) || '0.00'}</div>
                <p className="text-xs text-muted-foreground">This session</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cash Movement</CardTitle>
                <ArrowUpRight className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${((register.cashIn || 0) - (register.cashOut || 0)).toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  In: ${register.cashIn?.toFixed(2) || '0.00'} / Out: ${register.cashOut?.toFixed(2) || '0.00'}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cashIn">Cash In Amount ($)</Label>
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
                    <Label htmlFor="cashInReason">Reason</Label>
                    <Input
                      id="cashInReason"
                      placeholder="Enter reason"
                      value={cashInReason}
                      onChange={(e) => setCashInReason(e.target.value)}
                    />
                  </div>
                </div>
                <Button onClick={handleCashIn} className="w-full" disabled={!cashInAmount}>
                  <ArrowDownLeft className="mr-2 h-4 w-4" />
                  Record Cash In
                </Button>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="cashOut">Cash Out Amount ($)</Label>
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
                    <Label htmlFor="cashOutReason">Reason</Label>
                    <Input
                      id="cashOutReason"
                      placeholder="Enter reason"
                      value={cashOutReason}
                      onChange={(e) => setCashOutReason(e.target.value)}
                    />
                  </div>
                </div>
                <Button onClick={handleCashOut} variant="outline" className="w-full" disabled={!cashOutAmount}>
                  <ArrowUpRight className="mr-2 h-4 w-4" />
                  Record Cash Out
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Register Control</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="text-lg font-semibold text-green-600">Open</p>
                  <p className="text-xs text-muted-foreground">
                    Opened: {register?.openedAt ? new Date(register.openedAt).toLocaleString() : 'N/A'}
                  </p>
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                      <Square className="mr-2 h-4 w-4" />
                      Close Register
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Close Cash Register</DialogTitle>
                      <DialogDescription>
                        Enter the closing cash amount to close the register.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="rounded-lg bg-muted p-4">
                        <p className="text-sm text-muted-foreground">Expected Balance</p>
                        <p className="text-2xl font-bold">${register?.currentBalance?.toFixed(2) || '0.00'}</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="closingAmount">Closing Amount ($)</Label>
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
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setCloseAmount('')}>Cancel</Button>
                      <Button variant="destructive" onClick={handleCloseRegister}>Close Register</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Button variant="outline" className="w-full">
                  <History className="mr-2 h-4 w-4" />
                  View History
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Recent Cash Movements */}
          {cashMovements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Cash Movements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {cashMovements.slice(0, 5).map((movement) => (
                    <div key={movement.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-2">
                        {movement.type === 'CASH_IN' ? (
                          <ArrowDownLeft className="h-4 w-4 text-green-600" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4 text-red-600" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{movement.reason}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(movement.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <p className={`font-medium ${movement.type === 'CASH_IN' ? 'text-green-600' : 'text-red-600'}`}>
                        {movement.type === 'CASH_IN' ? '+' : '-'}${movement.amount.toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
