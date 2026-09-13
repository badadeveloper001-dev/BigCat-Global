import { NextRequest, NextResponse } from 'next/server'
import { sendMessage } from '@/lib/message-actions'
import { requireAuthenticatedUser } from '@/lib/supabase/request-auth'

export async function POST(request: NextRequest) {
  try {
    const { conversationId, senderId, content, senderLanguage } = await request.json()
    const trimmedContent = typeof content === 'string' ? content.trim() : ''

    if (!conversationId || !senderId || !trimmedContent) {
      return NextResponse.json(
        { success: false, error: 'Conversation ID, sender ID, and content are required' },
        { status: 400 }
      )
    }

    const auth = await requireAuthenticatedUser(senderId, request)
    if (auth.response) return auth.response

    const resolvedSenderLanguage = senderLanguage === 'zh' ? 'zh' : 'en'
    const result = await sendMessage(conversationId, senderId, trimmedContent, resolvedSenderLanguage)
    return NextResponse.json(result, { status: result.success ? 200 : ('code' in result && result.code === 'POLICY_USER_SUSPENDED' ? 403 : 400) })
  } catch (error) {
    console.error('Send message API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
