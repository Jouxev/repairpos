import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertTriangle,
  Save,
  Store,
  Users,
  Bell,
  Shield,
  Printer,
  Database,
  RefreshCw,
  RotateCcw,
  HardDriveDownload,
  FolderOpen,
  Clock3,
  FileArchive,
  ShieldAlert,
  CheckCircle2,
  Globe,
  Palette,
  Building2,
  Phone,
  Mail,
  MapPin,
  Percent,
  ChevronRight,
  ExternalLink,
  History,
  Settings2,
  Package,
  Wrench,
  Receipt,
} from 'lucide-react'
import UserManagement from '@/components/settings/UserManagement'
import PrintingSettings from './PrintingSettings'
import { shopSettingsService } from '@/services/shopSettingsService'
import backupService, { DatabaseBackupFile } from '@/services/backupService'
import { toast } from 'sonner'
import { useAppSettings, getTranslatedCurrencyLabel, getTranslatedLanguageLabel } from '@/contexts/AppSettingsContext'
import { getCurrencySymbol, type AppCurrency, type AppLanguage } from '@/lib/appPreferences'
import { cn } from '@/lib/utils'

export default function Settings() {
  const { t, refresh } = useAppSettings()
  const [isLoading, setIsLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [isBackupLoading, setIsBackupLoading] = useState(false)
  const [backupFolderPath, setBackupFolderPath] = useState('')
  const [databaseBackups, setDatabaseBackups] = useState<DatabaseBackupFile[]>([])
  const [backupStats, setBackupStats] = useState<Awaited<ReturnType<typeof backupService.getBackupStats>> | null>(null)
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('shop')
  const [shopForm, setShopForm] = useState({
    shopName: '',
    shopPhone: '',
    shopEmail: '',
    shopAddress: '',
    currency: 'USD',
    language: 'en',
    taxRate: '0',
  })

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsInitializing(true)
        const settings = await shopSettingsService.getSettings()
        setShopForm({
          shopName: settings.shopName || '',
          shopPhone: settings.shopPhone || '',
          shopEmail: settings.shopEmail || '',
          shopAddress: settings.shopAddress || '',
          currency: settings.currency || 'USD',
          language: settings.language || 'en',
          taxRate: String(settings.taxRate ?? 0),
        })
      } catch (error) {
        console.error('Failed to load shop settings:', error)
        toast.error(t('failedToLoadShopSettings'))
      } finally {
        setIsInitializing(false)
      }
    }

    loadSettings()
    loadBackupData()
  }, [])

  const formatBackupSize = (size: number) => {
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${(size / (1024 * 1024)).toFixed(2)} MB`
  }

  const formatBackupDate = (value: string) => new Date(value).toLocaleString()

  const loadBackupData = async () => {
    try {
      setIsBackupLoading(true)
      const [stats, backupDirectoryData] = await Promise.all([
        backupService.getBackupStats(),
        backupService.listDatabaseBackups(),
      ])
      setBackupStats(stats)
      setBackupFolderPath(backupDirectoryData.folderPath)
      setDatabaseBackups(backupDirectoryData.backups)
    } catch (error) {
      console.error('Failed to load backup data:', error)
      toast.error(t('failedToLoadBackupData'))
    } finally {
      setIsBackupLoading(false)
    }
  }

  const handleFieldChange = (field: keyof typeof shopForm, value: string) => {
    setShopForm((current) => ({ ...current, [field]: value }))
  }

  const handleSave = async () => {
    try {
      setIsLoading(true)
      await shopSettingsService.updateSettings({
        shopName: shopForm.shopName.trim() || 'RepairPro Shop',
        shopPhone: shopForm.shopPhone.trim(),
        shopEmail: shopForm.shopEmail.trim(),
        shopAddress: shopForm.shopAddress.trim(),
        currency: shopForm.currency as AppCurrency,
        currencySymbol: getCurrencySymbol(shopForm.currency),
        language: shopForm.language as AppLanguage,
        taxRate: Number.parseFloat(shopForm.taxRate || '0') || 0,
      })
      shopSettingsService.clearCache()
      await refresh()
      toast.success(t('shopSettingsSaved'))
    } catch (error) {
      console.error('Failed to save shop settings:', error)
      toast.error(t('failedToSaveShopSettings'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateDatabaseBackup = async () => {
    try {
      setIsBackupLoading(true)
      const result = await backupService.createDatabaseBackup()
      toast.success(t('databaseBackupCreatedIn', { path: result.folderPath }))
      await loadBackupData()
    } catch (error) {
      console.error('Failed to create database backup:', error)
      toast.error(t('failedToCreateDatabaseBackup'))
    } finally {
      setIsBackupLoading(false)
    }
  }

  const handleRestoreDatabase = async (backupPath?: string) => {
    try {
      setIsBackupLoading(true)
      await backupService.restoreDatabaseBackup(backupPath)
      toast.success(t('databaseRestoredReload'))
      setIsRestoreDialogOpen(false)
      setTimeout(() => window.location.reload(), 500)
    } catch (error: any) {
      if (error?.message === 'Restore cancelled') {
        toast.info(t('restoreCancelled'))
      } else {
        console.error('Failed to restore database:', error)
        toast.error(t('failedToRestoreDatabase'))
      }
    } finally {
      setIsBackupLoading(false)
    }
  }

  const handleResetDatabase = async () => {
    try {
      setIsBackupLoading(true)
      const backupPath = await backupService.resetDatabase()
      toast.success(
        backupPath
          ? t('databaseResetWithBackup', { path: backupPath })
          : t('databaseResetSuccess'),
      )
      setIsResetDialogOpen(false)
      setTimeout(() => window.location.reload(), 500)
    } catch (error) {
      console.error('Failed to reset database:', error)
      toast.error(t('failedToResetDatabase'))
    } finally {
      setIsBackupLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-enter">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">{t('settings')}</h1>
            <Badge variant="secondary" className="text-xs font-normal">
              v1.0
            </Badge>
          </div>
          <p className="text-muted-foreground">{t('manageApplicationSettings')}</p>
        </div>
        <Button onClick={handleSave} disabled={isLoading} size="lg" className="gap-2">
          <Save className="h-4 w-4" />
          {isLoading ? t('saving') : t('saveChanges')}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto gap-1 bg-muted/20 p-1 rounded-2xl">
          <TabsTrigger value="shop" className="gap-2 rounded-xl data-[state=active]:shadow-sm">
            <Store className="h-4 w-4" />
            <span className="hidden sm:inline">{t('shop')}</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2 rounded-xl data-[state=active]:shadow-sm">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">{t('users')}</span>
          </TabsTrigger>
          <TabsTrigger value="printing" className="gap-2 rounded-xl data-[state=active]:shadow-sm">
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">{t('printerTemplates')}</span>
          </TabsTrigger>
          <TabsTrigger value="database" className="gap-2 rounded-xl data-[state=active]:shadow-sm">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">{t('database')}</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2 rounded-xl data-[state=active]:shadow-sm">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">{t('notifications')}</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2 rounded-xl data-[state=active]:shadow-sm">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">{t('security')}</span>
          </TabsTrigger>
        </TabsList>

        {/* Shop Settings Tab */}
        <TabsContent value="shop" className="space-y-6">
          <Card className="border-border/50 overflow-hidden">
            <CardHeader className="border-b border-border/50 bg-muted/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-primary/10 p-3">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>{t('shopInformation')}</CardTitle>
                  <CardDescription>{t('updateShopDetails')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {isInitializing ? (
                <div className="rounded-2xl border bg-muted/30 px-6 py-8 text-center text-sm text-muted-foreground">
                  <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  {t('loadingShopSettings')}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="shopName" className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {t('shopName')}
                      </Label>
                      <Input
                        id="shopName"
                        value={shopForm.shopName}
                        onChange={(event) => handleFieldChange('shopName', event.target.value)}
                        placeholder="RepairPro Shop"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {t('phoneNumber')}
                      </Label>
                      <Input
                        id="phone"
                        value={shopForm.shopPhone}
                        onChange={(event) => handleFieldChange('shopPhone', event.target.value)}
                        placeholder="+1234567890"
                        className="h-11"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {t('email')}
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={shopForm.shopEmail}
                      onChange={(event) => handleFieldChange('shopEmail', event.target.value)}
                      placeholder="contact@repairpro.com"
                      className="h-11"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="address" className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {t('address')}
                    </Label>
                    <Input
                      id="address"
                      value={shopForm.shopAddress}
                      onChange={(event) => handleFieldChange('shopAddress', event.target.value)}
                      placeholder="123 Main St, City, Country"
                      className="h-11"
                    />
                  </div>

                  <Separator />

                  <div className="grid gap-6 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="currency" className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        {t('currency')}
                      </Label>
                      <Select value={shopForm.currency} onValueChange={(value) => handleFieldChange('currency', value)}>
                        <SelectTrigger id="currency" className="h-11">
                          <SelectValue placeholder={t('selectCurrency')} />
                        </SelectTrigger>
                        <SelectContent>
                          {(['DZD', 'EUR', 'USD'] as AppCurrency[]).map((currency) => (
                            <SelectItem key={currency} value={currency}>
                              {getTranslatedCurrencyLabel(currency, t)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="language" className="flex items-center gap-2">
                        <Palette className="h-4 w-4 text-muted-foreground" />
                        {t('language')}
                      </Label>
                      <Select value={shopForm.language} onValueChange={(value) => handleFieldChange('language', value)}>
                        <SelectTrigger id="language" className="h-11">
                          <SelectValue placeholder={t('selectLanguage')} />
                        </SelectTrigger>
                        <SelectContent>
                          {(['en', 'fr', 'ar'] as AppLanguage[]).map((language) => (
                            <SelectItem key={language} value={language}>
                              {getTranslatedLanguageLabel(language, t)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="taxRate" className="flex items-center gap-2">
                        <Percent className="h-4 w-4 text-muted-foreground" />
                        {t('taxRate')}
                      </Label>
                      <Input
                        id="taxRate"
                        type="number"
                        value={shopForm.taxRate}
                        onChange={(event) => handleFieldChange('taxRate', event.target.value)}
                        placeholder="0"
                        className="h-11"
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border bg-success/5 p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-success shrink-0" />
                      <div>
                        <p className="font-medium text-sm">{t('allSettingsSaved')}</p>
                        <p className="text-xs text-muted-foreground mt-1">{t('settingsAutoSaved')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <UserManagement />
        </TabsContent>

        <TabsContent value="printing">
          <PrintingSettings />
        </TabsContent>

        {/* Database Settings Tab */}
        <TabsContent value="database" className="space-y-6">
          <Card className="border-border/50 overflow-hidden">
            <CardHeader className="border-b border-border/50 bg-muted/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-primary/10 p-3">
                  <Database className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>{t('databaseBackupFolder')}</CardTitle>
                  <CardDescription>{t('allBackupsStoredDedicated')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Backup Location */}
              <div className="flex flex-col gap-4 rounded-2xl border bg-muted/20 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl bg-primary/10 p-3 text-primary shrink-0">
                    <FolderOpen className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">{t('backupFolderLabel')}</p>
                    <p className="break-all text-sm text-muted-foreground font-mono">
                      {backupFolderPath || t('loadingBackupFolder')}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="w-fit shrink-0">
                  {t('autoCreatedBackupLocation')}
                </Badge>
              </div>

              {/* Stats Grid */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: t('products'), value: backupStats?.totalProducts ?? 0, icon: Package, color: 'bg-blue-500/10 text-blue-600' },
                  { label: t('sales'), value: backupStats?.totalSales ?? 0, icon: Receipt, color: 'bg-emerald-500/10 text-emerald-600' },
                  { label: t('repairs'), value: backupStats?.totalRepairs ?? 0, icon: Wrench, color: 'bg-amber-500/10 text-amber-600' },
                  { label: t('clients'), value: backupStats?.totalCustomers ?? 0, icon: Users, color: 'bg-purple-500/10 text-purple-600' },
                ].map((stat) => {
                  const StatIcon = stat.icon
                  return (
                    <div key={stat.label} className="rounded-2xl border bg-card p-4 shadow-sm transition-all duration-200 hover:shadow-md">
                      <div className="flex items-center gap-3">
                        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", stat.color)}>
                          <StatIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{stat.value}</p>
                          <p className="text-xs text-muted-foreground">{stat.label}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button onClick={handleCreateDatabaseBackup} disabled={isBackupLoading} size="lg" className="gap-2">
                  <HardDriveDownload className="h-4 w-4" />
                  {isBackupLoading ? t('creatingBackup') : t('createDbBackup')}
                </Button>
                <Button variant="outline" onClick={loadBackupData} disabled={isBackupLoading} className="gap-2">
                  <RefreshCw className={`h-4 w-4 ${isBackupLoading ? 'animate-spin' : ''}`} />
                  {t('refreshBackups')}
                </Button>
                <Button variant="outline" onClick={() => setIsRestoreDialogOpen(true)} disabled={isBackupLoading} className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  {t('restoreDatabase')}
                </Button>
                <Button variant="destructive" onClick={() => setIsResetDialogOpen(true)} disabled={isBackupLoading} className="gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  {t('resetDatabase')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Backups */}
          <Card className="border-border/50 overflow-hidden">
            <CardHeader className="border-b border-border/50 bg-muted/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-primary/10 p-3">
                  <History className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>{t('recentDatabaseBackups')}</CardTitle>
                  <CardDescription>{t('reviewGeneratedBackups')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-muted/20 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-emerald-500/10 p-2 text-emerald-600">
                    <FileArchive className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t('availableBackups')}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('backupsReadyRestore', { count: databaseBackups.length, suffix: databaseBackups.length === 1 ? '' : 's' })}
                    </p>
                  </div>
                </div>
                <Badge variant="outline">
                  {databaseBackups.length > 0 
                    ? t('latestBackupLabel', { date: formatBackupDate(databaseBackups[0].updatedAt) }) 
                    : t('noBackupsYet')}
                </Badge>
              </div>

              {databaseBackups.length === 0 ? (
                <div className="rounded-2xl border border-dashed bg-muted/20 p-10 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                    <Database className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="font-medium">{t('noDatabaseBackupsFoundYet')}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{t('createFirstBackupProtect')}</p>
                  <Button className="mt-4" onClick={handleCreateDatabaseBackup} disabled={isBackupLoading}>
                    <HardDriveDownload className="mr-2 h-4 w-4" />
                    {t('createDbBackup')}
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {databaseBackups.slice(0, 10).map((backup, index) => (
                    <div
                      key={backup.filePath}
                      className="rounded-2xl border bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/30"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "rounded-2xl p-3",
                            index === 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                          )}>
                            <Database className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate font-medium">{backup.filename}</p>
                              {index === 0 && <Badge className="text-[10px]">{t('latest')}</Badge>}
                            </div>
                            <p className="mt-1 break-all text-xs text-muted-foreground font-mono">{backup.filePath}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="shrink-0">{formatBackupSize(backup.size)}</Badge>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl bg-muted/30 p-3">
                          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <Clock3 className="h-3.5 w-3.5" />
                            {t('updated')}
                          </div>
                          <p className="mt-1 text-sm font-medium">{formatBackupDate(backup.updatedAt)}</p>
                        </div>
                        <div className="rounded-xl bg-muted/30 p-3">
                          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <FolderOpen className="h-3.5 w-3.5" />
                            {t('created')}
                          </div>
                          <p className="mt-1 text-sm font-medium">{formatBackupDate(backup.createdAt)}</p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <Button
                          variant="outline"
                          onClick={() => handleRestoreDatabase(backup.filePath)}
                          disabled={isBackupLoading}
                          className="w-full gap-2"
                        >
                          <RotateCcw className="h-4 w-4" />
                          {t('restoreThisBackup')}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card className="border-border/50 overflow-hidden">
            <CardHeader className="border-b border-border/50 bg-muted/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-primary/10 p-3">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>{t('notificationSettings')}</CardTitle>
                  <CardDescription>{t('configureNotificationPreferences')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {[
                { title: t('emailNotifications'), desc: t('receiveEmailUpdates'), icon: Mail },
                { title: t('lowStockAlerts'), desc: t('getNotifiedInventoryLow'), icon: Package },
                { title: t('repairStatusUpdates'), desc: t('notifyCustomersRepairStatus'), icon: Wrench },
              ].map((setting) => (
                <div key={setting.title} className="flex items-center justify-between rounded-2xl border bg-card p-4 transition-all duration-200 hover:bg-muted/20">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <setting.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{setting.title}</p>
                      <p className="text-sm text-muted-foreground">{setting.desc}</p>
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card className="border-border/50 overflow-hidden">
            <CardHeader className="border-b border-border/50 bg-muted/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-primary/10 p-3">
                  <ShieldAlert className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>{t('securitySettingsTitle')}</CardTitle>
                  <CardDescription>{t('manageSecurityPrivacySettings')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="rounded-2xl border bg-amber-50/50 dark:bg-amber-950/20 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600 shrink-0" />
                  <div>
                    <p className="font-medium text-sm text-amber-800 dark:text-amber-300">{t('passwordSecurityTip')}</p>
                    <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-1">{t('passwordSecurityDesc')}</p>
                  </div>
                </div>
              </div>
              
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword" className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    {t('currentPasswordLabel')}
                  </Label>
                  <Input id="currentPassword" type="password" className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    {t('newPassword')}
                  </Label>
                  <Input id="newPassword" type="password" className="h-11" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('confirmNewPassword')}</Label>
                <Input id="confirmPassword" type="password" className="h-11" />
              </div>
              
              <Button className="gap-2">
                <ShieldAlert className="h-4 w-4" />
                {t('changePassword')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Restore Dialog */}
      <Dialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('restoreDbDialogTitle')}</DialogTitle>
            <DialogDescription>{t('restoreDbDialogDesc')}</DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl border bg-amber-50/50 dark:bg-amber-950/20 p-4 text-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-300">{t('warning')}</p>
                <p className="text-amber-600/80 dark:text-amber-400/80 mt-1">{t('restoreDbDialogHelp')}</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRestoreDialogOpen(false)} disabled={isBackupLoading}>
              {t('cancel')}
            </Button>
            <Button onClick={() => handleRestoreDatabase()} disabled={isBackupLoading} className="gap-2">
              {isBackupLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <FolderOpen className="h-4 w-4" />
              )}
              {isBackupLoading ? t('restoring') : t('chooseBackupFile')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Dialog */}
      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('resetDbDialogTitle')}</DialogTitle>
            <DialogDescription>{t('resetDbDialogDesc')}</DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
            <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-destructive" />
            <div>
              <p className="font-semibold text-foreground">{t('dangerZone')}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t('resetWarningText')}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetDialogOpen(false)} disabled={isBackupLoading}>
              {t('cancel')}
            </Button>
            <Button variant="destructive" onClick={handleResetDatabase} disabled={isBackupLoading} className="gap-2">
              {isBackupLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              {isBackupLoading ? t('resetting') : t('resetDbDialogTitle')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}