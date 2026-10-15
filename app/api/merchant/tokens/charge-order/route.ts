import { NextRequest, NextResponse } from "next/server"
import { deductMerchantTokens, TOKEN_COST_ORDER } from "@/lib/merchant-tokens"
import { requireAuthenticatedUser } from "@/lib/supabase/request-auth"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedUser()
  if (auth.response) return auth.response

  const body = await request.json().catch(() => ({}))
  const merchantIdsRaw = Array.isArray(body.merchantIds) ? body.merchantIds : []
  const merchantIds: string[] = Array.from(new Set(merchantIdsRaw.map((id: unknown) => String(id || "").trim()).filter(Boolean))) as string[]

  if (merchantIds.length === 0) {
    return NextResponse.json({ success: false, error: "merchantIds are required" }, { status: 400 })
  }

  if (merchantIds.length > 1) {
    return NextResponse.json({ success: false, code: "MULTI_MERCHANT_CHECKOUT_UNAVAILABLE", error: "Checkout currently supports one merchant at a time." }, { status: 409 })
  }

  const supabase = createClient()
  const { data: demoRows, error: demoError } = await supabase.from("bigcat_demo_merchants").select("merchant_id").in("merchant_id", merchantIds)
  if (demoError) return NextResponse.json({ success: false, error: "Unable to validate merchant eligibility." }, { status: 503 })
  if ((demoRows || []).length > 0) {
    return NextResponse.json({ success: false, code: "DEMO_CHECKOUT_DISABLED", error: "Demo merchants cannot be charged." }, { status: 403 })
  }

  const failed: Array<{ merchantId: string; error: string; balance: number }> = []
  const charged: Array<{ merchantId: string; charged: number; balance: number }> = []

  for (const merchantId of merchantIds) {
    const result = await deductMerchantTokens({
      merchantId,
      amount: TOKEN_COST_ORDER,
      reason: "buyer_order",
    })

    if (!result.success) {
      failed.push({
        merchantId,
        error: result.insufficient
          ? "Insufficient merchant tokens"
          : result.error || "Failed to charge merchant token",
        balance: result.balance,
      })
      continue
    }

    charged.push({ merchantId, charged: TOKEN_COST_ORDER, balance: result.balance })
  }

  return NextResponse.json({
    success: failed.length === 0,
    charged,
    failed,
    tokenCostPerMerchant: TOKEN_COST_ORDER,
  })
}
