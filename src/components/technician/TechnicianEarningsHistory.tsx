import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { userService, TechnicianEarning } from '@/services/userService'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar,
  Filter,
  Download,
  ArrowLeft,
  ArrowRight,
  History as HistoryIcon
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

interface TechnicianEarningsHistoryProps {
  technicianId: string
  isAdmin?: boolean
}

export function TechnicianEarningsHistory({ technicianId, isAdmin = false }: TechnicianEarningsHistoryProps) {
  const { toast } = useToast()
  const [earnings, setEarnings] = useState<TechnicianEarning[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('ALL')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    loadEarnings()
  }, [technicianId])

  const loadEarnings = async () => {
    try {
      setIsLoading(true)
      const data = await userService.getTechnicianEarnings(technicianId)
      setEarnings(data)
    } catch (error) {
      console.error('Error loading earnings:', error)
      toast({
        title: 'Error',
        description: 'Failed to load earnings history',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const filteredEarnings = earnings.filter(earning => {
    // Filter by type
    if (filterType !== 'ALL' && earning.type !== filterType) {
      return false
    }
    
    // Filter by date range
    const earningDate = new Date(earning.createdAt)
    if (startDate && earningDate < new Date(startDate)) {
      return false
    }
    if (endDate && earningDate > new Date(endDate + 'T23:59:59')) {
      return false
    }
    
    return true
  })

  // Pagination
  const totalPages = Math.ceil(filteredEarnings.length / itemsPerPage)
  const paginatedEarnings = filteredEarnings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Calculate summary
  const totalCommission = earnings
    .filter(e => e.type === 'COMMISSION')
    .reduce((sum, e) => sum + e.amount, 0)
  
  const totalPenalties = earnings
    .filter(e => e.type === 'PENALTY')
    .reduce((sum, e) => sum + e.amount, 0)
  
  const netEarnings = totalCommission + totalPenalties // Penalties are negative

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'COMMISSION':
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'PENALTY':
        return <TrendingDown className="h-4 w-4 text-red-600" />
      default:
        return <DollarSign className="h-4 w-4 text-blue-600" />
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'COMMISSION':
        return <Badge className="bg-green-100 text-green-800">Commission</Badge>
      case 'PENALTY':
        return <Badge className="bg-red-100 text-red-800">Penalty</Badge>
      default:
        return <Badge className="bg-blue-100 text-blue-800">Adjustment</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              Total commissions minus penalties
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Commissions</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${totalCommission.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Earnings from successful repairs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Penalties</CardTitle>
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
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <HistoryIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {earnings.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Total commission/penalty records
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="COMMISSION">Commission</SelectItem>
                  <SelectItem value="PENALTY">Penalty</SelectItem>
                  <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Start Date</Label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={() => {
                setFilterType('ALL')
                setStartDate('')
                setEndDate('')
              }}>
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Earnings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Earnings History</CardTitle>
          <CardDescription>
            Showing {paginatedEarnings.length} of {filteredEarnings.length} records
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Repair ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedEarnings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No earnings found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedEarnings.map((earning) => (
                  <TableRow key={earning.id}>
                    <TableCell>
                      {new Date(earning.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTypeIcon(earning.type)}
                        {getTypeBadge(earning.type)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`font-bold ${earning.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {earning.amount >= 0 ? '+' : ''}${earning.amount.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {earning.description || '-'}
                    </TableCell>
                    <TableCell>
                      {earning.repairId ? (
                        <Badge variant="outline">{earning.repairId.slice(0, 8)}...</Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
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
