import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowLeft,
  Edit,
  Phone,
  Mail,
  MapPin,
  Wallet,
  Loader2,
  Receipt,
  Wrench,
  Clock3,
  Printer,
  CalendarDays,
} from 'lucide-react'
import { toast } from 'sonner'
import { clientService, Client } from '@/services/clientService'
import { salesService, Sale } from '@/services/salesService'
import { repairService, Repair } from '@/services/repairService'
import {
  buildPaymentVoucherDocument,
  executePreparedPrintDocument,
  PreparedPrintDocument,
} from '@/services/printHelper'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { useLocaleFormatters } from '@/hooks/useLocaleFormatters'

type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'check' | 'digital_wallet'

const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: 'Cash',
  card: 'Card',
  bank_transfer: 'Bank Transfer',
  check: 'Check',
  digital_wallet: 'Digital Wallet',
}

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useAppSettings()
  const { formatCurrency, formatDate } = useLocaleFormatters()
  const [client, setClient] = useState<Client | null>(null)
  const [sales, setSales] = useState<Sale[]>([])
  const [repairs, setRepairs] = useState<Repair[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [paymentPreviewDocument, setPaymentPreviewDocument] = useState<PreparedPrintDocument | null>(null)
  const [isPaymentPreviewOpen, setIsPaymentPreviewOpen] = useState(false)
  const [isPrintingVoucher, setIsPrintingVoucher] = useState(false)

  useEffect(() => {
    if (!id) {
      return
    }
    loadClientDetail(id)
  }, [id])

  const loadClientDetail = async (clientId: string) => {
    try {
      setIsLoading(true)
      const [clientData, salesData, repairsData] = await Promise.all([
        clientService.getClientById(clientId),
        salesService.getSales({ customerId: clientId }),
        repairService.getRepairs({ clientId }),
      ])

      setClient(clientData)
      setSales(Array.isArray(salesData) ? salesData : [])
      setRepairs(Array.isArray(repairsData) ? repairsData : [])
    } catch (error: any) {
      toast.error(`${t('failedToLoadClient')}: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const totals = useMemo(() => {
    const totalSales = sales.reduce((sum, sale) => sum + (sale.total || 0), 0)
    const totalSalesPaid = sales.reduce((sum, sale) => sum + (sale.paidAmount || 0), 0)
    const totalSalesDue = sales.reduce((sum, sale) => sum + Math.max(0, sale.dueAmount || 0), 0)
    const totalRepairs = repairs.reduce((sum, repair) => sum + (repair.repairCost || 0), 0)
    const totalRepairPaid = repairs.reduce((sum, repair) => sum + (repair.prepayment || 0), 0)
    const totalRepairDue = repairs.reduce((sum, repair) => sum + Math.max(0, repair.dueAmount || 0), 0)

    return {
      totalSales,
      totalSalesPaid,
      totalSalesDue,
      totalRepairs,
      totalRepairPaid,
      totalRepairDue,
      realOutstanding: totalSalesDue + totalRepairDue,
      totalDocuments: sales.length + repairs.length,
    }
  }, [sales, repairs])

  const recentActivity = useMemo(() => {
    const saleActivity = sales.map((sale) => ({
      id: sale.id,
      type: 'sale' as const,
      title: sale.invoiceNumber,
      subtitle: sale.customerName || t('customerInformation'),
      amount: sale.total,
      due: sale.dueAmount,
      date: new Date(sale.saleDate),
      status: sale.paymentStatus,
    }))

    const repairActivity = repairs.map((repair) => ({
      id: repair.id,
      type: 'repair' as const,
      title: repair.ticketNumber,
      subtitle: `${repair.deviceBrand} ${repair.deviceModel}`.trim(),
      amount: repair.repairCost,
      due: repair.dueAmount,
      date: new Date(repair.receivedAt),
      status: repair.status,
    }))

    return [...saleActivity, ...repairActivity]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 6)
  }, [sales, repairs])

  const resetPaymentForm = () => {
    setPaymentAmount('')
    setPaymentMethod('cash')
    setPaymentNotes('')
  }

  const handleRecordVersement = async () => {
    if (!client) {
      return
    }

    const amount = Number(paymentAmount)
    if (!amount || amount <= 0) {
      toast.error(t('enterVersementAmount'))
      return
    }

    try {
      setIsSubmittingPayment(true)
      await clientService.addPayment(client.id, {
        amount,
        paymentMethod,
        notes: paymentNotes || undefined,
        date: new Date(),
      })

      const preview = await buildPaymentVoucherDocument(
        {
          reference: `PAY-IN-${Date.now()}`,
          date: new Date().toLocaleDateString(),
          amount,
          method: paymentMethodLabels[paymentMethod],
          notes: paymentNotes || undefined,
          direction: 'IN',
          customerName: client.fullName,
          customerPhone: client.phone,
          customerEmail: client.email,
        },
        'PAYMENT_IN',
      )

      setPaymentPreviewDocument(preview)
      setIsPaymentPreviewOpen(true)
      setIsPaymentDialogOpen(false)
      resetPaymentForm()
      await loadClientDetail(client.id)
      toast.success(t('saveVersement'))
    } catch (error: any) {
      toast.error(`${t('saveVersement')}: ${error.message}`)
    } finally {
      setIsSubmittingPayment(false)
    }
  }

  const handlePrintVoucher = async () => {
    if (!paymentPreviewDocument) {
      return
    }

    try {
      setIsPrintingVoucher(true)
      await executePreparedPrintDocument(paymentPreviewDocument)
      toast.success(t('printVoucher'))
    } catch (error: any) {
      toast.error(`${t('printVoucher')}: ${error.message}`)
    } finally {
      setIsPrintingVoucher(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => navigate('/clients')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('backToClients')}
        </Button>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {t('clientNotFound')}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/clients')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{client.fullName}</h1>
              <Badge variant={client.isActive ? 'default' : 'secondary'}>
                {client.isActive ? t('activeClient') : t('inactiveClient')}
              </Badge>
              {totals.realOutstanding > 0 && (
                <Badge variant="destructive">
                  {t('openDue')} {formatCurrency(totals.realOutstanding)}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              {t('customerSince', { date: formatDate(client.createdAt), sales: sales.length, repairs: repairs.length })}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setIsPaymentDialogOpen(true)}>
            <Wallet className="mr-2 h-4 w-4" />
            {t('clientPayment')}
          </Button>
          <Button onClick={() => navigate(`/clients/${client.id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            {t('editClient')}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('accountBalance')}</CardDescription>
            <CardTitle>{formatCurrency(client.balance || 0)}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {t('storedClientBalance')}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('openSalesDue')}</CardDescription>
            <CardTitle>{formatCurrency(totals.totalSalesDue)}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Based on saved sales paid and due amounts.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('openRepairsDue')}</CardDescription>
            <CardTitle>{formatCurrency(totals.totalRepairDue)}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Based on repair prepayment and remaining due amount.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('loyaltyPoints')}</CardDescription>
            <CardTitle>{client.loyaltyPoints || 0}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {t('currentLoyaltyPoints')}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto">
          <TabsTrigger value="overview">{t('overview')}</TabsTrigger>
          <TabsTrigger value="sales">{t('sales')}</TabsTrigger>
          <TabsTrigger value="repairs">{t('repairs')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <CardHeader>
                <CardTitle>{t('contactInformation')}</CardTitle>
                <CardDescription>{t('realCustomerProfile')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t('phone')}</p>
                    <p className="font-medium">{client.phone || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t('email')}</p>
                    <p className="font-medium">{client.email || '-'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t('address')}</p>
                    <p className="font-medium">{client.address || '-'}</p>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">{t('notes')}</p>
                  <p className="mt-1 text-sm">{client.notes || t('notesForClient')}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('commercialSnapshot')}</CardTitle>
                <CardDescription>{t('aggregatedTotals')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('salesTurnover')}</span>
                  <span className="font-medium">{formatCurrency(totals.totalSales)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('salesPaid')}</span>
                  <span className="font-medium text-green-600">{formatCurrency(totals.totalSalesPaid)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('repairRevenue')}</span>
                  <span className="font-medium">{formatCurrency(totals.totalRepairs)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('repairPrepayments')}</span>
                  <span className="font-medium text-green-600">{formatCurrency(totals.totalRepairPaid)}</span>
                </div>
                <Separator />
                <div className="rounded-lg border border-dashed p-3 text-sm">
                  <p className="font-medium">{t('outstandingSnapshot')}</p>
                  <p className="mt-1 text-muted-foreground">
                    {t('realOpenDue', { amount: formatCurrency(totals.realOutstanding) })}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {t('storedAccountBalanceText', { amount: formatCurrency(client.balance || 0) })}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('recentActivityTitle')}</CardTitle>
              <CardDescription>{t('latestClientRecords')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('noClientActivity')}</p>
              ) : (
                recentActivity.map((activity) => (
                  <div
                    key={`${activity.type}-${activity.id}`}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-primary/10 p-2 text-primary">
                        {activity.type === 'sale' ? <Receipt className="h-4 w-4" /> : <Wrench className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="font-medium">{activity.title}</p>
                        <p className="text-sm text-muted-foreground">{activity.subtitle}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(activity.amount)}</p>
                      <p className="text-sm text-muted-foreground">
                        {t('due')} {formatCurrency(activity.due)} • {formatDate(activity.date)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <CardTitle>{t('salesHistory')}</CardTitle>
              <CardDescription>{t('latestSalesSelectedPeriod')}</CardDescription>
            </CardHeader>
            <CardContent>
              {sales.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('noSalesForClient')}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('invoiceNumber')}</TableHead>
                      <TableHead>{t('date')}</TableHead>
                      <TableHead>{t('status')}</TableHead>
                      <TableHead className="text-right">{t('total')}</TableHead>
                      <TableHead className="text-right">{t('paid')}</TableHead>
                      <TableHead className="text-right">{t('due')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.map((sale) => (
                      <TableRow
                        key={sale.id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/sales/edit/${sale.id}`)}
                      >
                        <TableCell className="font-medium">{sale.invoiceNumber}</TableCell>
                        <TableCell>{formatDate(sale.saleDate)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary">{sale.status}</Badge>
                            <Badge variant={sale.dueAmount > 0 ? 'destructive' : 'default'}>
                              {sale.paymentStatus}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(sale.total)}</TableCell>
                        <TableCell className="text-right text-green-600">{formatCurrency(sale.paidAmount)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(sale.dueAmount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="repairs">
          <Card>
            <CardHeader>
              <CardTitle>{t('repairHistory')}</CardTitle>
              <CardDescription>{t('latestRepairTicketsAndStatus')}</CardDescription>
            </CardHeader>
            <CardContent>
              {repairs.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('noRepairsForClient')}</p>
              ) : (
                <div className="space-y-3">
                  {repairs.map((repair) => (
                    <div
                      key={repair.id}
                      className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent"
                      onClick={() => navigate(`/repairs/${repair.id}`)}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{repair.ticketNumber}</p>
                          <Badge variant="secondary">{repair.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {repair.deviceBrand} {repair.deviceModel} • {t('date')} {formatDate(repair.receivedAt)}
                        </p>
                        <p className="text-sm text-muted-foreground">{repair.problemDescription}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(repair.repairCost)}</p>
                        <p className="text-sm text-green-600">
                          {t('paid')} {formatCurrency(repair.prepayment)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t('due')} {formatCurrency(repair.dueAmount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('clientPayment')}</DialogTitle>
            <DialogDescription>
              {t('clientVersementDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/40 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('storedAccountBalanceShort')}</span>
                <span className="font-medium">{formatCurrency(client.balance || 0)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-muted-foreground">{t('realOutstandingDue')}</span>
                <span className="font-medium">{formatCurrency(totals.realOutstanding)}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-payment-amount">{t('amount')}</Label>
              <Input
                id="client-payment-amount"
                type="number"
                min="0"
                step="0.01"
                value={paymentAmount}
                onChange={(event) => setPaymentAmount(event.target.value)}
                placeholder={t('enterVersementAmount')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-payment-method">{t('paymentMethods')}</Label>
              <Select value={paymentMethod} onValueChange={(value: PaymentMethod) => setPaymentMethod(value)}>
                <SelectTrigger id="client-payment-method">
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
              <Label htmlFor="client-payment-notes">{t('notes')}</Label>
              <Textarea
                id="client-payment-notes"
                value={paymentNotes}
                onChange={(event) => setPaymentNotes(event.target.value)}
                placeholder={t('optionalNoteVersement')}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsPaymentDialogOpen(false)
                resetPaymentForm()
              }}
              disabled={isSubmittingPayment}
            >
              {t('cancel')}
            </Button>
            <Button onClick={handleRecordVersement} disabled={isSubmittingPayment}>
              {isSubmittingPayment ? t('saving') : t('saveVersement')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPaymentPreviewOpen} onOpenChange={setIsPaymentPreviewOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{paymentPreviewDocument?.title || t('clientVersementPreview')}</DialogTitle>
            <DialogDescription>
              {t('previewPaymentVoucher')}
            </DialogDescription>
          </DialogHeader>
          <iframe
            title="Client Versement Preview"
            srcDoc={paymentPreviewDocument?.html || ''}
            className="h-[70vh] w-full rounded-xl border bg-white"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentPreviewOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handlePrintVoucher} disabled={!paymentPreviewDocument || isPrintingVoucher}>
              <Printer className="mr-2 h-4 w-4" />
              {isPrintingVoucher ? t('printing') : t('printVoucher')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
