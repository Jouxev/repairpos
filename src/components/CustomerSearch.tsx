import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, Plus, User, Phone, Mail, Loader2 } from 'lucide-react'
import { clientService, Client, CreateClientData } from '@/services/clientService'
import { useToast } from '@/hooks/use-toast'

interface CustomerSearchProps {
  onSelect: (customer: Client) => void
  selectedCustomer?: Client | null
  children?: React.ReactNode
}

export default function CustomerSearch({ onSelect, selectedCustomer, children }: CustomerSearchProps) {
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [customers, setCustomers] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  
  // New customer form state
  const [newCustomer, setNewCustomer] = useState<CreateClientData>({
    fullName: '',
    phone: '',
    email: '',
    address: '',
    notes: ''
  })
  const [isCreating, setIsCreating] = useState(false)

  // Load customers when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadCustomers()
    }
  }, [isOpen])

  // Search customers when query changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        searchCustomers()
      } else {
        loadCustomers()
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  const loadCustomers = async () => {
    try {
      setIsLoading(true)
      const data = await clientService.getClients()
      setCustomers(data)
    } catch (error) {
      console.error('Error loading customers:', error)
      toast({
        title: 'Error',
        description: 'Failed to load customers',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const searchCustomers = async () => {
    try {
      setIsLoading(true)
      const data = await clientService.getClients({ search: searchQuery })
      setCustomers(data)
    } catch (error) {
      console.error('Error searching customers:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectCustomer = (customer: Client) => {
    onSelect(customer)
    setIsOpen(false)
    setSearchQuery('')
    toast({
      title: 'Customer Selected',
      description: `${customer.fullName} has been selected`,
    })
  }

  const handleCreateCustomer = async () => {
    if (!newCustomer.fullName || !newCustomer.phone) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in at least name and phone number',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsCreating(true)
      const created = await clientService.createClient(newCustomer)
      
      toast({
        title: 'Success',
        description: 'New customer created successfully',
      })
      
      // Select the newly created customer
      handleSelectCustomer(created)
      
      // Reset form
      setNewCustomer({
        fullName: '',
        phone: '',
        email: '',
        address: '',
        notes: ''
      })
      setShowCreateForm(false)
    } catch (error) {
      console.error('Error creating customer:', error)
      toast({
        title: 'Error',
        description: 'Failed to create customer',
        variant: 'destructive',
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="w-full justify-start">
            <User className="mr-2 h-4 w-4" />
            {selectedCustomer ? selectedCustomer.fullName : 'Select Customer'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{showCreateForm ? 'Create New Customer' : 'Select Customer'}</span>
            {!showCreateForm && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCreateForm(true)}
              >
                <Plus className="mr-1 h-4 w-4" />
                New Customer
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {showCreateForm ? (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-name">Full Name *</Label>
                <Input
                  id="new-name"
                  value={newCustomer.fullName}
                  onChange={(e) => setNewCustomer({ ...newCustomer, fullName: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-phone">Phone *</Label>
                <Input
                  id="new-phone"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  placeholder="+1234567890"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-email">Email</Label>
              <Input
                id="new-email"
                type="email"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-address">Address</Label>
              <Input
                id="new-address"
                value={newCustomer.address}
                onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                placeholder="123 Main St, City"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-notes">Notes</Label>
              <Input
                id="new-notes"
                value={newCustomer.notes}
                onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowCreateForm(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateCustomer}
                disabled={isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Customer'
                )}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search customers by name, phone, or email..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <ScrollArea className="h-[300px] border rounded-md">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : customers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <User className="h-12 w-12 mb-2" />
                  <p>No customers found</p>
                  {searchQuery && (
                    <p className="text-sm">Try adjusting your search</p>
                  )}
                </div>
              ) : (
                <div className="divide-y">
                  {customers.map((customer) => (
                    <button
                      key={customer.id}
                      className="w-full px-4 py-3 flex items-start gap-3 hover:bg-accent transition-colors text-left"
                      onClick={() => handleSelectCustomer(customer)}
                    >
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{customer.fullName}</p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          {customer.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {customer.phone}
                            </span>
                          )}
                          {customer.email && (
                            <span className="flex items-center gap-1 truncate">
                              <Mail className="h-3 w-3" />
                              {customer.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
