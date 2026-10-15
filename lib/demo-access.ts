import { getRequestAuthUser } from '@/lib/supabase/request-auth'
import { createClient } from '@/lib/supabase/server'

export async function isPilotBuyer(): Promise<boolean> {
  const { user } = await getRequestAuthUser()
  const allowedEmail = process.env.BIGCAT_DEMO_BUYER_EMAIL
  if (!allowedEmail || !user?.id || user.email?.toLowerCase() !== allowedEmail.toLowerCase()) return false
  const { data, error } = await createClient().from('auth_users').select('id, email, role').eq('id', user.id).maybeSingle()
  return !error && data?.id === user.id && data?.role === 'buyer' && data?.email?.toLowerCase() === allowedEmail.toLowerCase()
}
