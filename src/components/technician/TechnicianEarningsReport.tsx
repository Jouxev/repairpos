import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { userService, TechnicianEarning } from '@/services/userService'
import { repairService } from '@/services/repairService'
import { 
  DollarSign, 
  Calendar,
  Download,
  TrendingUp,
  TrendingDown,
  User
} from 'lucide-react'
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
// Charts temporarily disabled - recharts causing issues
// import {
//   BarChart,
//   Bar,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   ResponsiveContainer,
//   LineChart,
//   Line
// } from 'recharts'

interface TechnicianEarningsReportProps {
  technicianId?: string // If not provided, shows all technicians (admin view)
}

export function TechnicianEarningsReport({ technicianId }: TechnicianEarningsReportProps) {
  const { toast } = useToast()
  const [earnings, setEarnings] = useState<TechnicianEarning[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date()
    date.setMonth(date.getMonth() - 1)
    return date.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0]
  })
  const [selectedTechnician, setSelectedTechnician] = useState<string>(technicianId || 'ALL')
  const [technicians, setTechnicians] = useState<any[]>([])

  useEffect(() => {
    loadTechnicians()
  }, [])

  useEffect(() => {
    loadEarnings()
  }, [startDate, endDate, selectedTechnician])

  const loadTechnicians = async () => {
    try {
      const allUsers = await userService.getUsers()
      const techUsers = allUsers.filter((u: any) => u.role === 'TECHNICIAN')
      setTechnicians(techUsers)
    } catch (error) {
      console.error('Error loading technicians:', error)
    }
  }

  const loadEarnings = async () => {
    try {
      setIsLoading(true)
      
      let allEarnings: TechnicianEarning[] = []
      
      if (selectedTechnician && selectedTechnician !== 'ALL') {
        // Load specific technician's earnings
        const data = await userService.getTechnicianEarnings(selectedTechnician)
        allEarnings = data
      } else {
        // Load all technicians' earnings
        for (const tech of technicians) {
          const data = await userService.getTechnicianEarnings(tech.id)
          allEarnings = [...allEarnings, ...data]
        }
      }
      
      // Filter by date range
      const filtered = allEarnings.filter(earning => {
        const earningDate = new Date(earning.createdAt)
        const start = startDate ? new Date(startDate) : null
        const end = endDate ? new Date(endDate + 'T23:59:59') : null
        
        if (start && earningDate < start) return false
        if (end && earningDate > end) return false
        return true
      })
      
      setEarnings(filtered)
    } catch (error) {
      console.error('Error loading earnings:', error)
      toast({
        title: 'Error',
        description: 'Failed to load earnings report',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate summary statistics
  const totalCommission = earnings
    .filter(e => e.type === 'COMMISSION')
    .reduce((sum, e) => sum + e.amount, 0)
  
  const totalPenalties = earnings
    .filter(e => e.type === 'PENALTY')
    .reduce((sum, e) => sum + e.amount, 0)
  
  const netEarnings = totalCommission + totalPenalties // Penalties are negative
  
  const totalRepairs = new Set(earnings.map(e => e.repairId).filter(Boolean)).size

  // Prepare chart data - group by date
  const chartData = earnings.reduce((acc: any[], earning) => {
    const date = new Date(earning.createdAt).toLocaleDateString()
    const existing = acc.find(item => item.date === date)
    
    if (existing) {
      if (earning.type === 'COMMISSION') {
        existing.commissions += earning.amount
      } else if (earning.type === 'PENALTY') {
        existing.penalties += Math.abs(earning.amount)
      }
    } else {
      acc.push({
        date,
        commissions: earning.type === 'COMMISSION' ? earning.amount : 0,
        penalties: earning.type === 'PENALTY' ? Math.abs(earning.amount) : 0
      })
    }
    
    return acc
  }, []).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const exportToCSV = () => {
    const headers = ['Date', 'Type', 'Amount', 'Description', 'Repair ID']
    const rows = earnings.map(e => [
      new Date(e.createdAt).toLocaleDateString(),
      e.type,
      e.amount.toFixed(2),
      e.description || '',
      e.repairId || ''
    ])
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `technician-earnings-${startDate}-to-${endDate}.csv`
    a.click()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Technician Earnings Report</h2>
          <p className="text-muted-foreground">
            View earnings, commissions, and penalties for technicians
          </p>
        </div>
        <Button onClick={exportToCSV} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {!technicianId && (
              <div className="space-y-2">
                <Label>Technician</Label>
                <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Technicians" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Technicians</SelectItem>
                    {technicians.map((tech) => (
                      <SelectItem key={tech.id} value={tech.id}>
                        {tech.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={loadEarnings}>
                Apply Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netEarnings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${netEarnings.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Commissions minus penalties
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commissions</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${totalCommission.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Earnings from profits
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Penalties</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${Math.abs(totalPenalties).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Losses from failed repairs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Repairs</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalRepairs}
            </div>
            <p className="text-xs text-muted-foreground">
              Unique repair jobs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {earnings.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Total records
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart - Temporarily disabled due to recharts issues */}
      {/* {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Earnings Trend</CardTitle>
            <CardDescription>
              Commissions and penalties over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip 
                    formatter={(value: number) => `$${value.toFixed(2)}`}
                    labelStyle={{ color: '#000' }}
                  />
                  <Bar dataKey="commissions" fill="#22c55e" name="Commissions" />
                  <Bar dataKey="penalties" fill="#ef4444" name="Penalties" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )} */}

      {/* Earnings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            Detailed list of all commissions, penalties, and adjustments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  {!technicianId && <TableHead>Technician</TableHead>}
                  <TableHead>Description</TableHead>
                  <TableHead>Repair ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEarnings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={technicianId ? 6 : 7} className="text-center text-muted-foreground py-8">
                      No transactions found for the selected period
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedEarnings.map((earning) => (
                    <TableRow key={earning.id}>
                      <TableCell>
                        {new Date(earning.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {getTypeBadge(earning.type)}
                      </TableCell>
                      <TableCell>
                        <span className={`font-bold ${earning.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {earning.amount >= 0 ? '+' : ''}${earning.amount.toFixed(2)}
                        </span>
                      </TableCell>
                      {!technicianId && (
                        <TableCell>
                          {technicians.find(t => t.id === earning.technicianId)?.fullName || 'Unknown'}
                        </TableCell>
                      )}
                      <TableCell className="max-w-xs truncate">
                        {earning.description || '-'}
                      </TableCell>
                      <TableCell>
                        {earning.repairId ? (
                          <Badge variant="outline" className="font-mono text-xs">
                            {earning.repairId.slice(0, 8)}...
                          </Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing page {currentPage} of {totalPages} ({filteredEarnings.length} total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
