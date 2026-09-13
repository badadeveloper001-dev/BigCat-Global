export function optionalCoordinate(value: unknown, maximum: number): number | null {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) && Math.abs(number) <= maximum ? number : null
}

export function distanceForSort(value: unknown): number {
  const distance = optionalCoordinate(value, Number.MAX_VALUE)
  return distance !== null && distance >= 0 ? distance : Number.POSITIVE_INFINITY
}

// Quote the PostgREST value so punctuation cannot become filter syntax.
export function searchFilterValue(value: string): string {
  const literal = value.trim().slice(0, 200).replace(/[\\%_]/g, '\\$&')
  return JSON.stringify('%' + literal + '%')
}
