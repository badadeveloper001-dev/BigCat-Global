import { NextResponse } from 'next/server'
export async function POST() {
 return NextResponse.json({ success: true, isTest: true, charged: 0, added: 0, balance: 100, message: 'Merchant token charges are paused for the pilot.' })
}
