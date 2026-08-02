export type SupportedCountry = 'NG' | 'CN'
export type SupportedLanguage = 'en' | 'zh'
export type SupportedCurrency = 'NGN' | 'CNY' | 'USD'

export type GlobalPreferences = {
  country: SupportedCountry
  language: SupportedLanguage
  currency: SupportedCurrency
  aiLanguage: SupportedLanguage
  region: string
}

export const COUNTRY_CONFIG: Record<SupportedCountry, {
  label: string
  defaultLanguage: SupportedLanguage
  defaultCurrency: SupportedCurrency
  timezone: string
}> = {
  NG: {
    label: 'Nigeria',
    defaultLanguage: 'en',
    defaultCurrency: 'NGN',
    timezone: 'Africa/Lagos',
  },
  CN: {
    label: 'China',
    defaultLanguage: 'zh',
    defaultCurrency: 'CNY',
    timezone: 'Asia/Shanghai',
  },
}

export const DEFAULT_GLOBAL_PREFERENCES: GlobalPreferences = {
  country: 'NG',
  language: 'en',
  currency: 'NGN',
  aiLanguage: 'en',
  region: 'Lagos',
}

export function detectCountryFromBrowser(): SupportedCountry {
  if (typeof window === 'undefined') return DEFAULT_GLOBAL_PREFERENCES.country

  const locale = String(window.navigator.language || '').toLowerCase()
  if (locale.includes('zh') || locale.includes('-cn')) return 'CN'

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    if (tz.includes('Shanghai')) return 'CN'
  } catch {
    // Ignore timezone detection failures.
  }

  return 'NG'
}

export function buildDefaultPreferences(country?: SupportedCountry): GlobalPreferences {
  const resolvedCountry = country || DEFAULT_GLOBAL_PREFERENCES.country
  const countryConfig = COUNTRY_CONFIG[resolvedCountry]

  return {
    ...DEFAULT_GLOBAL_PREFERENCES,
    country: resolvedCountry,
    language: countryConfig.defaultLanguage,
    currency: countryConfig.defaultCurrency,
    aiLanguage: countryConfig.defaultLanguage,
    region: resolvedCountry === 'CN' ? 'Guangdong' : 'Lagos',
  }
}

export function applyCountryPreset(current: GlobalPreferences, country: SupportedCountry): GlobalPreferences {
  const preset = buildDefaultPreferences(country)
  return {
    ...current,
    country,
    language: preset.language,
    currency: preset.currency,
    aiLanguage: preset.aiLanguage,
    region: current.region || preset.region,
  }
}
