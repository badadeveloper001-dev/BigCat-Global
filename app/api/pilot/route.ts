import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
export async function GET(){return NextResponse.json({isTest:process.env.PAYMENT_MODE==='test'},{headers:{'Cache-Control':'no-store'}})}
