import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Receipt,
  DollarSign,
  Calendar,
  FileText,
  Download,
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  Banknote,
  Tag,
  PieChart,
} from 'lucide-react'
import { toast } from 'sonner'

interface Expense {
  id: string
  date: Date
  amount: number
  category: string
  description: string
  paymentMethod: string
  receiptUrl?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

interface ExpenseCategory {
  id: string
  name: string
  color: string
  icon: string
  budget?: number
}

const expenseCategories: ExpenseCategory[] = [
  { id: '1', name: 'Supplies & Parts', color: '#3B82F6', icon: 'Package' },
  { id: '2', name: 'Rent & Utilities', color: '#8B5CF6', icon: 'Building' },
  { id: '3', name: 'Salaries & Wages', color: '#10B981', icon: 'Users' },
  { id: '4', name: 'Marketing & Ads', color: '#F59E0B', icon: 'Megaphone' },
  { id: '5', name: 'Equipment', color: '#EF4444', icon: 'Wrench' },
  { id: '6', name: 'Transportation', color: '#6366F1', icon: 'Car' },
  { id: '7', name: 'Insurance', color: '#14B8A6', icon: 'Shield' },
  { id: '8', name: 'Office Supplies', color: '#84CC16', icon: 'Paperclip' },
  { id: '9', name: 'Professional Services', color: '#F97316', icon: 'Briefcase' },
  { id: '10', name: 'Other', color: '#6B7280', icon: 'MoreHorizontal' },
]

const paymentMethods = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'credit_card', label: 'Credit Card', icon: CreditCard },
  { value: 'debit_card', label: 'Debit Card', icon: CreditCard },
  { value: 'check', label: 'Check', icon: FileText },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: Wallet },
  { value: 'mobile_payment', label: 'Mobile Payment', icon: Wallet },
]

