import { NextRequest, NextResponse } from "next/server"
import { canUserReview } from "@/lib/review-actions"

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: productId } = await params
    if (!productId) {
      return NextResponse.json({ canReview: false, hasReviewed: false, reason: "Product ID required." }, { status: 400 })
    }

    // Eligibility is derived from the authenticated session, never a query-string user id.
    const result = await canUserReview(productId)
    return NextResponse.json({
      canReview: result.success ? Boolean(result.canReview) : false,
      hasReviewed: result.success ? Boolean(result.hasReviewed) : false,
      reason: result.success ? result.reason || null : result.error || "Unable to check review eligibility.",
    })
  } catch {
    return NextResponse.json(
      { canReview: false, hasReviewed: false, reason: "Unable to check review eligibility." },
      { status: 500 },
    )
  }
}
