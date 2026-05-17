import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Save, User } from 'lucide-react'
import { toast } from 'sonner'
import { clientService } from '@/services/clientService'

interface ClientFormData {
  fullName: string
  email: string
  phone: string
  address: string
  city: string
  notes: string
}

export default function NewClient() {
  const navigate = useNavigate()
  const { id } = useParams()
  const location = useLocation()
  const pathname = location.pathname
  const isEdit = pathname.includes('/edit') || (!!id && !pathname.includes('/new'))
  const clientId = id

  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingClient, setIsLoadingClient] = useState(false)
  const [formData, setFormData] = useState<ClientFormData>({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    notes: '',
  })

  // Load client data if in edit mode
  useEffect(() => {
    if (isEdit && clientId) {
      loadClient(clientId)
    }
  }, [isEdit, clientId])

  const loadClient = async (id: string) => {
    try {
      setIsLoadingClient(true)
      const client = await clientService.getClientById(id)
      if (client) {
        setFormData({
          fullName: client.fullName || '',
          email: client.email || '',
          phone: client.phone || '',
          address: client.address || '',
          city: client.city || '',
          notes: client.notes || '',
        })
      } else {
        toast.error('Client not found')
        navigate('/clients')
      }
    } catch (error) {
      console.error('Error loading client:', error)
      toast.error('Failed to load client')
    } finally {
      setIsLoadingClient(false)
    }
  }

  const handleChange = (field: keyof ClientFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.fullName.trim()) {
      toast.error('Client name is required')
      return
    }

    try {
      setIsLoading(true)

      if (isEdit && clientId) {
        // Update existing client
        await clientService.updateClient(clientId, {
          fullName: formData.fullName,
          phone: formData.phone,
          email: formData.email || undefined,
          address: formData.address,
          city: formData.city,
          notes: formData.notes,
        })
        toast.success('Client updated successfully')
      } else {
        // Create new client
        await clientService.createClient({
          fullName: formData.fullName,
          phone: formData.phone,
          email: formData.email || undefined,
          address: formData.address,
          city: formData.city,
          notes: formData.notes,
        })
        toast.success('Client created successfully')
      }
      navigate('/clients')
    } catch (error: any) {
      console.error('Error saving client:', error)
      toast.error('Failed to save client: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingClient) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading client...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEdit ? 'Edit Client' : 'New Client'}
          </h1>
          <p className="text-muted-foreground">
            {isEdit ? 'Update client information' : 'Add a new client to your database'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/clients')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Client Information
            </CardTitle>
            <CardDescription>Enter the client&apos;s contact details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName">Client Name *</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
                placeholder="Enter client name"
                required
              />
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="client@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+123 456 7890"
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Street address, building, floor..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                placeholder="City name"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Additional notes about the client..."
                rows={3}
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex items-center justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/clients')}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update Client' : 'Create Client')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}