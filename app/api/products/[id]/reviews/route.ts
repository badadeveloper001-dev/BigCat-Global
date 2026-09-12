import { NextRequest, NextResponse } from "next/server"
import { getProductReviews, createReview } from "@/lib/review-actions"

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: productId } = await params
    if (!productId) {
      return NextResponse.json({ success: false, error: "Product ID required" }, { status: 400 })
    }

    const result = await getProductReviews(productId)
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 })
    }

    const reviews = Array.isArray(result.data) ? result.data : []
    const totalReviews = reviews.length
    const averageRating =
      totalReviews > 0
        ? reviews.reduce((sum: number, review: any) => sum + Number(review.rating || 0), 0) / totalReviews
        : 0

    return NextResponse.json({
      success: true,
      data: reviews,
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews,
    })
  } catch (error) {
    console.error("Reviews GET error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: productId } = await params
    const body = await request.json()
    const rating = Number(body?.rating)
    const comment = String(body?.comment || "")

    if (!productId || !Number.isInteger(rating) || !comment.trim()) {
      return NextResponse.json({ success: false, error: "Product, rating, and review are required." }, { status: 400 })
    }

    // createReview resolves the signed-in user from the request cookies and never
    // accepts a browser-supplied user id.
    const result = await createReview(productId, rating, comment)
    if (!result.success) {
      const status = result.code === "AUTH_REQUIRED" ? 401 : result.hasReviewed ? 409 : 400
      return NextResponse.json({ success: false, error: result.error, hasReviewed: result.hasReviewed }, { status })
    }

    return NextResponse.json({ success: true, data: result.data }, { status: 201 })
  } catch (error) {
    console.error("Reviews POST error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
