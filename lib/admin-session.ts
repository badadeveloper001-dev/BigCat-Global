import 'server-only'
import { createHmac, timingSafeEqual, createHash } from 'node:crypto'
import { cookies } from 'next/headers'
import { getRequestAuthUser } from './supabase/request-auth'
import { createClient } from './supabase/server'
export const scopes = ['bigcat', 'orchid', 'trade-logistics'] as const
export type AdminScope = typeof scopes[number]
export const adminCookie = 'bigcat_admin_session'
export class AdminAccessError extends Error { constructor(public code: string, message: string, public status = 403) { super(message) } }
const roles = { bigcat: 'admin', orchid: 'orchid_admin', 'trade-logistics': 'trade_logistics_admin' }
function secret() { const value = process.env.ADMIN_SESSION_SECRET; if (!value || value.length < 32) throw new AdminAccessError('CONFIGURATION_REQUIRED', 'Admin session configuration is missing. Contact the platform owner.', 503); return value }
export function equalSecret(a: string, b: string) { return timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest()) }
export async function adminIdentity() {
 const { user, error } = await getRequestAuthUser()
 if (error || !user) throw new AdminAccessError('SIGN_IN_REQUIRED', 'Sign in with your admin email and password first.', 401)
 const { data, error: profileError } = await createClient().from('auth_users').select('*').eq('id', user.id).single()
 if (profileError) throw new AdminAccessError('PROFILE_UNAVAILABLE', 'Unable to verify your account role. Please try again.', 503)
 if (!data || data.is_suspended === true || !Object.values(roles).includes(data.role)) throw new AdminAccessError('ADMIN_ROLE_REQUIRED', 'This account does not have active administrator access. Ask the platform owner to assign your admin role.')
 return { id: user.id, role: data.role as string }
}
export function allowedRole(role: string, scope: AdminScope) { return role === 'admin' || role === roles[scope] }
export function signAdminSession(id: string, scope: AdminScope) {
 const payload = Buffer.from(JSON.stringify({ id, scope, expires: Date.now() + 3600000 })).toString('base64url')
 return payload + '.' + createHmac('sha256', secret()).update(payload).digest('base64url')
}
export async function requireAdminSession(scope?: AdminScope) {
 const identity = await adminIdentity()
 const token = (await cookies()).get(adminCookie)?.value || ''
 const [payload, signature, extra] = token.split('.')
 if (!payload || !signature || extra || !equalSecret(signature, createHmac('sha256', secret()).update(payload).digest('base64url'))) throw new Error('Admin access code required.')
 const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
 if (session.id !== identity.id || !scopes.includes(session.scope) || !Number.isFinite(session.expires) || session.expires <= Date.now() || !allowedRole(identity.role, session.scope) || (scope && session.scope !== 'bigcat' && scope !== session.scope)) throw new Error('Admin access denied.')
 return { ...identity, scope: session.scope as AdminScope }
}
