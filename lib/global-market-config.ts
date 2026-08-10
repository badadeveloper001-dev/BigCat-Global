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

const UI_TEXT: Record<SupportedLanguage, Record<string, string>> = {
  en: {
    heroTitleLine1: 'Trade without',
    heroTitleLine2: 'language barriers.',
    heroTitleLine3: 'Grow globally.',
    heroDescription: 'BigCat Global connects buyers and merchants between Nigeria and China with trusted escrow, multilingual support, and fast discovery.',
    startSelling: 'Start Selling Today',
    browseProducts: 'Browse Products',
    browse: 'Browse',
    products: 'Products',
    messages: 'Messages',
    trustNotice: 'Buyer safety reminder: always ask for photo or video proof before payment or delivery confirmation.',
    escrow: 'Escrow protected',
    shipping: 'Shipping & delivery',
    reviews: 'Trusted by buyers',
    regionBadge: 'Recommended for your region',
    locationAuto: 'Automatically adapting to your detected location',
    manualSwitch: 'You can switch languages manually anytime',
    regionLabel: 'Region',
  },
  zh: {
    heroTitleLine1: '无需',
    heroTitleLine2: '语言障碍地',
    heroTitleLine3: '全球拓展。',
    heroDescription: 'BigCat Global 连接尼日利亚与中国的买家和商家，提供可信托管、双语支持与快速发现体验。',
    startSelling: '立即开始销售',
    browseProducts: '浏览产品',
    browse: '浏览',
    products: '产品',
    messages: '消息',
    trustNotice: '买家安全提醒：在付款或确认收货前，请务必要求卖家提供照片或视频证明。',
    escrow: '托管保护',
    shipping: '运输与交付',
    reviews: '买家信赖',
    regionBadge: '为您所在地区推荐',
    locationAuto: '已根据您的检测位置自动适配',
    manualSwitch: '您随时可以手动切换语言',
    regionLabel: '地区',
  },
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

export async function detectCountryAndRegionFromBrowser(): Promise<GlobalPreferences> {
  const fallback = buildDefaultPreferences(detectCountryFromBrowser())

  if (typeof window === 'undefined' || !('geolocation' in navigator)) {
    return fallback
  }

  try {
    const position = await new Promise<GeolocationPosition | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (nextPosition) => resolve(nextPosition),
        () => resolve(null),
        { enableHighAccuracy: false, maximumAge: 60_000, timeout: 4_000 },
      )
    })

    if (!position) return fallback

    const response = await fetch(`/api/location?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}`, { cache: 'no-store' })
    if (!response.ok) return fallback

    const result = await response.json()
    const countryName = String(result?.data?.country || '').toLowerCase()
    const detectedCountry: SupportedCountry = countryName.includes('china') ? 'CN' : 'NG'
    const region = String(result?.data?.city || result?.data?.state || fallback.region || '')

    return {
      ...fallback,
      country: detectedCountry,
      language: COUNTRY_CONFIG[detectedCountry].defaultLanguage,
      currency: COUNTRY_CONFIG[detectedCountry].defaultCurrency,
      aiLanguage: COUNTRY_CONFIG[detectedCountry].defaultLanguage,
      region: region || fallback.region,
    }
  } catch {
    return fallback
  }
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

export function getLocalizedText(key: string, language: SupportedLanguage = 'en'): string {
  return UI_TEXT[language]?.[key] || UI_TEXT.en[key] || key
}

export function getLanguageLabel(language: SupportedLanguage): string {
  return language === 'zh' ? '中文' : 'English'
}