// Generate mock expenses
function generateMockExpenses(): Expense[] {
  const expenses: Expense[] = []
  const now = new Date()
  
  const descriptions: Record<string, string[]> = {
    'Supplies & Parts': ['iPhone screens bulk order', 'Samsung batteries', 'Charging cables', 'Screen protectors', 'Repair tools'],
    'Rent & Utilities': ['Monthly rent', 'Electric bill', 'Internet service', 'Water bill', 'Phone service'],
    'Salaries & Wages': ['Technician salary', 'Sales rep wages', 'Manager salary', 'Overtime pay'],
    'Marketing & Ads': ['Facebook ads', 'Google Ads', 'Flyer printing', 'Business cards', 'Local newspaper ad'],
    'Equipment': ['Soldering station', 'Microscope', 'Heat gun', 'Vacuum pump', 'Ultrasonic cleaner'],
    'Transportation': ['Fuel', 'Vehicle maintenance', 'Parking fees', 'Delivery charges'],
    'Insurance': ['Business insurance', 'Health insurance', 'Liability insurance'],
    'Office Supplies': ['Printer paper', 'Ink cartridges', 'Pens and pencils', 'Folders', 'Staples'],
    'Professional Services': ['Accountant fees', 'Legal consultation', 'Software subscriptions'],
    'Other': ['Miscellaneous expenses', 'Staff lunch', 'Customer refunds'],
  }

  // Generate expenses for the past 90 days
  for (let i = 0; i < 150; i++) {
    const daysAgo = Math.floor(Math.random() * 90)
    const date = new Date(now)
    date.setDate(date.getDate() - daysAgo)

    const category = expenseCategories[Math.floor(Math.random() * expenseCategories.length)]
    const categoryDescriptions = descriptions[category.name] || ['Expense']
    const description = categoryDescriptions[Math.floor(Math.random() * categoryDescriptions.length)]

    const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)].value

    // Vary amounts by category
    let amount: number
    switch (category.name) {
      case 'Rent & Utilities':
        amount = 800 + Math.random() * 400
        break
      case 'Salaries & Wages':
        amount = 2000 + Math.random() * 1000
        break
      case 'Supplies & Parts':
        amount = 50 + Math.random() * 300
        break
      case 'Equipment':
        amount = 100 + Math.random() * 500
        break
      default:
        amount = 20 + Math.random() * 200
    }

    expenses.push({
      id: `EXP-${Date.now()}-${i}`,
      date,
      amount: Math.round(amount * 100) / 100,
      category: category.name,
      description,
      paymentMethod,
      notes: Math.random() > 0.7 ? 'Urgent expense' : undefined,
      createdAt: date,
      updatedAt: date,
    })
  }

  return expenses.sort((a, b) => b.date.getTime() - a.date.getTime())
}

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [dateRange, setDateRange] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    category: '',
    description: '',
    paymentMethod: 'cash',
    notes: '',
  })

  useEffect(() => {
    const mockExpenses = generateMockExpenses()
    setExpenses(mockExpenses)
    setFilteredExpenses(mockExpenses)
  }, [])

  useEffect(() => {
    let filtered = expenses

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (e) =>
          e.description.toLowerCase().includes(query) ||
          e.category.toLowerCase().includes(query) ||
          e.notes?.toLowerCase().includes(query)
      )
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((e) => e.category === selectedCategory)
    }

    // Date range filter
    if (dateRange !== 'all') {
      const now = new Date()
      let startDate: Date

      switch (dateRange) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0))
          break
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7))
          break
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1))
          break
        case 'year':
          startDate = new Date(now.setFullYear(now.getFullYear() - 1))
          break
        default:
          startDate = new Date(0)
      }

      filtered = filtered.filter((e) => e.date >= startDate)
    }

    setFilteredExpenses(filtered)
  }, [expenses, searchQuery, selectedCategory, dateRange])

  // Calculate statistics
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0)
  const averageExpense =
    filteredExpenses.length > 0
      ? totalExpenses / filteredExpenses.length
      : 0

  // Group by category
  const categoryTotals = filteredExpenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount
    return acc
  }, {} as Record<string, number>)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.amount || !formData.category || !formData.description) {
      toast.error('Please fill in all required fields')
      return
    }

    const amount = parseFloat(formData.amount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    const newExpense: Expense = {
      id: editingExpense
        ? editingExpense.id
        : `EXP-${Date.now()}`,
      date: new Date(formData.date),
      amount,
      category: formData.category,
      description: formData.description,
      paymentMethod: formData.paymentMethod,
      notes: formData.notes || undefined,
      createdAt: editingExpense ? editingExpense.createdAt : new Date(),
      updatedAt: new Date(),
    }

    if (editingExpense) {
      setExpenses((prev) =>
        prev.map((e) => (e.id === editingExpense.id ? newExpense : e))
      )
      toast.success('Expense updated successfully')
    } else {
      setExpenses((prev) => [newExpense, ...prev])
      toast.success('Expense added successfully')
    }

    setIsDialogOpen(false)
    setEditingExpense(null)
    setFormData({
      date: new Date().toISOString().split('T')[0],
      amount: '',
      category: '',
      description: '',
      paymentMethod: 'cash',
      notes: '',
    })
  }

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense)
    setFormData({
      date: expense.date.toISOString().split('T')[0],
      amount: expense.amount.toString(),
      category: expense.category,
      description: expense.description,
      paymentMethod: expense.paymentMethod,
      notes: expense.notes || '',
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (expenseId: string) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      setExpenses((prev) => prev.filter((e) => e.id !== expenseId))
      toast.success('Expense deleted successfully')
    }
  }

  const getCategoryColor = (categoryName: string) => {
    const category = expenseCategories.find((c) => c.name === categoryName)
    return category?.color || '#6B7280'
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground">
            Track and manage all business expenses
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingExpense ? 'Edit Expense' : 'Add New Expense'}
              </DialogTitle>
              <DialogDescription>
                {editingExpense
                  ? 'Update the expense details below.'
                  : 'Fill in the details for the new expense.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData({ ...formData, amount: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) =>
                        setFormData({ ...formData, category: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {expenseCategories.map((category) => (
                          <SelectItem key={category.id} value={category.name}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: category.color }}
                              />
                              {category.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod">Payment Method</Label>
                    <Select
                      value={formData.paymentMethod}
                      onValueChange={(value) =>
                        setFormData({ ...formData, paymentMethod: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMethods.map((method) => (
                          <SelectItem key={method.value} value={method.value}>
                            {method.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Input
                    id="description"
                    placeholder="Brief description of the expense"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any additional information..."
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false)
                    setEditingExpense(null)
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingExpense ? 'Update' : 'Add'} Expense
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalExpenses.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {filteredExpenses.length} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Expense</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${averageExpense.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Per transaction</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Highest Expense</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${filteredExpenses.length > 0 ? Math.max(...filteredExpenses.map((e) => e.amount)).toFixed(2) : '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">Largest transaction</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.keys(categoryTotals).length}
            </div>
            <p className="text-xs text-muted-foreground">Active categories</p>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Expense by Category
          </CardTitle>
          <CardDescription>
            Breakdown of expenses across different categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(categoryTotals)
              .sort(([, a], [, b]) => b - a)
              .map(([category, amount]) => {
                const percentage = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
                const color = getCategoryColor(category)

                return (
                  <div key={category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span className="font-medium">{category}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">${amount.toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">
                          {percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        </CardContent>
      </Card>

      {/* Filters and Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Expense Transactions</CardTitle>
              <CardDescription>
                {filteredExpenses.length} expenses totaling ${totalExpenses.toFixed(2)}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search expenses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {expenseCategories.map((category) => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Receipt className="h-8 w-8" />
                        <p>No expenses found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>
                        {expense.date.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: getCategoryColor(
                                expense.category
                              ),
                            }}
                          />
                          <span className="text-sm">{expense.category}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{expense.description}</p>
                          {expense.notes && (
                            <p className="text-xs text-muted-foreground">
                              {expense.notes}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {paymentMethods.find(
                            (m) => m.value === expense.paymentMethod
                          )?.label || expense.paymentMethod}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${expense.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleEdit(expense)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(expense.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

function getCategoryColor(categoryName: string): string {
  const category = expenseCategories.find((c) => c.name === categoryName)
  return category?.color || '#6B7280'
}
