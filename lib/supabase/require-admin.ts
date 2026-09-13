import 'server-only'
import { requireAdminSession, type AdminScope } from '../admin-session'
export async function requireAdmin(scope: AdminScope = 'bigcat') { return (await requireAdminSession(scope)).id }
