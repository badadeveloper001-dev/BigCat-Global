import 'server-only'
import { createHmac, timingSafeEqual, createHash } from 'node:crypto'
import { cookies } from 'next/headers'
export const scopes = ['bigcat', 'orchid', 'trade-logistics'] as const
export type AdminScope = typeof scopes[number]
export const adminCookie = 'bigcat_admin_session'
export class AdminAccessError extends Error { constructor(public code: string, message: string, public status = 403) { super(message) } }
const roles = { bigcat: 'admin', orchid: 'orchid_admin', 'trade-logistics': 'trade_logistics_admin' }
const names = { bigcat: 'ADMIN_BIGCAT_ACCESS_CODE', orchid: 'ADMIN_ORCHID_ACCESS_CODE', 'trade-logistics': 'ADMIN_LOGISTICS_ACCESS_CODE' }
function secret() { const value = process.env.ADMIN_SESSION_SECRET; if (!value || value.length < 32) throw new AdminAccessError('CONFIGURATION_REQUIRED', 'Admin session configuration is missing. Contact the platform owner.', 503); return value }
export function equalSecret(a: string, b: string) { return timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest()) }
function configuredCode(scope: AdminScope) { return process.env[names[scope]] || '' }
function codeVersion(scope: AdminScope) { return createHmac('sha256', secret()).update(configuredCode(scope)).digest('base64url') }
export function scopeForAccessCode(code: string): AdminScope | undefined {
 secret()
 const configured = scopes.filter(scope => configuredCode(scope).length >= 16)
 if (!configured.length) throw new AdminAccessError('CONFIGURATION_REQUIRED', 'Admin access codes are not configured.', 503)
 if (new Set(configured.map(configuredCode)).size !== configured.length) throw new AdminAccessError('CONFIGURATION_REQUIRED', 'Each admin dashboard must have a distinct access code.', 503)
 let match: AdminScope | undefined
 for (const scope of configured) if (equalSecret(code, configuredCode(scope))) match = scope
 return match
}
export function signAdminSession(scope: AdminScope) {
 const payload = Buffer.from(JSON.stringify({ scope, version: codeVersion(scope), expires: Date.now() + 3600000 })).toString('base64url')
 return payload + '.' + createHmac('sha256', secret()).update(payload).digest('base64url')
}
export function verifyAdminSession(token: string, scope?: AdminScope) {
 const [payload, signature, extra] = token.split('.')
 if (!payload || !signature || extra || !equalSecret(signature, createHmac('sha256', secret()).update(payload).digest('base64url'))) throw new Error('Admin access code required.')
 const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
 if (!scopes.includes(session.scope) || !Number.isFinite(session.expires) || session.expires <= Date.now()) throw new Error('Admin access denied.')
 const sessionScope = session.scope as AdminScope
 if (configuredCode(sessionScope).length < 16 || session.version !== codeVersion(sessionScope) || (scope && sessionScope !== 'bigcat' && scope !== sessionScope)) throw new Error('Admin access denied.')
 return { id: 'admin-code:' + sessionScope, role: roles[sessionScope], scope: sessionScope }
}
export async function requireAdminSession(scope?: AdminScope) {
 return verifyAdminSession((await cookies()).get(adminCookie)?.value || '', scope)
}
