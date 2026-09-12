export const TEST_FX_RATES = { USD: 1, NGN: 1600, CNY: 7.2 } as const
export const PILOT_NOTICE = 'Test transaction — no money moved.'
export type TestOutcome = 'success' | 'failed' | 'cancelled'
export function requirePilotMode() {
  if (process.env.PAYMENT_MODE !== 'test') throw new Error('Transactions are unavailable. This release only supports PAYMENT_MODE=test.')
}
export function testDeliveryFee(type: string, weight: number) {
  if (type === 'pickup') return 0
  return (type === 'express' ? 2500 : 1000) + Math.ceil(Math.max(0, weight)) * (type === 'express' ? 300 : 150) + 1200
}
