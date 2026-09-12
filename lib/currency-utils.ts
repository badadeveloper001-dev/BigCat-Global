import type { SupportedCurrency } from '@/lib/global-market-config'

type ExchangeRates = Record<SupportedCurrency, number>

// Base: USD. Replace with Orchid exchange-rate API when available.
const USD_BASE_RATES: ExchangeRates = {
  USD: 1,
  NGN: 1600,
  CNY: 7.2,
}

const CURRENCY_LOCALE: Record<SupportedCurrency, string> = {
  NGN: 'en-NG',
  CNY: 'zh-CN',
  USD: 'en-US',
}

function toNumber(value: number | string) {
  const parsed = typeof value === 'string' ? parseFloat(value) : value
  return Number.isFinite(parsed) ? parsed : 0
}

export function convertCurrency(
  amount: number | string,
  from: SupportedCurrency,
  to: SupportedCurrency,
  customRates?: Partial<ExchangeRates>,
): number {
  const numeric = toNumber(amount)
  if (from === to) return numeric

  const rates = { ...USD_BASE_RATES, ...(customRates || {}) }
  const fromRate = Number(rates[from] || 1)
  const toRate = Number(rates[to] || 1)

  const amountInUsd = numeric / fromRate
  return amountInUsd * toRate
}

export function formatCurrency(
  amount: number | string,
  currency: SupportedCurrency = 'NGN',
  locale?: string,
): string {
  const numeric = toNumber(amount)

  return new Intl.NumberFormat(locale || CURRENCY_LOCALE[currency], {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numeric)
}

export function formatNaira(amount: number | string): string {
  return formatCurrency(amount, 'NGN', 'en-NG')
}

export function formatGlobalPrice(
  baseAmount: number | string,
  baseCurrency: SupportedCurrency,
  displayCurrency: SupportedCurrency,
): string {
  const converted = convertCurrency(baseAmount, baseCurrency, displayCurrency)
  return formatCurrency(converted, displayCurrency)
}
