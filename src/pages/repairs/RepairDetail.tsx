import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Wrench, 
  Clock, 
  CheckCircle, 
  XCircle,
  DollarSign,
  Package,
  Plus,
  Trash2,
  Edit3,
  Save,
  Loader2,
  History,
  FileText,
  Info,
  AlertTriangle
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { repairService, Repair, RepairPart } from '@/services/repairService'
import { productService, Product } from '@/services/productService'
import { userService, User as UserType } from '@/services/userService'
import { useAuthStore } from '@/stores/authStore'

// Status workflow
const statusWorkflow = {
  'PENDING': ['IN_PROGRESS', 'CANCELLED'],
  'IN_PROGRESS': ['COMPLETED', 'CANCELLED'],
  'COMPLETED': ['DELIVERED'],
  'DELIVERED': [],
  'CANCELLED': []
}

export default function RepairDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuthStore()
  
  const [repair, setRepair] = useState<Repair | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    deviceName: '',
    deviceBrand: '',
    deviceModel: '',
    deviceIMEI: '',
    problemDescription: '',
    repairCost: 0,
    prepayment: 0,
    priority: 'NORMAL' as const,
    accessoriesReceived: '',
    technicianNotes: ''
  })

  // Parts management
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [partQuantity, setPartQuantity] = useState(1)
  const [partUnitPrice, setPartUnitPrice] = useState(0)
  const [isAddingPart, setIsAddingPart] = useState(false)
  const [addPartTab, setAddPartTab] = useState<'database' | 'quick'>('database')
  
  // Quick add part form
  const [quickPartName, setQuickPartName] = useState('')
  const [quickPartCost, setQuickPartCost] = useState(0)

  // Technician assignment
  const [technicians, setTechnicians] = useState<UserType[]>([])
  const [selectedTechnician, setSelectedTechnician] = useState<UserType | null>(null)
  const [isAssigning, setIsAssigning] = useState(false)

  // Status update
  const [newStatus, setNewStatus] = useState('')
  const [statusNote, setStatusNote] = useState('')
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  useEffect(() => {
    if (id) {
      loadRepair()
      loadProducts()
      loadTechnicians()
    }
  }, [id])

  const loadRepair = async () => {
    try {
      setIsLoading(true)
      const data = await repairService.getRepairById(id!)
      setRepair(data)
      
      // Initialize edit form
      if (data) {
        setEditForm({
          deviceName: data.deviceName,
          deviceBrand: data.deviceBrand,
          deviceModel: data.deviceModel,
          deviceIMEI: data.deviceIMEI || '',
          problemDescription: data.problemDescription,
          repairCost: data.repairCost,
          prepayment: data.prepayment,
          priority: data.priority,
          accessoriesReceived: data.accessoriesReceived || '',
          technicianNotes: data.technicianNotes || ''
        })
      }
    } catch (error) {
      console.error('Error loading repair:', error)
      toast({
        title: 'Error',
        description: 'Failed to load repair details',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadProducts = async () => {
    try {
      const data = await productService.getProducts()
      setProducts(Array.isArray(data) ? data.data : [])
    } catch (error) {
      console.error('Error loading products:', error)
      setProducts([])
    }
  }

  const loadTechnicians = async () => {
    try {
      // Get all users and filter for technicians
      const users = await userService.getUsers()
      // Filter users with technician role or all active users
      const techs = users.filter(u => u.isActive && u.role !== 'ADMIN')
      setTechnicians(techs)
    } catch (error) {
      console.error('Error loading technicians:', error)
    }
  }

  const handleUpdateRepair = async () => {
    try {
      await repairService.updateRepair(id!, editForm)
      toast({
        title: 'Success',
        description: 'Repair updated successfully',
      })
      setIsEditing(false)
      loadRepair()
    } catch (error) {
      console.error('Error updating repair:', error)
      toast({
        title: 'Error',
        description: 'Failed to update repair',
        variant: 'destructive',
      })
    }
  }

  const handleAddPart = async () => {
    // Database tab: requires product selection
    if (addPartTab === 'database' && !selectedProduct) {
      toast({
        title: 'Error',
        description: 'Please select a product',
        variant: 'destructive',
      })
      return
    }

    // Quick tab: requires name
    if (addPartTab === 'quick' && !quickPartName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a part name',
        variant: 'destructive',
      })
      return
    }

    try {
      if (addPartTab === 'database' && selectedProduct) {
        // Database product selection
        await repairService.addPart(id!, {
          productId: selectedProduct.id,
          quantity: partQuantity,
          unitPrice: partUnitPrice
        })
      } else {
        // Quick manual entry - create part without product link
        await repairService.addPart(id!, {
          productId: '', // Empty for manual parts
          quantity: partQuantity,
          unitPrice: quickPartCost,
          notes: quickPartName // Store name in notes
        })
      }
      
      toast({
        title: 'Success',
        description: 'Part added successfully',
      })
      
      // Reset form
      setIsAddingPart(false)
      setSelectedProduct(null)
      setPartQuantity(1)
      setPartUnitPrice(0)
      setQuickPartName('')
      setQuickPartCost(0)
      setAddPartTab('database')
      loadRepair()
    } catch (error) {
      console.error('Error adding part:', error)
      toast({
        title: 'Error',
        description: 'Failed to add part',
        variant: 'destructive',
      })
    }
  }

  const handleRemovePart = async (partId: string) => {
    try {
      await repairService.removePart(id!, partId)
      toast({
        title: 'Success',
        description: 'Part removed successfully',
      })
      loadRepair()
    } catch (error) {
      console.error('Error removing part:', error)
      toast({
        title: 'Error',
        description: 'Failed to remove part',
        variant: 'destructive',
      })
    }
  }

  const handleAssignTechnician = async () => {
    if (!selectedTechnician) {
      toast({
        title: 'Error',
        description: 'Please select a technician',
        variant: 'destructive',
      })
      return
    }

    try {
      await repairService.updateRepair(id!, {
        technicianId: selectedTechnician.id
      })
      toast({
        title: 'Success',
        description: `Technician ${selectedTechnician.fullName} assigned successfully`,
      })
      setIsAssigning(false)
      setSelectedTechnician(null)
      loadRepair()
    } catch (error) {
      console.error('Error assigning technician:', error)
      toast({
        title: 'Error',
        description: 'Failed to assign technician',
        variant: 'destructive',
      })
    }
  }

  const handleStatusUpdate = async () => {
    if (!newStatus) {
      toast({
        title: 'Error',
        description: 'Please select a new status',
        variant: 'destructive',
      })
      return
    }

    try {
      await repairService.updateRepair(id!, {
        status: newStatus as any,
        technicianNotes: statusNote
      })
      toast({
        title: 'Success',
        description: `Status updated to ${newStatus}`,
      })
      setIsUpdatingStatus(false)
      setNewStatus('')
      setStatusNote('')
      loadRepair()
    } catch (error) {
      console.error('Error updating status:', error)
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      })
    }
  }

  const calculateProfit = () => {
    if (!repair) return { partsCost: 0, laborCost: 0, totalCost: 0, profit: 0, profitMargin: 0 }
    
    const partsCost = repair.parts?.reduce((sum, part) => sum + (part.unitPrice * part.quantity), 0) || 0
    const laborCost = repair.repairCost * 0.4 // Estimated 40% labor cost
    const totalCost = partsCost + laborCost
    const profit = repair.repairCost - totalCost
    const profitMargin = repair.repairCost > 0 ? (profit / repair.repairCost) * 100 : 0
    
    return { partsCost, laborCost, totalCost, profit, profitMargin }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      'PENDING': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'IN_PROGRESS': 'bg-blue-100 text-blue-800 border-blue-200',
      'COMPLETED': 'bg-green-100 text-green-800 border-green-200',
      'DELIVERED': 'bg-gray-100 text-gray-800 border-gray-200',
      'CANCELLED': 'bg-red-100 text-red-800 border-red-200',
    }
    return variants[status] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, string> = {
      'LOW': 'bg-gray-100 text-gray-600',
      'NORMAL': 'bg-blue-50 text-blue-600',
      'HIGH': 'bg-orange-50 text-orange-600',
      'URGENT': 'bg-red-50 text-red-600',
    }
    return variants[priority] || 'bg-gray-100 text-gray-600'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!repair) {
    return (
      <div className="text-center py-8">
        <p>Repair not found</p>
        <Button onClick={() => navigate('/repairs')} className="mt-4">
          Back to Repairs
        </Button>
      </div>
    )
  }

  const profit = calculateProfit()
  const availableStatuses = statusWorkflow[repair.status] || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/repairs')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{repair.ticketNumber}</h1>
            <p className="text-muted-foreground">Repair Job Card</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStatusBadge(repair.status)}>
            {repair.status.replace('_', ' ')}
          </Badge>
          <Badge variant="outline" className={getPriorityBadge(repair.priority)}>
            {repair.priority}
          </Badge>
        </div>
      </div>

      {/* Profit Summary Card */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-green-700 font-medium">Net Profit</p>
                <p className="text-2xl font-bold text-green-800">${profit.profit.toFixed(2)}</p>
                <p className="text-sm text-green-600">{profit.profitMargin.toFixed(1)}% margin</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-right">
              <div>
                <p className="text-xs text-green-600">Revenue</p>
                <p className="font-semibold text-green-800">${repair.repairCost.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-green-600">Parts Cost</p>
                <p className="font-semibold text-red-600">-${profit.partsCost.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-green-600">Labor</p>
                <p className="font-semibold text-red-600">-${profit.laborCost.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="parts">Parts & Costs</TabsTrigger>
          <TabsTrigger value="technician">Technician</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{repair.client?.fullName}</p>
                    <p className="text-sm text-muted-foreground">Customer</p>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{repair.client?.phone || 'No phone'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{repair.client?.email || 'No email'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Device Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Device Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Brand</Label>
                    <p className="font-medium">{repair.deviceBrand}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Model</Label>
                    <p className="font-medium">{repair.deviceModel}</p>
                  </div>
                </div>
                
                {repair.deviceIMEI && (
                  <div>
                    <Label className="text-muted-foreground">IMEI</Label>
                    <p className="font-mono text-sm">{repair.deviceIMEI}</p>
                  </div>
                )}
                
                {repair.devicePassword && (
                  <div>
                    <Label className="text-muted-foreground">Device Password</Label>
                    <p className="font-mono text-sm">{repair.devicePassword}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Problem & Accessories */}
          <Card>
            <CardHeader>
              <CardTitle>Problem Description & Accessories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Problem Description</Label>
                <p className="mt-1 p-3 bg-muted rounded-lg">{repair.problemDescription}</p>
              </div>
              
              {repair.accessoriesReceived && (
                <div>
                  <Label className="text-muted-foreground">Accessories Received</Label>
                  <p className="mt-1 p-3 bg-muted rounded-lg">{repair.accessoriesReceived}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Parts & Costs Tab */}
        <TabsContent value="parts" className="space-y-4">
          {/* Parts List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Parts Used</CardTitle>
                <CardDescription>Manage parts and components used for this repair</CardDescription>
              </div>
              <Button onClick={() => setIsAddingPart(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Part
              </Button>
            </CardHeader>
            <CardContent>
              {repair.parts && repair.parts.length > 0 ? (
                <div className="space-y-2">
                  {repair.parts.map((part) => (
                    <div key={part.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Package className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{part.product?.name || part.notes || 'Custom Part'}</p>
                          <p className="text-sm text-muted-foreground">
                            {part.product?.sku ? `SKU: ${part.product.sku}` : 'Manual entry'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm">{part.quantity} × ${part.unitPrice.toFixed(2)}</p>
                          <p className="font-medium">${part.total.toFixed(2)}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemovePart(part.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No parts added yet</p>
                  <p className="text-sm">Add parts used for this repair</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cost Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Cost & Profit Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Revenue</p>
                  <p className="text-xl font-bold">${repair.repairCost.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Parts Cost</p>
                  <p className="text-xl font-bold text-red-600">-${profit.partsCost.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Labor Cost</p>
                  <p className="text-xl font-bold text-red-600">-${profit.laborCost.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">Net Profit</p>
                  <p className="text-xl font-bold text-green-700">${profit.profit.toFixed(2)}</p>
                  <p className="text-xs text-green-600">{profit.profitMargin.toFixed(1)}% margin</p>
                </div>
              </div>

              {/* Payment Status */}
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Status</p>
                    <p className="font-medium">
                      {repair.prepayment >= repair.repairCost ? (
                        <span className="text-green-600">Fully Paid</span>
                      ) : repair.prepayment > 0 ? (
                        <span className="text-yellow-600">Partially Paid</span>
                      ) : (
                        <span className="text-red-600">Unpaid</span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Due Amount</p>
                    <p className="font-semibold">${repair.dueAmount.toFixed(2)}</p>
                  </div>
                </div>
                
                {/* Payment Progress Bar */}
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min((repair.prepayment / repair.repairCost) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    ${repair.prepayment.toFixed(2)} of ${repair.repairCost.toFixed(2)} paid
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Technician Tab */}
        <TabsContent value="technician" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Technician Assignment</CardTitle>
              <CardDescription>Assign or change the technician for this repair</CardDescription>
            </CardHeader>
            <CardContent>
              {repair.technician ? (
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-lg">{repair.technician.fullName}</p>
                      <p className="text-sm text-muted-foreground">Assigned Technician</p>
                    </div>
                  </div>
                  <Button onClick={() => setIsAssigning(true)} variant="outline">
                    Change Technician
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No technician assigned</p>
                  <Button onClick={() => setIsAssigning(true)} className="mt-4">
                    Assign Technician
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Technician Notes */}
          {repair.technicianNotes && (
            <Card>
              <CardHeader>
                <CardTitle>Technician Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{repair.technicianNotes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Repair Timeline</CardTitle>
              <CardDescription>Track the progress of this repair job</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Received */}
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-white" />
                    </div>
                    <div className="w-0.5 h-full bg-green-200 mt-2" />
                  </div>
                  <div className="flex-1 pb-6">
                    <p className="font-medium">Device Received</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(repair.receivedAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Started */}
                {repair.startedAt && (
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                        <Wrench className="h-4 w-4 text-white" />
                      </div>
                      <div className="w-0.5 h-full bg-blue-200 mt-2" />
                    </div>
                    <div className="flex-1 pb-6">
                      <p className="font-medium">Repair Started</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(repair.startedAt).toLocaleString()}
                      </p>
                      {repair.technician && (
                        <p className="text-sm text-muted-foreground">
                          Technician: {repair.technician.fullName}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Completed */}
                {repair.completedAt && (
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div className="h-8 w-8 rounded-full bg-green-600 flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-white" />
                      </div>
                      <div className="w-0.5 h-full bg-green-300 mt-2" />
                    </div>
                    <div className="flex-1 pb-6">
                      <p className="font-medium">Repair Completed</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(repair.completedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                {/* Delivered */}
                {repair.deliveredAt && (
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div className="h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center">
                        <User className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Device Delivered</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(repair.deliveredAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                {/* Current Status */}
                {!repair.deliveredAt && !repair.cancelledAt && (
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div className="h-8 w-8 rounded-full bg-yellow-500 flex items-center justify-center animate-pulse">
                        <Clock className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Current Status: {repair.status.replace('_', ' ')}</p>
                      <p className="text-sm text-muted-foreground">
                        Awaiting next action
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Status Update */}
          {availableStatuses.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Update Status</CardTitle>
                <CardDescription>Change the current status of this repair</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select new status" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Textarea
                  placeholder="Add a note about this status change (optional)"
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                />
                
                <Button 
                  onClick={handleStatusUpdate}
                  disabled={!newStatus}
                  className="w-full"
                >
                  Update Status
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Technician Notes</CardTitle>
              <CardDescription>Add or update notes about this repair</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Enter technician notes, observations, or any important information about this repair..."
                value={editForm.technicianNotes}
                onChange={(e) => setEditForm({ ...editForm, technicianNotes: e.target.value })}
                rows={6}
              />
              <Button onClick={handleUpdateRepair}>
                <Save className="mr-2 h-4 w-4" />
                Save Notes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Part Dialog */}
      <Dialog open={isAddingPart} onOpenChange={setIsAddingPart}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Part</DialogTitle>
            <DialogDescription>Add a part or component to this repair</DialogDescription>
          </DialogHeader>
          
          <Tabs value={addPartTab} onValueChange={(v) => setAddPartTab(v as 'database' | 'quick')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="database">From Database</TabsTrigger>
              <TabsTrigger value="quick">Quick Add</TabsTrigger>
            </TabsList>
            
            <TabsContent value="database" className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Select Product</Label>
                <Select 
                  value={selectedProduct?.id} 
                  onValueChange={(value) => {
                    const product = products.find(p => p.id === value)
                    setSelectedProduct(product || null)
                    if (product) {
                      setPartUnitPrice(product.costPrice || product.salePrice || 0)
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} - Stock: {product.quantity}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedProduct && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">{selectedProduct.name}</p>
                  <p className="text-sm text-muted-foreground">SKU: {selectedProduct.sku}</p>
                  <p className="text-sm text-muted-foreground">Available: {selectedProduct.quantity}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={partQuantity}
                    onChange={(e) => setPartQuantity(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unit Price ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={partUnitPrice}
                    onChange={(e) => setPartUnitPrice(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
              
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex justify-between">
                  <span>Total:</span>
                  <span className="font-bold">${(partQuantity * partUnitPrice).toFixed(2)}</span>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="quick" className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Part Name</Label>
                <Input
                  placeholder="e.g., Screen Replacement, Battery"
                  value={quickPartName}
                  onChange={(e) => setQuickPartName(e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={partQuantity}
                    onChange={(e) => setPartQuantity(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unit Cost ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={quickPartCost}
                    onChange={(e) => setQuickPartCost(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
              
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex justify-between">
                  <span>Total Cost:</span>
                  <span className="font-bold">${(partQuantity * quickPartCost).toFixed(2)}</span>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingPart(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddPart} disabled={addPartTab === 'database' ? !selectedProduct : !quickPartName.trim()}>
              Add Part
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Technician Dialog */}
      <Dialog open={isAssigning} onOpenChange={setIsAssigning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Technician</DialogTitle>
            <DialogDescription>Assign a technician to this repair job</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Technician</Label>
              <Select 
                value={selectedTechnician?.id} 
                onValueChange={(value) => {
                  const tech = technicians.find(t => t.id === value)
                  setSelectedTechnician(tech || null)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a technician" />
                </SelectTrigger>
                <SelectContent>
                  {technicians.map((tech) => (
                    <SelectItem key={tech.id} value={tech.id}>
                      {tech.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedTechnician && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedTechnician.fullName}</p>
                <p className="text-sm text-muted-foreground">{selectedTechnician.email}</p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssigning(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignTechnician} disabled={!selectedTechnician}>
              Assign Technician
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
