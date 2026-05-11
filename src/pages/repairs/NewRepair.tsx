import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, User, Phone, Mail, MapPin, Search } from 'lucide-react'
import CustomerSearch from '@/components/CustomerSearch'
import { Client } from '@/services/clientService'
import { repairService } from '@/services/repairService'
import { useToast } from '@/hooks/use-toast'

export default function NewRepair() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Client | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    deviceType: '',
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
        title: 'Error',
        description: 'Please select a customer',
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
      await repairService.createRepair(repairData)

      toast({
        title: 'Success',
        description: 'Repair ticket created successfully',
      })

      navigate('/repairs')
    } catch (error) {
      console.error('Error creating repair:', error)
      toast({
        title: 'Error',
        description: 'Failed to create repair ticket',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/repairs')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Repair Ticket</h1>
          <p className="text-muted-foreground">Create a new repair ticket for a customer</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Customer Selection Card */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
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
                      Change Customer
                    </Button>
                  </CustomerSearch>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    <User className="h-12 w-12 mb-2" />
                    <p>No customer selected</p>
                    <p className="text-sm">Search for an existing customer or create a new one</p>
                  </div>
                  <CustomerSearch onSelect={setSelectedCustomer}>
                    <Button className="w-full">
                      <Search className="mr-2 h-4 w-4" />
                      Search Customer
                    </Button>
                  </CustomerSearch>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Device Information Card */}
          <Card>
            <CardHeader>
              <CardTitle>Device Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="deviceType">Device Type</Label>
                  <Select 
                    required
                    value={formData.deviceType}
                    onValueChange={(value) => handleInputChange('deviceType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="smartphone">Smartphone</SelectItem>
                      <SelectItem value="tablet">Tablet</SelectItem>
                      <SelectItem value="laptop">Laptop</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand">Brand</Label>
                  <Select 
                    required
                    value={formData.brand}
                    onValueChange={(value) => handleInputChange('brand', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="apple">Apple</SelectItem>
                      <SelectItem value="samsung">Samsung</SelectItem>
                      <SelectItem value="google">Google</SelectItem>
                      <SelectItem value="xiaomi">Xiaomi</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input 
                  id="model" 
                  placeholder="e.g., iPhone 13 Pro" 
                  required 
                  value={formData.model}
                  onChange={(e) => handleInputChange('model', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="imei">IMEI/Serial (Optional)</Label>
                <Input 
                  id="imei" 
                  placeholder="Enter IMEI or serial number" 
                  value={formData.imei}
                  onChange={(e) => handleInputChange('imei', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="devicePassword">Device Password (Optional)</Label>
                <Input 
                  id="devicePassword" 
                  type="password" 
                  placeholder="If needed for testing" 
                  value={formData.devicePassword}
                  onChange={(e) => handleInputChange('devicePassword', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Problem Description</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="problem">Describe the problem</Label>
              <Textarea
                id="problem"
                placeholder="Describe the issue with the device in detail..."
                className="min-h-[100px]"
                required
                value={formData.problem}
                onChange={(e) => handleInputChange('problem', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="repairCost">Estimated Repair Cost</Label>
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
                <Label htmlFor="prepayment">Prepayment (Optional)</Label>
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
              <Label htmlFor="accessories">Accessories Received (Optional)</Label>
              <Input 
                id="accessories" 
                placeholder="e.g., Charger, Case, Screen Protector" 
                value={formData.accessories}
                onChange={(e) => handleInputChange('accessories', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Internal Notes (Optional)</Label>
              <Textarea 
                id="notes" 
                placeholder="Additional notes for technicians..." 
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Button type="button" variant="outline" onClick={() => navigate('/repairs')}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Repair Ticket'}
          </Button>
        </div>
      </form>
    </div>
  )
}
