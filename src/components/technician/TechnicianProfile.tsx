import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { userService, User } from '@/services/userService'
import { DollarSign, Percent, Wallet, History as HistoryIcon, TrendingUp, TrendingDown } from 'lucide-react'

interface TechnicianProfileProps {
  technicianId: string
  isAdmin?: boolean
}

export function TechnicianProfile({ technicianId, isAdmin = false }: TechnicianProfileProps) {
  const { toast } = useToast()
  const [technician, setTechnician] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    commissionRate: 50,
    balance: 0
  })

  useEffect(() => {
    loadTechnician()
  }, [technicianId])

  const loadTechnician = async () => {
    try {
      setIsLoading(true)
      const data = await userService.getUserById(technicianId)
      setTechnician(data)
      setEditForm({
        commissionRate: data.commissionRate || 50,
        balance: data.balance || 0
      })
    } catch (error) {
      console.error('Error loading technician:', error)
      toast({
        title: 'Error',
        description: 'Failed to load technician profile',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateCommissionRate = async () => {
    try {
      await userService.updateUser(technicianId, {
        commissionRate: editForm.commissionRate
      })
      toast({
        title: 'Success',
        description: 'Commission rate updated successfully'
      })
      setIsEditing(false)
      loadTechnician()
    } catch (error) {
      console.error('Error updating commission rate:', error)
      toast({
        title: 'Error',
        description: 'Failed to update commission rate',
        variant: 'destructive'
      })
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!technician) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-muted-foreground">
            Technician not found
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${technician.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${technician.balance?.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              {technician.balance >= 0 ? 'Amount owed to technician' : 'Amount technician owes'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commission Rate</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {technician.commissionRate || 50}%
            </div>
            <p className="text-xs text-muted-foreground">
              Percentage of profit/loss technician earns
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Technician</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {technician.fullName}
            </div>
            <p className="text-xs text-muted-foreground">
              {technician.email}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Admin Controls */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Admin Controls</CardTitle>
            <CardDescription>Manage technician commission settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="commissionRate">Commission Rate (%)</Label>
                <Input
                  id="commissionRate"
                  type="number"
                  min="0"
                  max="100"
                  value={editForm.commissionRate}
                  onChange={(e) => setEditForm({ ...editForm, commissionRate: parseFloat(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">
                  Percentage of profit or loss the technician is responsible for
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleUpdateCommissionRate}>
                Update Commission Rate
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
