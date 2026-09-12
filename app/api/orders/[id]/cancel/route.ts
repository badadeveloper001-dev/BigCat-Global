import { NextResponse } from 'next/server'
import { updateOrderStatus } from '@/lib/order-actions'
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
 const { id } = await params
 const result = await updateOrderStatus(id, 'cancelled')
 return NextResponse.json(result, { status: result.success ? 200 : 400 })
}
