import { NextResponse } from 'next/server'
export async function POST() { return NextResponse.json({success:false,error:'Unavailable during the test pilot. Payments are handled atomically through checkout; no real funds can move.'},{status:409}) }
