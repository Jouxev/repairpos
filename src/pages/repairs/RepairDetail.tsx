import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Printer, Edit } from 'lucide-react'

export default function RepairDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  // Mock data - replace with actual data fetching
  const repair = {
    id: id || 'REP-001',
    customer: 'John Doe',
    phone: '+1234567890',
    email: 'john@example.com',
    deviceName: 'iPhone 13 Pro',
    deviceBrand: 'Apple',
    deviceModel: 'A2638',
    deviceIMEI: '123456789012345',
    problemDescription: 'Screen cracked and not responding to touch',
    repairCost: 150.00,
    prepayment: 50.00,
    dueAmount: 100.00,
    status: 'In Progress',
    priority: 'High',
    receivedAt: '2024-01-15T10:00:00Z',
    expectedDeliveryDate: '2024-01-18',
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      'Pending': 'bg-yellow-100 text-yellow-800',
      'In Progress': 'bg-blue-100 text-blue-800',
      'Completed': 'bg-green-100 text-green-800',
      'Delivered': 'bg-gray-100 text-gray-800',
    }
    return variants[status] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/repairs')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Repair Ticket</h1>
            <p className="text-muted-foreground">{repair.id}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button onClick={() => navigate(`/repairs/${repair.id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Name</p>
              <p className="text-lg">{repair.customer}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Phone</p>
              <p>{repair.phone}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p>{repair.email}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Device Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Device</p>
              <p className="text-lg">{repair.deviceName}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Brand</p>
                <p>{repair.deviceBrand}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Model</p>
                <p>{repair.deviceModel}</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">IMEI</p>
              <p>{repair.deviceIMEI}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Repair Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Problem Description</p>
            <p className="p-4 bg-muted rounded-lg">{repair.problemDescription}</p>
          </div>

          <div className="grid gap-6 md:grid-cols-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Repair Cost</p>
              <p className="text-2xl font-bold">${repair.repairCost.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Prepayment</p>
              <p className="text-2xl font-bold">${repair.prepayment.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Due Amount</p>
              <p className="text-2xl font-bold text-primary">${repair.dueAmount.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <Badge className={getStatusBadge(repair.status)}>
                {repair.status}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
