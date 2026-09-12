import { NextResponse } from 'next/server'
import { preparePilotOrder } from '@/lib/pilot-checkout'
export async function POST(request: Request) {
  try {
    const q = await preparePilotOrder(await request.json())
    return NextResponse.json({ success: true, productTotal: q.productTotal, deliveryFee: q.deliveryFee, promotionDiscount: q.discount, couponDiscount: q.couponDiscount, fee: q.fee, grandTotal: q.grandTotal, currency: 'NGN', isTest: true })
  } catch (e: any) { return NextResponse.json({ success: false, error: e.message }, { status: 400 }) }
}
