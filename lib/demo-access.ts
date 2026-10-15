import { getRequestAuthUser } from '@/lib/supabase/request-auth'

export async function isPilotBuyer(): Promise<boolean> {
  const { user } = await getRequestAuthUser()
  const allowedEmail = process.env.BIGCAT_DEMO_BUYER_EMAIL
  return Boolean(allowedEmail && user?.id && user.email?.toLowerCase() === allowedEmail.toLowerCase())
}
