'use client'
import { useRole } from '@/lib/role-context'
export function LocalizedText({ en, zh }: { en: string; zh: string }) {
 const { preferences } = useRole()
 return <>{preferences.language === 'zh' ? zh : en}</>
}
