import { changePilotWallet } from '@/lib/pilot-wallet'
export async function POST(request: Request) { return changePilotWallet(request,true) }
