import { requireAdminSession } from '@/lib/admin-session'
import { redirect } from 'next/navigation'
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
 try { await requireAdminSession('bigcat') } catch { redirect('/admin-portal') }
 return <>{children}</>
}
