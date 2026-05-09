import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Wrench } from 'lucide-react'

const mockRepairs = [
  { id: 'REP-001', customer: 'John Doe', device: 'iPhone 13 Pro', status: 'In Progress', amount: 150, date: '2024-01-15' },
  { id: 'REP-002', customer: 'Jane Smith', device: 'Samsung S21', status: 'Pending', amount: 120, date: '2024-01-14' },
  { id: 'REP-003', customer: 'Mike Johnson', device: 'iPhone 12', status: 'Completed', amount: 180, date: '2024-01-13' },
]

export default function RepairsList() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')

  const filteredRepairs = mockRepairs.filter(repair =>
    repair.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repair.device.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repair.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Repairs</h1>
          <p className="text-muted-foreground">Manage repair tickets and track progress</p>
        </div>
        <Button onClick={() => navigate('/repairs/new')}>
          <Plus className="mr-2 h-4 w-4" />
          New Repair
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Repair Tickets</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search repairs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredRepairs.map((repair) => (
              <div
                key={repair.id}
                className="flex items-center justify-between rounded-lg border p-4 cursor-pointer hover:bg-accent"
                onClick={() => navigate(`/repairs/${repair.id}`)}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Wrench className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{repair.id}</p>
                    <p className="text-sm text-muted-foreground">{repair.customer} • {repair.device}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className={getStatusBadge(repair.status)}>
                    {repair.status}
                  </Badge>
                  <p className="text-sm font-medium mt-1">${repair.amount}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
