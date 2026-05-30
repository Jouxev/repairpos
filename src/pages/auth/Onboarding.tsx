import { ChangeEvent, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  ImagePlus,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Store,
  UserCog,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { appSetupService } from '@/services/appSetupService'
import { shopSettingsService } from '@/services/shopSettingsService'
import { useAuthStore } from '@/stores/authStore'
import { useAppSettings, getTranslatedCurrencyLabel, getTranslatedLanguageLabel } from '@/contexts/AppSettingsContext'
import { type AppCurrency, type AppLanguage } from '@/lib/appPreferences'

interface OnboardingProps {
  onCompleted: () => Promise<void> | void
}

const extractBase64Payload = (dataUrl: string) => dataUrl.split(',')[1] || ''

export default function Onboarding({ onCompleted }: OnboardingProps) {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const { t, refresh } = useAppSettings()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [form, setForm] = useState({
    adminFullName: '',
    adminUsername: '',
    adminEmail: '',
    adminPhone: '',
    adminPassword: '',
    adminPasswordConfirm: '',
    shopName: '',
    shopPhone: '',
    shopEmail: '',
    shopAddress: '',
    currency: 'DZD',
    language: 'fr',
  })

  const initials = useMemo(() => {
    return (form.shopName || 'RP')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('')
  }, [form.shopName])

  const previewLines = useMemo(
    () =>
      [
        { icon: Mail, value: form.shopEmail || 'store@example.com' },
        { icon: Phone, value: form.shopPhone || t('phoneNumber') },
        { icon: MapPin, value: form.shopAddress || t('storeAddress') },
      ],
    [form.shopAddress, form.shopEmail, form.shopPhone, t],
  )

  const setupHighlights = [
    {
      icon: ShieldCheck,
      title: t('secureAdminAccess'),
      description: t('secureAdminAccessDesc'),
    },
    {
      icon: Building2,
      title: t('brandedStoreProfile'),
      description: t('brandedStoreProfileDesc'),
    },
    {
      icon: Sparkles,
      title: t('readyFromDayOne'),
      description: t('readyFromDayOneDesc'),
    },
  ]

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleLogoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    if (!file.type.startsWith('image/')) {
      toast.error(t('invalidImageFile'))
      return
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(new Error('Failed to read image file'))
      reader.readAsDataURL(file)
    })

    setLogoFile(file)
    setLogoPreview(dataUrl)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (form.adminPassword !== form.adminPasswordConfirm) {
      toast.error(t('adminPasswordMismatch'))
      return
    }

    if (form.adminPassword.length < 6) {
      toast.error(t('adminPasswordTooShort'))
      return
    }

    try {
      setIsSubmitting(true)

      let shopLogoPath: string | undefined

      if (logoPreview && logoFile) {
        const extension = logoFile.name.includes('.') ? logoFile.name.split('.').pop() : 'png'
        shopLogoPath = await window.electronAPI.image.save({
          base64Data: extractBase64Payload(logoPreview),
          filename: `shop-logo-${Date.now()}.${extension}`,
          folder: 'shop',
        })
      }

      await appSetupService.completeInitialSetup({
        admin: {
          username: form.adminUsername.trim(),
          email: form.adminEmail.trim(),
          password: form.adminPassword,
          fullName: form.adminFullName.trim(),
          phone: form.adminPhone.trim() || undefined,
        },
        shop: {
          shopName: form.shopName.trim(),
          shopPhone: form.shopPhone.trim() || undefined,
          shopEmail: form.shopEmail.trim() || undefined,
          shopAddress: form.shopAddress.trim() || undefined,
          shopLogo: shopLogoPath,
          currency: form.currency,
          language: form.language,
        },
      })

      shopSettingsService.clearCache()
      await refresh()
      await onCompleted()

      const loginSuccess = await login(form.adminUsername.trim(), form.adminPassword)

      if (!loginSuccess) {
        toast.success(t('setupCompletedLogin'))
        navigate('/login', { replace: true })
        return
      }

      toast.success(t('setupCompleted'))
      navigate('/dashboard', { replace: true })
    } catch (error: any) {
      console.error('Failed to complete onboarding:', error)
      toast.error(error.message || 'Failed to complete onboarding')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-2rem)] w-full overflow-hidden rounded-[2rem] border bg-background/95 shadow-2xl backdrop-blur xl:min-h-[calc(100vh-3rem)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.16),transparent_24%)]" />
      <div className="relative grid min-h-[calc(100vh-2rem)] xl:min-h-[calc(100vh-3rem)] lg:grid-cols-[1.15fr_0.85fr]">
        <div className="border-b bg-gradient-to-br from-primary/10 via-background to-background p-8 lg:border-b-0 lg:border-r lg:p-10 xl:p-12">
          <div className="flex h-full flex-col">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="rounded-full px-3 py-1 text-xs font-medium">
                {t('firstTimeSetup')}
              </Badge>
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-medium">
                {t('professionalWorkspace')}
              </Badge>
            </div>

            <div className="mt-8 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                <Store className="h-8 w-8" />
              </div>
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.3em] text-primary/80">RepairPro</p>
                <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
                  {t('launchYourStore')}
                </h1>
              </div>
            </div>

            <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground md:text-lg">
              {t('onboardingLead')}
            </p>

            <div className="mt-8 grid gap-4">
              {setupHighlights.map((item) => {
                const Icon = item.icon
                return (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-border/70 bg-background/80 p-4 shadow-sm backdrop-blur"
                  >
                    <div className="flex items-start gap-4">
                      <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{item.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-8 rounded-[1.75rem] border bg-card p-6 shadow-lg">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('workspacePreview')}</p>
                  <h2 className="mt-1 text-xl font-semibold text-foreground">
                    {form.shopName || t('yourStoreName')}
                  </h2>
                </div>
                <div className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  {t('readyForBranding')}
                </div>
              </div>

              <div className="mt-6 rounded-[1.5rem] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-slate-50 shadow-inner">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Store logo preview"
                        className="h-20 w-20 rounded-[1.25rem] border border-white/10 object-cover shadow-lg"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-[1.25rem] bg-white/10 text-2xl font-bold tracking-wide text-white">
                        {initials || 'RP'}
                      </div>
                    )}
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-slate-300">{t('businessProfile')}</p>
                      <h3 className="mt-2 text-2xl font-semibold">
                        {form.shopName || t('yourStoreName')}
                      </h3>
                      <p className="mt-1 text-sm text-slate-300">
                        {t('adminAccount')}: {form.adminFullName || t('systemAdministrator')}
                      </p>
                    </div>
                  </div>
                  <div className="hidden rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 md:block">
                    {t('premiumSetup')}
                  </div>
                </div>

                <div className="mt-6 grid gap-3">
                  {previewLines.map((line) => {
                    const Icon = line.icon
                    return (
                      <div
                        key={line.value}
                        className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                      >
                        <Icon className="h-4 w-4 text-slate-300" />
                        <span className="text-sm text-slate-100">{line.value}</span>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-6 flex items-center gap-2 text-sm text-slate-300">
                  <BadgeCheck className="h-4 w-4 text-emerald-400" />
                  {t('readySettingsReceipts')}
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border bg-muted/30 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t('step1')}</p>
                  <p className="mt-2 font-semibold">{t('createAdmin')}</p>
                </div>
                <div className="rounded-2xl border bg-muted/30 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t('step2')}</p>
                  <p className="mt-2 font-semibold">{t('brandStore')}</p>
                </div>
                <div className="rounded-2xl border bg-muted/30 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t('step3')}</p>
                  <p className="mt-2 font-semibold">{t('startWorking')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8 lg:p-10 xl:p-12">
          <Card className="border-0 bg-transparent shadow-none">
            <CardHeader className="px-0 pt-0">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-semibold">{t('completeYourSetup')}</CardTitle>
                  <CardDescription className="mt-1 text-sm">
                    {t('onboardingUnlock')}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="px-0 pb-0">
              <form onSubmit={handleSubmit} className="space-y-6">
                <section className="rounded-[1.75rem] border bg-card/70 p-6 shadow-sm">
                  <div className="mb-5 flex items-start gap-4">
                    <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                      <UserCog className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">{t('adminAccount')}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t('adminAccountDesc')}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="adminFullName">{t('fullName')}</Label>
                      <Input
                        id="adminFullName"
                        value={form.adminFullName}
                        onChange={(e) => updateField('adminFullName', e.target.value)}
                        required
                        disabled={isSubmitting}
                        className="h-11 rounded-xl"
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="adminUsername">{t('username')}</Label>
                      <Input
                        id="adminUsername"
                        value={form.adminUsername}
                        onChange={(e) => updateField('adminUsername', e.target.value)}
                        required
                        disabled={isSubmitting}
                        className="h-11 rounded-xl"
                        placeholder="admin"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="adminEmail">{t('email')}</Label>
                      <Input
                        id="adminEmail"
                        type="email"
                        value={form.adminEmail}
                        onChange={(e) => updateField('adminEmail', e.target.value)}
                        required
                        disabled={isSubmitting}
                        className="h-11 rounded-xl"
                        placeholder="admin@yourstore.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="adminPhone">{t('phone')}</Label>
                      <Input
                        id="adminPhone"
                        value={form.adminPhone}
                        onChange={(e) => updateField('adminPhone', e.target.value)}
                        disabled={isSubmitting}
                        className="h-11 rounded-xl"
                        placeholder="+213 ..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="adminPassword">{t('password')}</Label>
                      <Input
                        id="adminPassword"
                        type="password"
                        value={form.adminPassword}
                        onChange={(e) => updateField('adminPassword', e.target.value)}
                        required
                        disabled={isSubmitting}
                        className="h-11 rounded-xl"
                        placeholder="At least 6 characters"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="adminPasswordConfirm">{t('confirmPassword')}</Label>
                      <Input
                        id="adminPasswordConfirm"
                        type="password"
                        value={form.adminPasswordConfirm}
                        onChange={(e) => updateField('adminPasswordConfirm', e.target.value)}
                        required
                        disabled={isSubmitting}
                        className="h-11 rounded-xl"
                        placeholder="Repeat the password"
                      />
                    </div>
                  </div>
                </section>

                <section className="rounded-[1.75rem] border bg-card/70 p-6 shadow-sm">
                  <div className="mb-5 flex items-start gap-4">
                    <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                      <Store className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">{t('storeBranding')}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t('storeBrandingDesc')}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="shopName">{t('storeName')}</Label>
                      <Input
                        id="shopName"
                        value={form.shopName}
                        onChange={(e) => updateField('shopName', e.target.value)}
                        required
                        disabled={isSubmitting}
                        className="h-11 rounded-xl"
                        placeholder="Numidia Digital"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shopPhone">{t('storePhone')}</Label>
                      <Input
                        id="shopPhone"
                        value={form.shopPhone}
                        onChange={(e) => updateField('shopPhone', e.target.value)}
                        disabled={isSubmitting}
                        className="h-11 rounded-xl"
                        placeholder="+213 ..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shopEmail">{t('storeEmail')}</Label>
                      <Input
                        id="shopEmail"
                        type="email"
                        value={form.shopEmail}
                        onChange={(e) => updateField('shopEmail', e.target.value)}
                        disabled={isSubmitting}
                        className="h-11 rounded-xl"
                        placeholder="contact@yourstore.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shopLogo">{t('storeLogo')}</Label>
                      <div className="rounded-xl border border-dashed bg-muted/20 p-3">
                        <Input
                          id="shopLogo"
                          type="file"
                          accept="image/*"
                          onChange={handleLogoChange}
                          disabled={isSubmitting}
                          className="cursor-pointer border-0 bg-transparent px-0 shadow-none file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
                        />
                        <p className="mt-2 text-xs text-muted-foreground">
                          {t('useSquareImage')}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shopLanguage">{t('language')}</Label>
                      <Select
                        value={form.language}
                        onValueChange={(value) => updateField('language', value)}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger id="shopLanguage" className="h-11 rounded-xl">
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
                      <Label htmlFor="shopCurrency">{t('currency')}</Label>
                      <Select
                        value={form.currency}
                        onValueChange={(value) => updateField('currency', value)}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger id="shopCurrency" className="h-11 rounded-xl">
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
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="shopAddress">{t('storeAddress')}</Label>
                      <Textarea
                        id="shopAddress"
                        value={form.shopAddress}
                        onChange={(e) => updateField('shopAddress', e.target.value)}
                        disabled={isSubmitting}
                        className="min-h-[110px] rounded-xl"
                        placeholder="Store address, city, and any important location details"
                      />
                    </div>
                  </div>
                </section>

                <div className="rounded-2xl border bg-muted/20 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">{t('afterSetup')}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t('afterSetupDesc')}
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="h-14 w-full rounded-2xl text-base shadow-lg shadow-primary/20"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {t('completingSetup')}
                    </>
                  ) : (
                    <>
                      {t('finishSetup')}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
