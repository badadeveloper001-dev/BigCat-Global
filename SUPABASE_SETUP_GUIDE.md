# Supabase Database Setup Guide

## ✅ Step 1: Environment Variables (Complete)

Your Supabase credentials have been added to `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` - Your project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Server-side service role key

## 📋 Step 2: Run Database Migrations

You have 28 migration files ready to set up your database schema. Follow these steps:

### Option A: Using Supabase Dashboard SQL Editor (Recommended)

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project: `gpcldplegpslsnjubuhw`
3. Navigate to **SQL Editor**
4. Create a new query and run each migration file in order:

**Order of Migrations:**
```
001-setup-schema.sql                           # Core tables
002-add-otp-table.sql                          # OTP authentication
003-add-full-name-field.sql                    # User profile fields
004-create-products-table.sql                  # Products
005-create-orders-table.sql                    # Orders (if separate)
006-add-user-profile-tables.sql                # User profiles
007-add-auth-google-cac-columns.sql            # Google & CAC auth
008-create-agents-table.sql                    # Onboarding agents
009-create-merchant-onboarding-table.sql       # Merchant onboarding
010-add-merchant-tokens.sql                    # Merchant tokens
011-enable-rls-policies.sql                    # Row Level Security
012-add-merchant-city-state-columns.sql        # Merchant location
013-add-product-cost-price.sql                 # Product pricing
014-create-logistics-tables.sql                # Logistics/shipping
015-create-support-issues-table.sql            # Support tickets
016-add-services-core.sql                      # Services platform
017-add-service-availability-fields.sql        # Service availability
018-add-merchant-type.sql                      # Merchant types
019-add-user-safety-states.sql                 # Safety system
020-create-notification-automation-tables.sql  # Notifications
021-create-rider-payouts-table.sql             # Rider payments
022-create-promotions-tables.sql               # Promotions/coupons
023-extend-promotions-v2.sql                   # Promotions v2
024-create-merchant-followers.sql              # Merchant followers
025-create-service-bills.sql                   # Service billing
026-add-performance-indexes.sql                # Database indexes
027-agent-wallet-onboarding-fee.sql            # Agent wallet system
028-fix-onboarding-request-id-types.sql        # Fix data types
add-pickup-tokens-and-growth-history.sql       # Pickup tokens
create-reviews-table.sql                       # Product reviews
```

**Copy and paste each SQL file content into the editor and execute.**

### Option B: Using Node.js Script

Run the included migration script:
```bash
npm run migrate
# or
node scripts/run-migration.mjs
```

## 🔑 Step 3: Set Up Authentication

Supabase provides built-in authentication. Your app is already configured to use:
- Email/password authentication
- Google OAuth (if configured in Supabase)
- OTP verification

### Enable Auth Methods in Supabase:
1. Go to **Authentication** → **Providers**
2. Enable "Email" (enabled by default)
3. Optional: Enable "Google" for social login
4. Configure redirect URLs under **URL Configuration**:
   - Add: `http://localhost:3000/auth/callback`
   - Add: `https://bigcat-global.vercel.app/auth/callback`

## 🗄️ Step 4: Database Tables Overview

Your database includes:

### User Management
- `auth_users` - User accounts (buyers, merchants, agents)
- `user_profiles` - Extended user information
- `merchant_followers` - Merchant follow relationships

### Products & Orders
- `products` - Product listings
- `orders` - Customer orders
- `order_items` - Items within orders
- `product_reviews` - Customer reviews

### Merchant Features
- `merchant_onboarding_requests` - Merchant signup process
- `merchant_setup` - Merchant store configuration
- `merchant_tokens` - Merchant virtual currency
- `agent_transactions` - Agent payment tracking

### Logistics
- `logistics_shipments` - Shipment tracking
- `logistics_pickups` - Pickup requests
- `pickup_tokens` - Pickup verification

### Services
- `services` - Service listings
- `service_bookings` - Service reservations
- `service_bills` - Service invoicing

### Other
- `notifications` - User notifications
- `conversations` - Messaging between users
- `support_issues` - Customer support tickets
- `promotions` - Marketing campaigns and coupons

## 🔐 Step 5: Row Level Security (RLS)

RLS is enabled via migration 011. This means:
- Users can only access their own data
- Merchants can only see their products/orders
- Agents can see assigned onboarding requests

### Verify RLS is Active:
1. In Supabase Dashboard → **Authentication** → **Policies**
2. Each table should show green "RLS enabled" badge

## 🧪 Step 6: Test the Connection

### Test in Development:
```bash
# Start development server
npm run dev

# Try signing up/logging in
# Navigate to http://localhost:3000/auth/signup
```

### Verify in Code:
The app uses these Supabase clients:
- **Server-side**: `lib/supabase/server.ts` - For API routes
- **Client-side**: `lib/supabase/client.ts` - For browser
- **Request auth**: `lib/supabase/request-auth.ts` - For protected endpoints

## 📊 Step 7: Deploy to Vercel

Update environment variables on Vercel:
```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
```

Or via Vercel Dashboard:
1. Project Settings → Environment Variables
2. Add all three variables

## 🚀 Production Checklist

- [ ] All migration files executed in order
- [ ] RLS policies active on all tables
- [ ] Auth providers configured
- [ ] Email sender configured (Authentication → Email Templates)
- [ ] CORS configured (Settings → API)
- [ ] Environment variables set on Vercel
- [ ] Production database backed up
- [ ] SSL certificates installed (automatic on Supabase)

## 🆘 Troubleshooting

### "Relations not found" error
- Ensure all migration files ran successfully
- Check Supabase dashboard for any failed queries

### Authentication not working
- Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct
- Check Auth providers are enabled
- Clear browser cookies and try again

### Permission denied errors
- Ensure RLS policies are enabled (migration 011)
- Check that user is authenticated before accessing protected routes

### Slow queries
- Run migration 026 (performance indexes) if not already done
- Use Supabase dashboard → Database → Indexes to verify

## 📚 Useful Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js with Supabase](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase Database](https://supabase.com/docs/guides/database)

## 🔗 Project Links

- **Supabase Project**: https://app.supabase.com/project/gpcldplegpslsnjubuhw
- **Local Dev**: http://localhost:3000
- **Production**: https://bigcat-global.vercel.app
