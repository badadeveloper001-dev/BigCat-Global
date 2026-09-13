'use client'
import { cloneElement, type ReactElement, type ReactNode } from 'react'
import { useRole } from '@/lib/role-context'
import { translateUiText } from '@/lib/ui-translation'
/** Used only for app-authored text, never chat or merchant-authored content. */
export function UiText({ text }: { text: string }) { const { preferences } = useRole(); return <>{translateUiText(text, preferences.language)}</> }
export function UiValue({ value }: { value: ReactNode }) { const { preferences } = useRole(); return <>{typeof value === 'string' ? translateUiText(value, preferences.language) : value}</> }
export function UiAttributes({ children }: { children: ReactElement<any> }) {
 const { preferences } = useRole()
 const updates: Record<string, string> = {}
 for (const key of ['placeholder', 'title', 'alt', 'aria-label']) {
  const value = children.props[key]
  if (typeof value === 'string') updates[key] = translateUiText(value, preferences.language)
 }
 return cloneElement(children, updates)
}
