import 'server-only'
import { getRequestAuthUser } from './request-auth'
import { createClient } from './server'

export async function requireMerchant(expectedId?: string) {
  const { user, error } = await getRequestAuthUser()
  if (error || !user) throw new Error('Please sign in to manage your store.')
  if (expectedId && user.id !== expectedId) throw new Error('You can only manage your own store.')
  const { data: profile, error: profileError } = await createClient().from('auth_users').select('role').eq('id', user.id).single()
  if (profileError || profile?.role !== 'merchant') throw new Error('A merchant account is required.')
  return user.id as string
}
