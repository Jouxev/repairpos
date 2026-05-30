import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, User, Phone, Mail, MapPin, Search, Printer } from 'lucide-react'
import CustomerSearch from '@/components/CustomerSearch'
import { Client } from '@/services/clientService'
import { repairService } from '@/services/repairService'
import { buildRepairTicketDocument, executePreparedPrintDocument, PreparedPrintDocument } from '@/services/printHelper'
import { useToast } from '@/hooks/use-toast'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { brands } from '@/lib/brands'

export default function NewRepair() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { t } = useAppSettings()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Client | null>(null)
  const [shouldPrintTicket, setShouldPrintTicket] = useState(true)
  const [isTicketPreviewOpen, setIsTicketPreviewOpen] = useState(false)
  const [ticketPreviewDocument, setTicketPreviewDocument] = useState<PreparedPrintDocument | null>(null)
  const [isPrintingTicket, setIsPrintingTicket] = useState(false)
  const [redirectAfterPreviewClose, setRedirectAfterPreviewClose] = useState(false)


  // Form state
  const [formData, setFormData] = useState({
    deviceType: 'phone',
    brand: '',
    model: '',
    imei: '',
    devicePassword: '',
    problem: '',
    repairCost: '',
    prepayment: '',
    accessories: '',
    notes: ''
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedCustomer) {
      toast({
        title: t('error'),
        description: t('selectCustomer'),
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)

    try {
      // TODO: Implement actual repair creation API call
      const repairData = {
        clientId: selectedCustomer.id,
        deviceName: formData.model,
        deviceBrand: formData.brand,
        deviceModel: formData.model,
        deviceIMEI: formData.imei,
        devicePassword: formData.devicePassword,
        problemDescription: formData.problem,
        repairCost: parseFloat(formData.repairCost) || 0,
        prepayment: parseFloat(formData.prepayment) || 0,
        accessoriesReceived: formData.accessories,
        technicianNotes: formData.notes,
      }

      console.log('Creating repair:', repairData)

      // Call the actual API to create the repair
      const createdRepair = await repairService.createRepair(repairData)

      if (shouldPrintTicket) {
        try {
          const previewDocument = await buildRepairTicketDocument({
            shopName: '',
            ticketNumber: createdRepair.ticketNumber,
            date: new Date(createdRepair.receivedAt || new Date()).toLocaleDateString(),
            time: new Date(createdRepair.receivedAt || new Date()).toLocaleTimeString(),
            customerName: selectedCustomer.fullName,
            customerPhone: selectedCustomer.phone,
            customerEmail: selectedCustomer.email,
            customerAddress: selectedCustomer.address,
            deviceType: formData.deviceType || t('deviceType'),
            deviceBrand: createdRepair.deviceBrand,
            deviceModel: createdRepair.deviceModel,
            imei: createdRepair.deviceIMEI,
            serialNumber: createdRepair.deviceSerial,
            problemDescription: createdRepair.problemDescription,
            estimatedCost: createdRepair.repairCost,
            prepayment: createdRepair.prepayment,
            balanceDue: createdRepair.dueAmount,
            technicianName: createdRepair.technician?.fullName,
            notes: createdRepair.technicianNotes,
            terms: t('reviewRepairTicketBeforePrint'),
          })
          setTicketPreviewDocument(previewDocument)
          setRedirectAfterPreviewClose(true)
          setIsTicketPreviewOpen(true)
        } catch (printError) {
          console.error('Error preparing repair ticket preview:', printError)
          toast({
            title: t('notifications'),
            description: t('repairTicketPreview'),
            variant: 'destructive',
          })
          navigate('/repairs')
        }
      } else {
        navigate('/repairs')
      }

      toast({
        title: t('setupCompleted'),
        description: t('createRepairTicket'),
      })
    } catch (error) {
      console.error('Error creating repair:', error)
      toast({
        title: t('failedToSaveShopSettings'),
        description: t('createRepairTicket'),
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePrintPreview = async () => {
    if (!ticketPreviewDocument) {
      return
    }

    try {
      setIsPrintingTicket(true)
      await executePreparedPrintDocument(ticketPreviewDocument)
      toast({
        title: t('setupCompleted'),
        description: t('printTicket'),
      })
    } catch (error) {
      console.error('Error printing repair ticket:', error)
      toast({
        title: t('failedToSaveShopSettings'),
        description: t('printTicket'),
        variant: 'destructive',
      })
    } finally {
      setIsPrintingTicket(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/repairs')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('newRepairTicket')}</h1>
          <p className="text-muted-foreground">{t('createRepairTicketForCustomer')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Customer Selection Card */}
          <Card>
            <CardHeader>
              <CardTitle>{t('customerInformation')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedCustomer ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 border rounded-lg bg-muted/50">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-lg">{selectedCustomer.fullName}</p>
                      <div className="flex flex-col gap-1 mt-2 text-sm text-muted-foreground">
                        {selectedCustomer.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {selectedCustomer.phone}
                          </span>
                        )}
                        {selectedCustomer.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {selectedCustomer.email}
                          </span>
                        )}
                        {selectedCustomer.address && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {selectedCustomer.address}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <CustomerSearch onSelect={setSelectedCustomer}>
                    <Button variant="outline" className="w-full">
                      {t('changeCustomer')}
                    </Button>
                  </CustomerSearch>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    <User className="h-12 w-12 mb-2" />
                    <p>{t('noCustomerSelected')}</p>
                    <p className="text-sm">{t('searchExistingCustomerOrCreateNew')}</p>
                  </div>
                  <CustomerSearch onSelect={setSelectedCustomer}>
                    <Button className="w-full">
                      <Search className="mr-2 h-4 w-4" />
                      {t('searchCustomer')}
                    </Button>
                  </CustomerSearch>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Device Information Card */}
          <Card>
            <CardHeader>
              <CardTitle>{t('deviceInformation')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="deviceType">{t('deviceType')}</Label>
                  <Select
                    required
                    value={formData.deviceType}
                    onValueChange={(value) => handleInputChange('deviceType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectType')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="phone">Smartphone</SelectItem>
                      <SelectItem value="tablet">Tablet</SelectItem>
                      <SelectItem value="laptop">Laptop</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand">{t('brand')}</Label>
                  <Select
                    required
                    value={formData.brand}
                    onValueChange={(value) => handleInputChange('brand', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectBrand')} />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.deviceType === 'phone' && brands.phone.map((brand) => (
                        <SelectItem
                          key={brand}
                          value={brand.toLowerCase().replace(/\s+/g, "-")}
                        >
                          {brand}
                        </SelectItem>
                      ))}
                      {formData.deviceType === 'tablet' && brands.tablet.map((brand) => (
                        <SelectItem
                          key={brand}
                          value={brand.toLowerCase().replace(/\s+/g, "-")}
                        >
                          {brand}
                        </SelectItem>
                      ))}
                        {formData.deviceType === 'laptop' && brands.laptop.map((brand) => (
                        <SelectItem
                          key={brand}
                          value={brand.toLowerCase().replace(/\s+/g, "-")}
                        >
                          {brand}
                        </SelectItem>
                      ))}
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">{t('model')}</Label>
                <Input
                  id="model"
                  placeholder="e.g., iPhone 13 Pro"
                  required
                  value={formData.model}
                  onChange={(e) => handleInputChange('model', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="imei">{t('imeiSerialOptional')}</Label>
                <Input
                  id="imei"
                  placeholder={t('enterImeiOrSerial')}
                  value={formData.imei}
                  onChange={(e) => handleInputChange('imei', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="devicePassword">{t('devicePasswordOptional')}</Label>
                <Input
                  id="devicePassword"
                  type="password"
                  placeholder={t('ifNeededForTesting')}
                  value={formData.devicePassword}
                  onChange={(e) => handleInputChange('devicePassword', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{t('problemDescription')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="problem">{t('describeProblem')}</Label>
              <Textarea
                id="problem"
                placeholder={t('describeIssueDetail')}
                className="min-h-[100px]"
                required
                value={formData.problem}
                onChange={(e) => handleInputChange('problem', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="repairCost">{t('estimatedRepairCost')}</Label>
                <Input
                  id="repairCost"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  required
                  value={formData.repairCost}
                  onChange={(e) => handleInputChange('repairCost', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prepayment">{t('prepaymentOptional')}</Label>
                <Input
                  id="prepayment"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.prepayment}
                  onChange={(e) => handleInputChange('prepayment', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="accessories">{t('accessoriesReceivedOptional')}</Label>
              <Input
                id="accessories"
                placeholder={t('accessoriesExample')}
                value={formData.accessories}
                onChange={(e) => handleInputChange('accessories', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">{t('internalNotesOptional')}</Label>
              <Textarea
                id="notes"
                placeholder={t('additionalNotesForTechnicians')}
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Button type="button" variant="outline" onClick={() => navigate('/repairs')}>
            {t('cancel')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShouldPrintTicket((current) => !current)}
          >
            <Printer className="mr-2 h-4 w-4" />
            {shouldPrintTicket ? t('printingEnabled') : t('printingDisabled')}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('saving') : shouldPrintTicket ? t('createAndPrintTicket') : t('createRepairTicket')}
          </Button>
        </div>
      </form>
      <Dialog
        open={isTicketPreviewOpen}
        onOpenChange={(open) => {
          setIsTicketPreviewOpen(open)
          if (!open && redirectAfterPreviewClose) {
            navigate('/repairs')
          }
        }}
      >
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{t('repairTicketPreview')}</DialogTitle>
            <DialogDescription>{t('reviewRepairTicketBeforePrint')}</DialogDescription>
          </DialogHeader>
          <iframe
            title="Repair Ticket Preview"
            srcDoc={ticketPreviewDocument?.html || ''}
            className="h-[70vh] w-full rounded-xl border bg-white"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTicketPreviewOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handlePrintPreview} disabled={!ticketPreviewDocument || isPrintingTicket}>
              <Printer className="mr-2 h-4 w-4" />
              {isPrintingTicket ? t('printing') : t('printTicket')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
