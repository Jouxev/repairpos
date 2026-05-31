import { useAppSettings } from '@/contexts/AppSettingsContext'

export function useLocaleFormatters() {
  const { currencySymbol, locale } = useAppSettings()

  const formatCurrency = (value: number, options?: { signed?: boolean }) => {
    const amount = Number(value || 0)
    const absFormatted = `${currencySymbol}${Math.abs(amount).toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`

    if (options?.signed) {
      if (amount > 0) {
        return `+${absFormatted}`
      }
      if (amount < 0) {
        return `-${absFormatted}`
      }
    }

    return amount < 0 ? `-${absFormatted}` : absFormatted
  }

  const formatNumber = (value: number) => {
    return Number(value || 0).toLocaleString(locale)
  }

  const formatDate = (value: string | Date, options?: Intl.DateTimeFormatOptions) => {
    return new Date(value).toLocaleDateString(locale, options)
  }

  const formatDateTime = (value: string | Date, options?: Intl.DateTimeFormatOptions) => {
    return new Date(value).toLocaleString(locale, options)
  }

  return {
    currencySymbol,
    locale,
    formatCurrency,
    formatNumber,
    formatDate,
    formatDateTime,
  }
}
