import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
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
  MoreHorizontal,
  Edit,
  Trash2,
  User,
  Mail,
  Phone,
  Shield,
  RefreshCw,
  Download,
  UserPlus,
  Lock,
  Unlock,
  Key,
  Activity,
  Eye,
  EyeOff,
} from 'lucide-react'
import { toast } from 'sonner'
import { userService } from '@/services/userService'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { useLocaleFormatters } from '@/hooks/useLocaleFormatters'

type UserRole = 'ADMIN' | 'MANAGER' | 'TECHNICIAN' | 'SELLER' | 'CASHIER'

interface User {
  id: string
  username: string
  fullName: string
  email: string
  phone?: string
  role: UserRole
  isActive: boolean
  avatar?: string
  lastLoginAt?: Date
  createdAt: Date
  permissions: string[]
  commissionRate?: number
  balance?: number
}

const roles = [
  { value: 'ADMIN', label: 'Administrator', description: 'Full system access', color: 'bg-red-500' },
  { value: 'MANAGER', label: 'Manager', description: 'Can manage most features', color: 'bg-orange-500' },
  { value: 'TECHNICIAN', label: 'Technician', description: 'Repair and technical work', color: 'bg-blue-500' },
  { value: 'SELLER', label: 'Sales Rep', description: 'Sales and customer service', color: 'bg-green-500' },
  { value: 'CASHIER', label: 'Cashier', description: 'POS and payments only', color: 'bg-purple-500' },
]

const permissions = [
  { id: 'dashboard', label: 'Dashboard', description: 'View dashboard and analytics' },
  { id: 'pos', label: 'Point of Sale', description: 'Access POS and process sales' },
  { id: 'repairs', label: 'Repairs', description: 'Manage repair tickets' },
  { id: 'products', label: 'Products', description: 'Manage products and inventory' },
  { id: 'clients', label: 'Clients', description: 'Manage customer database' },
  { id: 'cash_register', label: 'Cash Register', description: 'Manage cash flow' },
  { id: 'reports', label: 'Reports', description: 'Access reports and analytics' },
  { id: 'settings', label: 'Settings', description: 'Manage system settings' },
  { id: 'users', label: 'User Management', description: 'Manage user accounts' },
]

