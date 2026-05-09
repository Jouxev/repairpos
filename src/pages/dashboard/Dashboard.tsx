import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  DollarSign, 
  Users, 
  Wrench, 
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle
} from 'lucide-react'
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts'

// Mock data - replace with actual data from your API
const salesData = [
  { name: 'Mon', sales: 1200, repairs: 800 },
  { name: 'Tue', sales: 1900, repairs: 1200 },
  { name: 'Wed', sales: 1500, repairs: 900 },
  { name: 'Thu', sales: 2200, repairs: 1100 },
  { name: 'Fri', sales: 2800, repairs: 1400 },
  { name: 'Sat', sales: 3200, repairs: 1600 },
  { name: 'Sun', sales: 2400, repairs: 1300 },
]

const repairStatusData = [
  { name: 'Pending', value: 15, color: '#f59e0b' },
  { name: 'In Progress', value: 25, color: '#3b82f6' },
  { name: 'Completed', value: 45, color: '#10b981' },
  { name: 'Delivered', value: 35, color: '#6366f1' },
]

const topProducts = [
  { name: 'iPhone Screen', sales: 145, revenue: 7250 },
  { name: 'Samsung Battery', sales: 89, revenue: 3560 },
  { name: 'Charging Port', sales: 76, revenue: 1520 },
  { name: 'Back Cover', sales: 65, revenue: 1950 },
  { name: 'Screen Protector', sales: 234, revenue: 2340 },
]

const recentRepairs = [
  { id: 'REP-001', customer: 'John Doe', device: 'iPhone 13 Pro', status: 'In Progress', amount: 150 },
  { id: 'REP-002', customer: 'Jane Smith', device: 'Samsung S21', status: 'Pending', amount: 120 },
  { id: 'REP-003', customer: 'Mike Johnson', device: 'iPhone 12', status: 'Completed', amount: 180 },
  { id: 'REP-004', customer: 'Sarah Williams', device: 'Pixel 6', status: 'In Progress', amount: 140 },
]

export default function Dashboard() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your repair shop performance and key metrics.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$2,450</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-emerald-500 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                +12%
              </span>{' '}
              from yesterday
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Repairs</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-amber-500 flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                8 pending
              </span>{' '}
              diagnosis
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-emerald-500 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                +8%
              </span>{' '}
              from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">7</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-destructive flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                Restock needed
              </span>{' '}
              urgent
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            {/* Sales Chart */}
            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle>Sales & Repairs Overview</CardTitle>
                <CardDescription>
                  Daily sales and repair revenue for the past week
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={salesData}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorRepairs" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.5rem'
                      }}
                    />
                    <Area type="monotone" dataKey="sales" stroke="#3b82f6" fillOpacity={1} fill="url(#colorSales)" name="Sales" />
                    <Area type="monotone" dataKey="repairs" stroke="#10b981" fillOpacity={1} fill="url(#colorRepairs)" name="Repairs" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Repair Status */}
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Repair Status</CardTitle>
                <CardDescription>
                  Current distribution of repair statuses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={repairStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {repairStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {repairStatusData.map((status) => (
                    <div key={status.name} className="flex items-center gap-2 text-sm">
                      <div 
                        className="h-3 w-3 rounded-full" 
                        style={{ backgroundColor: status.color }}
                      />
                      <span className="text-muted-foreground">{status.name}:</span>
                      <span className="font-medium">{status.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Repairs & Top Products */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Repairs</CardTitle>
                <CardDescription>Latest repair tickets and their status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentRepairs.map((repair) => (
                    <div key={repair.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        <div className={`h-2 w-2 rounded-full ${
                          repair.status === 'Completed' ? 'bg-green-500' :
                          repair.status === 'In Progress' ? 'bg-blue-500' :
                          'bg-amber-500'
                        }`} />
                        <div>
                          <p className="text-sm font-medium">{repair.id}</p>
                          <p className="text-xs text-muted-foreground">{repair.customer} • {repair.device}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">${repair.amount}</p>
                        <p className={`text-xs ${
                          repair.status === 'Completed' ? 'text-green-600' :
                          repair.status === 'In Progress' ? 'text-blue-600' :
                          'text-amber-600'
                        }`}>{repair.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Products</CardTitle>
                <CardDescription>Best selling products this month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topProducts.map((product, index) => (
                    <div key={product.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.sales} sold</p>
                        </div>
                      </div>
                      <p className="text-sm font-medium">${product.revenue.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Analytics</CardTitle>
              <CardDescription>More detailed charts and reports will appear here.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Analytics content coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reports</CardTitle>
              <CardDescription>Generate and view reports.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Reports content coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
