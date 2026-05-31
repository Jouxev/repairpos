export type AppLanguage = 'en' | 'fr' | 'ar'
export type AppCurrency = 'DZD' | 'EUR' | 'USD'

export interface LanguageOption {
  code: AppLanguage
  label: string
  nativeLabel: string
  locale: string
  direction: 'ltr' | 'rtl'
}

export interface CurrencyOption {
  code: AppCurrency
  label: string
  symbol: string
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', locale: 'en-US', direction: 'ltr' },
  { code: 'fr', label: 'French', nativeLabel: 'Français', locale: 'fr-FR', direction: 'ltr' },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية', locale: 'ar-DZ', direction: 'rtl' },
]

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: 'DZD', label: 'Algerian Dinar', symbol: 'DA' },
  { code: 'EUR', label: 'Euro', symbol: 'EUR' },
  { code: 'USD', label: 'US Dollar', symbol: '$' },
]

export const getLanguageOption = (language?: string): LanguageOption => {
  return LANGUAGE_OPTIONS.find((item) => item.code === language) || LANGUAGE_OPTIONS[0]
}

export const getCurrencyOption = (currency?: string): CurrencyOption => {
  return CURRENCY_OPTIONS.find((item) => item.code === currency) || CURRENCY_OPTIONS[2]
}

export const normalizeLanguage = (language?: string): AppLanguage => {
  return getLanguageOption(language).code
}

export const normalizeCurrency = (currency?: string): AppCurrency => {
  return getCurrencyOption(currency).code
}

export const getCurrencySymbol = (currency?: string): string => {
  return getCurrencyOption(currency).symbol
}

export const isRtlLanguage = (language?: string): boolean => {
  return getLanguageOption(language).direction === 'rtl'
}
