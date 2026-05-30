import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import EntityExportButton from '@/components/common/EntityExportButton'
import { Plus, Search, Users, Loader2, Phone, Mail, MapPin, CreditCard, ChevronRight, UserPlus, ArrowUpDown, Filter } from 'lucide-react'
import { clientService, Client } from '@/services/clientService'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { useLocaleFormatters } from '@/hooks/useLocaleFormatters'
import { useAppSettings } from '@/contexts/AppSettingsContext'

export default function ClientsList() {
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()
  const { formatCurrency } = useLocaleFormatters()
  const { t } = useAppSettings()
  const [searchQuery, setSearchQuery] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'name' | 'balance' | 'newest'>('newest')

  useEffect(() => {
    loadClients()
  }, [location.key])

  const loadClients = async () => {
    try {
      setIsLoading(true)
      const data = await clientService.getClients()
      setClients(data)
    } catch (error) {
      console.error('Error loading clients:', error)
      toast({
        title: t('error'),
        description: t('failedToLoadClient'),
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const filteredClients = Array.isArray(clients)
    ? clients
        .filter(client =>
          client.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          client.phone.includes(searchQuery) ||
          (client.email && client.email.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        .sort((a, b) => {
          switch (sortBy) {
            case 'name': return a.fullName.localeCompare(b.fullName)
            case 'balance': return (b.balance || 0) - (a.balance || 0)
            case 'newest': default: return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          }
        })
    : []

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return 'text-amber-600'
    if (balance < 0) return 'text-success'
    return 'text-muted-foreground'
  }

  const getBalanceLabel = (balance: number) => {
    if (balance > 0) return t('balanceDue')
    if (balance < 0) return t('creditBalance')
    return t('zeroBalance')
  }

  return (
    <div className="space-y-6 animate-enter">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t('clients')}</h1>
          <p className="text-muted-foreground">{t('manageCustomerDatabase')}</p>
        </div>
        <div className="flex items-center gap-2">
          <EntityExportButton entity="clients" />
          <Button onClick={() => navigate('/clients/new')} className="gap-2">
            <UserPlus className="h-4 w-4" />
            {t('createClient')}
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border/50 bg-card p-4 transition-all duration-200 hover:shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{clients.length}</p>
              <p className="text-xs text-muted-foreground">{t('totalClients')}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-4 transition-all duration-200 hover:shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
              <CreditCard className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {formatCurrency(clients.reduce((sum, c) => sum + Math.max(0, c.balance || 0), 0))}
              </p>
              <p className="text-xs text-muted-foreground">{t('totalReceivables')}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-4 transition-all duration-200 hover:shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
              <Phone className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{clients.filter(c => c.phone).length}</p>
              <p className="text-xs text-muted-foreground">{t('withPhoneNumber')}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-4 transition-all duration-200 hover:shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
              <Mail className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{clients.filter(c => c.email).length}</p>
              <p className="text-xs text-muted-foreground">{t('withEmail')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('searchClients')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <span className="text-lg leading-none">&times;</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-lg border bg-background px-2 py-1">
                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="bg-transparent text-sm font-medium outline-none cursor-pointer"
                >
                  <option value="newest">{t('newest')}</option>
                  <option value="name">{t('name')}</option>
                  <option value="balance">{t('balance')}</option>
                </select>
              </div>
              <Badge variant="secondary" className="text-xs">
                {filteredClients.length} {t('clients')}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clients List */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{t('loadingClients')}</p>
          </div>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="font-medium">{t('noCustomersFound')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('tryDifferentSearch')}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate('/clients/new')}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            {t('createClient')}
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredClients.map((client, index) => (
            <div
              key={client.id}
              className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-5 transition-all duration-300 hover-lift cursor-pointer"
              onClick={() => navigate(`/clients/${client.id}`)}
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              
              <div className="relative">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 rounded-xl">
                      <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-semibold">
                        {getInitials(client.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{client.fullName}</h3>
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground truncate">
                          {client.address || t('noAddressSet')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>

                {client.email && (
                  <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-4">
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium">{client.phone}</span>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-sm font-semibold", getBalanceColor(client.balance || 0))}>
                      {formatCurrency(client.balance || 0)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{getBalanceLabel(client.balance || 0)}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}