# PalmPay Integration Guide for Big Cat Marketplace

## Overview
This guide explains how to integrate PalmPay payments into the Big Cat Marketplace using the Kora Pay with Bank API.

## Current Implementation Status
- ✅ **Frontend**: Checkout drawer with order summary, delivery options, and payment UI
- ✅ **Backend**: API routes for order creation and webhook handling
- ✅ **Database**: Orders table with escrow management
- ⏳ **Production**: Real PalmPay integration via Kora API (requires credentials)

## MVP vs Production

### MVP (Current - Demo Mode)
- Order creation works normally
- Payment appears to process after 2 seconds
- Mock success responses for testing checkout flow
- No actual funds transferred

### Production (Next Steps)
- Integrate with Kora's Pay with Bank API
- Real PalmPay payment processing
- Webhook signature verification
- Production environment setup

## Required Environment Variables

For production PalmPay integration, add these to your `.env.local`:

```env
# Kora Pay with Bank API
KORA_API_KEY=your_kora_api_key
KORA_MERCHANT_NO=your_merchant_number
KORA_APP_SECRET=your_app_secret
KORA_WEBHOOK_SECRET=your_webhook_secret
KORA_ENVIRONMENT=production  # or 'sandbox' for testing
```

## Integration Steps for Production

### 1. Register with Kora
1. Visit [korahq.com](https://korahq.com)
2. Sign up as a merchant
3. Set up your business profile
4. Get your API credentials

### 2. Configure Webhook
1. In Kora dashboard, set webhook URL:
   ```
   https://yourdomain.com/api/checkout/webhook
   ```
2. Copy the webhook secret and add to env vars

### 3. Update API Route (`/app/api/checkout/initiate/route.ts`)

Replace the MVP mock implementation with:

```typescript
// Call Kora PWB API
const koraResponse = await fetch('https://api.korahq.com/payment/charge', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.KORA_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    merchant: process.env.KORA_MERCHANT_NO,
    amount: totalAmount * 100, // Convert to cents
    reference: `order_${orderId}`,
    customer: {
      email: userEmail,
      phone: userPhone,
    },
    description: `Order for ${productName}`,
    meta: {
      orderId,
      productId,
      vendorId,
    },
    redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success`,
    webhook_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/checkout/webhook`,
  }),
})

const paymentData = await koraResponse.json()

// Return authorization URL for user to complete payment
return NextResponse.json({
  success: true,
  authorizationUrl: paymentData.authorization_url,
  orderId,
  paymentReference: paymentData.reference,
})
```

### 4. Update Webhook Verification (`/app/api/checkout/webhook/route.ts`)

Add signature verification:

```typescript
import crypto from 'crypto'

function verifyWebhookSignature(body: string, signature: string, secret: string) {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex')
  
  return hash === signature
}

// In POST handler:
const signature = request.headers.get('x-kora-signature')
const rawBody = await request.text()

if (!verifyWebhookSignature(rawBody, signature!, process.env.KORA_WEBHOOK_SECRET!)) {
  return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
}
```

## Escrow Flow

### Payment States
1. **Pending** → Order created, awaiting payment
2. **Processing** → Payment authorization in progress
3. **Completed** → Payment received, escrow held
4. **Failed** → Payment declined, order cancelled

### Escrow Release Flow
1. Buyer receives order and confirms delivery
2. Backend receives confirmation and releases funds
3. Vendor receives payment minus marketplace fees
4. Order marked as completed

### Future: Dispute Resolution
- Buyer can dispute if goods not received
- Vendor can dispute incomplete payment
- Marketplace intervenes if needed

## Testing

### Test Cards (Sandbox Mode)
PalmPay test accounts can be created in Kora sandbox environment.

### Test Payment Flow
1. Create order → `POST /api/checkout/initiate`
2. Complete payment (in production: redirect to PalmPay)
3. Webhook fires → `POST /api/checkout/webhook`
4. Order status updates to confirmed
5. Escrow status becomes 'held'

## Security Considerations

1. **API Key Protection**
   - Never commit keys to git
   - Use environment variables only
   - Rotate keys regularly

2. **Webhook Verification**
   - Always verify webhook signature
   - Check timestamp to prevent replay attacks
   - Log all webhook events

3. **PCI Compliance**
   - Never store raw card data
   - Use Kora/PalmPay hosted payment page
   - Implement HTTPS on all endpoints

4. **Order Validation**
   - Verify product exists before creating order
   - Validate buyer has sufficient funds
   - Check inventory before confirming

## Troubleshooting

### "Missing Kora credentials"
- Ensure env vars are set correctly
- Check spelling (case-sensitive)
- Verify values copied without extra spaces

### "Payment failed" 
- Check Kora API status
- Verify merchant account is active
- Review webhook logs for errors

### "Webhook not received"
- Check webhook URL is accessible from internet
- Verify webhook secret matches
- Review Kora merchant dashboard logs

### "Escrow not updating"
- Ensure webhook endpoint is working
- Check order ID in webhook matches database
- Verify RLS policies allow updates

## Database Queries

### Get user's orders with payment status
```sql
SELECT * FROM orders 
WHERE buyer_id = 'user-uuid'
ORDER BY created_at DESC;
```

### Get pending escrow payments
```sql
SELECT * FROM orders 
WHERE escrow_status = 'held' 
AND payment_status = 'completed'
ORDER BY created_at DESC;
```

### Monitor payment failures
```sql
SELECT COUNT(*), vendor_id 
FROM orders 
WHERE payment_status = 'failed'
GROUP BY vendor_id;
```

## Next Steps

1. **User Authentication**: Connect Supabase Auth to pass buyer_id
2. **Vendor Payouts**: Implement vendor payment settlement
3. **Dispute Resolution**: Add dispute handling logic
4. **Notifications**: Send email/SMS on order status changes
5. **Analytics**: Track payment metrics and conversion rates
6. **Refunds**: Implement refund processing with escrow release

## Support & Resources

- **Kora Documentation**: https://korahq.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **PalmPay**: https://www.palmpay.io/
- **Marketplace Checkout Design**: See `components/checkout-drawer.tsx`

## File Structure

```
app/
├── api/
│   └── checkout/
│       ├── initiate/
│       │   └── route.ts (Create orders, initiate payment)
│       └── webhook/
│           └── route.ts (Process payment callbacks)
components/
├── checkout-drawer.tsx (Checkout UI)
└── vendor-page.tsx (Order trigger)
scripts/
└── 001-create-orders-table.sql (Database schema)
```
