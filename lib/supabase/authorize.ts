import 'server-only'
import { createClient } from './server'
import { getRequestAuthUser } from './request-auth'
export async function requireActor(expectedId?: string, roles?: string[]) {
  const { user } = await getRequestAuthUser()
  if (!user) throw new Error('Authentication required')
  if (expectedId && expectedId !== user.id) throw new Error('Access denied')
  const { data: profile, error } = await createClient().from('auth_users').select('id, role, is_suspended').eq('id', user.id).single()
  if (error || !profile || profile.is_suspended) throw new Error('Account unavailable')
  if (roles && !roles.includes(profile.role)) throw new Error('Access denied')
  return { ...user, role: String(profile.role) }
}
export async function requireOrderActor(orderId: string) {
  const actor = await requireActor()
  const { data, error } = await createClient().from('orders').select('buyer_id, merchant_id').eq('id', orderId).single()
  if (error || !data || (actor.role !== 'admin' && actor.id !== data.buyer_id && actor.id !== data.merchant_id)) throw new Error('Access denied')
  return actor
}
