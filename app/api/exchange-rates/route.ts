import { NextResponse } from 'next/server'
import { TEST_FX_RATES } from '@/lib/pilot-config'
export async function GET() { return NextResponse.json({success:true,rates:TEST_FX_RATES,isTest:true,source:'Fixed pilot rates',base:'USD'}) }
