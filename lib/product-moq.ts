export function productMoq(value: unknown): number {
 const n = Number(value ?? 1)
 return Number.isSafeInteger(n) && n >= 1 ? n : 1
}
export function validateMoq(value: unknown): number {
 const n = Number(value ?? 1)
 if (!Number.isSafeInteger(n) || n < 1 || n > 99999999) throw new Error('Minimum order quantity must be a whole number between 1 and 99999999.')
 return n
}
