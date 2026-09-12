import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/supabase/admin-auth'
import { getAdminSupportIssues, updateSupportIssueStatus } from '@/lib/support-issues-actions'

export async function GET(request: NextRequest) {
  const adminAuth = await requireAdminUser(request)
  if (adminAuth.response) return adminAuth.response

  try {
    const result = await getAdminSupportIssues()
    return NextResponse.json(result, { status: result.success ? 200 : 400 })
  } catch (error) {
    console.error('Admin issues API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error', data: [] },
      { status: 500 },
    )
  }
}

export async function PATCH(request: NextRequest) {
  const adminAuth = await requireAdminUser(request)
  if (adminAuth.response) return adminAuth.response

  try {
    const body = await request.json()
    const issueId = String(body?.issueId || '')
    const status = String(body?.status || '')
    const adminNotes = body?.adminNotes === undefined ? undefined : String(body.adminNotes || '')

    if (!issueId || !status) {
      return NextResponse.json(
        { success: false, error: 'issueId and status are required' },
        { status: 400 },
      )
    }

    const result = await updateSupportIssueStatus(issueId, status, adminNotes)
    return NextResponse.json(result, { status: result.success ? 200 : 400 })
  } catch (error) {
    console.error('Admin issue update API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    )
  }
}