export default function UserManagement() {
  const { t } = useAppSettings()
  const { formatCurrency, formatDate, formatDateTime } = useLocaleFormatters()
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRole, setSelectedRole] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'SELLER' as UserRole,
    isActive: true,
    permissions: [] as string[],
    commissionRate: 50,
  })

  // Get current user role (for admin check)
  const [currentUserRole, setCurrentUserRole] = useState<string>('ADMIN')

  // Load users on mount
  useEffect(() => {
    loadUsers()
  }, [])

  // Filter users when search/filter changes
  useEffect(() => {
    filterUsers()
  }, [users, searchQuery, selectedRole, selectedStatus])

  const loadUsers = async () => {
    try {
      setIsLoading(true)
      const fetchedUsers = await userService.getUsers()
      
      // Map database fields to component interface
      const mappedUsers: User[] = fetchedUsers.map(u => ({
        id: u.id,
        username: u.username,
        fullName: u.fullName,
        email: u.email,
        phone: u.phone || undefined,
        role: u.role as UserRole,
        isActive: u.isActive,
        avatar: u.avatar || undefined,
        lastLoginAt: u.lastLoginAt || undefined,
        createdAt: u.createdAt,
        permissions: permissions.map(p => p.id), // Default all permissions for now
        commissionRate: u.commissionRate,
        balance: u.balance,
      }))
      
      setUsers(mappedUsers)
    } catch (error: any) {
      toast.error(`${t('failedToLoadUsers')}: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const filterUsers = () => {
    let filtered = users

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (u) =>
          u.fullName.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query) ||
          u.username.toLowerCase().includes(query) ||
          u.phone?.toLowerCase().includes(query)
      )
    }

    // Role filter
    if (selectedRole !== 'all') {
      filtered = filtered.filter((u) => u.role === selectedRole)
    }

    // Status filter
    if (selectedStatus !== 'all') {
      const isActive = selectedStatus === 'active'
      filtered = filtered.filter((u) => u.isActive === isActive)
    }

    setFilteredUsers(filtered)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.fullName || !formData.email || !formData.username) {
      toast.error(t('usernameRequired'))
      return
    }

    if (!editingUser && !formData.password) {
      toast.error(t('passwordRequiredNewUsers'))
      return
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      toast.error(t('passwordsDoNotMatch'))
      return
    }

    try {
      setIsLoading(true)

      if (editingUser) {
        // Update existing user
        const updateData: any = {
          username: formData.username,
          email: formData.email,
          fullName: formData.fullName,
          phone: formData.phone,
          role: formData.role,
          isActive: formData.isActive,
        }

        // Only admin can update password and commission rate
        if (currentUserRole === 'ADMIN') {
          if (formData.password) {
            updateData.password = formData.password
          }
          // Only allow commission rate for technicians
          if (formData.role === 'TECHNICIAN') {
            updateData.commissionRate = formData.commissionRate
          }
        }

        await userService.updateUser(editingUser.id, updateData)
        toast.success(t('userUpdated'))
      } else {
        // Create new user
        await userService.createUser({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          phone: formData.phone,
          role: formData.role,
          isActive: formData.isActive,
          commissionRate: formData.role === 'TECHNICIAN' ? formData.commissionRate : undefined,
        })
        toast.success(t('userCreated'))
      }

      // Refresh users list
      await loadUsers()
      setIsDialogOpen(false)
      setEditingUser(null)
      resetForm()
    } catch (error: any) {
      toast.error(error.message || t('error'))
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      username: '',
      fullName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      role: 'SELLER',
      isActive: true,
      permissions: [],
      commissionRate: 50,
    })
    setShowPassword(false)
    setShowConfirmPassword(false)
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setFormData({
      username: user.username || '',
      fullName: user.fullName || '',
      email: user.email,
      phone: user.phone || '',
      password: '',
      confirmPassword: '',
      role: user.role,
      isActive: user.isActive,
      permissions: user.permissions,
      commissionRate: user.commissionRate ?? 50,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (userId: string) => {
    if (!confirm(t('confirmDeleteUser'))) return

    try {
      setIsLoading(true)
      await userService.deleteUser(userId)
      toast.success(t('userDeleted'))
      await loadUsers()
    } catch (error: any) {
      toast.error(error.message || t('failedToDeleteUser'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleStatus = async (userId: string) => {
    try {
      setIsLoading(true)
      await userService.toggleUserStatus(userId)
      toast.success(t('userStatusUpdated'))
      await loadUsers()
    } catch (error: any) {
      toast.error(error.message || t('failedToUpdateStatus'))
    } finally {
      setIsLoading(false)
    }
  }

  const getRoleColor = (role: string) => {
    const roleConfig = roles.find((r) => r.value === role)
    return roleConfig?.color || 'bg-gray-500'
  }

  const getRoleLabel = (role: string) => {
    const roleConfig = roles.find((r) => r.value === role)
    return roleConfig?.label || role
  }

  const handlePermissionToggle = (permissionId: string) => {
    setFormData((prev) => {
      const hasPermission = prev.permissions.includes(permissionId)
      if (hasPermission) {
        return {
          ...prev,
          permissions: prev.permissions.filter((p) => p !== permissionId),
        }
      } else {
        return {
          ...prev,
          permissions: [...prev.permissions, permissionId],
        }
      }
    })
  }

  const selectAllPermissions = () => {
    setFormData((prev) => ({
      ...prev,
      permissions: permissions.map((p) => p.id),
    }))
  }

  const clearAllPermissions = () => {
    setFormData((prev) => ({
      ...prev,
      permissions: [],
    }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('userManagementTitle')}</h1>
          <p className="text-muted-foreground">
            {t('manageUserAccountsRolesPermissions')}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={isLoading}>
              <UserPlus className="h-4 w-4 mr-2" />
              {t('addUser')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingUser ? t('editUser') : t('addNewUser')}
              </DialogTitle>
              <DialogDescription>
                {editingUser
                  ? t('updateUserInfoPermissions')
                  : t('fillUserDetailsCreate')}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-6 py-4">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold">{t('basicInfo')}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">{t('username')} *</Label>
                      <Input
                        id="username"
                        value={formData.username}
                        onChange={(e) =>
                          setFormData({ ...formData, username: e.target.value })
                        }
                        placeholder="johndoe"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fullName">{t('fullName')} *</Label>
                      <Input
                        id="fullName"
                        value={formData.fullName}
                        onChange={(e) =>
                          setFormData({ ...formData, fullName: e.target.value })
                        }
                        placeholder="John Doe"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">{t('emailAddressLabel')} *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        placeholder="john@example.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">{t('phoneNumberLabel')}</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="role">{t('role')} *</Label>
                      <Select
                        value={formData.role}
                        onValueChange={(value) =>
                          setFormData({ ...formData, role: value as UserRole })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('role')} />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-2 h-2 rounded-full ${role.color}`}
                                />
                                {role.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t('accountStatus')}</Label>
                      <div className="flex items-center space-x-2 pt-2">
                        <Switch
                          checked={formData.isActive}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, isActive: checked })
                          }
                        />
                        <span className="text-sm text-muted-foreground">
                          {formData.isActive ? t('active') : t('inactive')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Commission Rate - Only for Technicians, Only Admin can edit */}
                {formData.role === 'TECHNICIAN' && currentUserRole === 'ADMIN' && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold">{t('technicianSettings')}</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="commissionRate">{t('commissionRateLabel')}</Label>
                          <Input
                            id="commissionRate"
                            type="number"
                            min="0"
                            max="100"
                            value={formData.commissionRate}
                            onChange={(e) =>
                              setFormData({ ...formData, commissionRate: parseInt(e.target.value) || 0 })
                            }
                            placeholder="50"
                          />
                          <p className="text-xs text-muted-foreground">
                            {t('technicianProfitShare')}
                          </p>
                        </div>
                        {editingUser && editingUser.balance !== undefined && (
                          <div className="space-y-2">
                            <Label>{t('currentBalance')}</Label>
                            <div className="flex items-center gap-2 pt-2">
                              <span className="text-2xl font-bold">{formatCurrency(editingUser.balance || 0)}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {t('currentEarningsBalance')}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Password Fields (for new users or admin editing) */}
                {(!editingUser || currentUserRole === 'ADMIN') && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold">
                        {editingUser ? t('resetPasswordAdmin') : t('setPassword')}
                      </h4>
                      {editingUser && (
                        <p className="text-xs text-muted-foreground">
                          {t('leaveBlankKeepPassword')}
                        </p>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="password">
                            {editingUser ? t('newPassword') : `${t('password')} *`}
                          </Label>
                          <div className="relative">
                            <Input
                              id="password"
                              type={showPassword ? 'text' : 'password'}
                              value={formData.password}
                              onChange={(e) =>
                                setFormData({ ...formData, password: e.target.value })
                              }
                              placeholder={editingUser ? t('enterNewPassword') : t('enterPasswordLabel')}
                              required={!editingUser}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword">
                            {editingUser ? t('confirmNewPassword') : `${t('confirmPasswordLabel')} *`}
                          </Label>
                          <div className="relative">
                            <Input
                              id="confirmPassword"
                              type={showConfirmPassword ? 'text' : 'password'}
                              value={formData.confirmPassword}
                              onChange={(e) =>
                                setFormData({ ...formData, confirmPassword: e.target.value })
                              }
                              placeholder={editingUser ? t('confirmNewPassword') : t('confirmPasswordPlaceholder')}
                              required={!editingUser}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                {/* Permissions */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">{t('permissionsTitle')}</h4>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={selectAllPermissions}
                      >
                        {t('selectAll')}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={clearAllPermissions}
                      >
                        {t('clearAll')}
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {permissions.map((permission) => (
                      <div
                        key={permission.id}
                        className="flex items-start space-x-3 space-y-0"
                      >
                        <input
                          type="checkbox"
                          checked={formData.permissions.includes(permission.id)}
                          onChange={() => handlePermissionToggle(permission.id)}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary mt-1"
                        />
                        <div className="space-y-1 leading-none">
                          <Label className="text-sm font-medium">
                            {permission.label}
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {permission.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false)
                    setEditingUser(null)
                    resetForm()
                  }}
                  disabled={isLoading}
                >
                  {t('cancel')}
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  {editingUser ? t('updateUser') : t('createUser')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('searchUsers')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('role')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allRoles')}</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${role.color}`} />
                      {role.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={t('status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allStatus')}</SelectItem>
                <SelectItem value="active">{t('active')}</SelectItem>
                <SelectItem value="inactive">{t('inactive')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('usersCount', { count: filteredUsers.length })}</CardTitle>
              <CardDescription>
                {t('manageUserAccountsRolesPermissions')}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={loadUsers} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                {t('refresh')}
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                {t('export')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('users')}</TableHead>
                  <TableHead>{t('role')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead>{t('lastLogin')}</TableHead>
                  <TableHead>{t('created')}</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <User className="h-8 w-8" />
                        <p>{t('noUsersFound')}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback>
                              {user.fullName
                                .split(' ')
                                .map((n) => n[0])
                                .join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.fullName}</p>
                            <p className="text-sm text-muted-foreground">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2 h-2 rounded-full ${getRoleColor(user.role)}`}
                            />
                            <span className="text-sm">
                              {getRoleLabel(user.role)}
                            </span>
                          </div>
                          {user.role === 'TECHNICIAN' && user.commissionRate !== undefined && (
                            <Badge variant="outline" className="text-xs w-fit">
                              {user.commissionRate}% {t('commissionRateLabel').replace(' (%)', '')}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={user.isActive}
                            onCheckedChange={() =>
                              handleToggleStatus(user.id)
                            }
                          />
                          <Badge
                            variant={user.isActive ? 'default' : 'secondary'}
                          >
                            {user.isActive ? t('active') : t('inactive')}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.lastLoginAt ? (
                          <span className="text-sm text-muted-foreground">
                            {formatDateTime(user.lastLoginAt)}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {t('never')}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(user.createdAt)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleEdit(user)}>
                              <Edit className="h-4 w-4 mr-2" />
                              {t('edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleStatus(user.id)}
                            >
                              {user.isActive ? (
                                <>
                                  <Lock className="h-4 w-4 mr-2" />
                                  {t('deactivate')}
                                </>
                              ) : (
                                <>
                                  <Unlock className="h-4 w-4 mr-2" />
                                  {t('activate')}
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(user.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t('delete')}
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
