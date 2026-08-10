# Supabase SQL Manual Setup - Quick Guide

## 🚀 How to Setup

1. Go to: **https://app.supabase.com/project/gpcldplegpslsnjubuhw**
2. Click: **SQL Editor** (left sidebar)
3. Click: **New Query**
4. Copy the SQL file content from list below
5. Paste into SQL Editor
6. Click: **RUN** button
7. Repeat for each file in order

---

## 📋 SQL Files to Run (In Order)

### ✅ STEP 1: Core Schema Setup

**File: `001-setup-schema.sql`**
- Creates: auth_users, products, orders, order_items, conversations

---

### ✅ STEP 2: OTP Authentication

**File: `002-add-otp-table.sql`**
- Creates: otp_verification table

---

### ✅ STEP 3: User Profile Fields

**File: `003-add-full-name-field.sql`**
- Adds: full_name and other profile fields

---

### ✅ STEP 4: Products

**File: `004-create-products-table.sql`**
- Creates/updates products table

---

### ✅ STEP 5: Orders

**File: `005-create-orders-table.sql`**
- Creates/updates orders table

---

### ✅ STEP 6: User Profiles

**File: `006-add-user-profile-tables.sql`**
- Creates: user_profiles table

---

### ✅ STEP 7: Google & CAC Auth

**File: `007-add-auth-google-cac-columns.sql`**
- Adds: google_id, cac_id columns for authentication

---

### ✅ STEP 8: Agents Table

**File: `008-create-agents-table.sql`**
- Creates: agents table for onboarding support

---

### ✅ STEP 9: Merchant Onboarding

**File: `009-create-merchant-onboarding-table.sql`**
- Creates: merchant_onboarding_requests table

---

### ✅ STEP 10: Merchant Tokens

**File: `010-add-merchant-tokens.sql`**
- Adds: merchant_tokens table for virtual currency

---

### ✅ STEP 11: Row Level Security (IMPORTANT!)

**File: `011-enable-rls-policies.sql`**
- ⚠️ CRITICAL: Enables security policies for all tables
- Run this to secure user data

---

### ✅ STEP 12: Merchant Location

**File: `012-add-merchant-city-state-columns.sql`**
- Adds: city, state columns to merchants

---

### ✅ STEP 13: Product Pricing

**File: `013-add-product-cost-price.sql`**
- Adds: cost_price column to products

---

### ✅ STEP 14: Logistics

**File: `014-create-logistics-tables.sql`**
- Creates: Shipping and logistics tables

---

### ✅ STEP 15: Support Tickets

**File: `015-create-support-issues-table.sql`**
- Creates: support_issues table

---

### ✅ STEP 16: Services Platform

**File: `016-add-services-core.sql`**
- Creates: services and related tables

---

### ✅ STEP 17: Service Availability

**File: `017-add-service-availability-fields.sql`**
- Adds: availability fields to services

---

### ✅ STEP 18: Merchant Types

**File: `018-add-merchant-type.sql`**
- Adds: merchant_type column

---

### ✅ STEP 19: User Safety

**File: `019-add-user-safety-states.sql`**
- Creates: safety tracking tables

---

### ✅ STEP 20: Notifications

**File: `020-create-notification-automation-tables.sql`**
- Creates: notification automation tables

---

### ✅ STEP 21: Rider Payouts

**File: `021-create-rider-payouts-table.sql`**
- Creates: rider_payouts table

---

### ✅ STEP 22: Promotions

**File: `022-create-promotions-tables.sql`**
- Creates: promotions table

---

### ✅ STEP 23: Extended Promotions

**File: `023-extend-promotions-v2.sql`**
- Updates: promotions with v2 features
- (Skip `023-add-coupon-tracking-to-orders.sql` - use this instead)

---

### ✅ STEP 24: Merchant Followers

**File: `024-create-merchant-followers.sql`**
- Creates: merchant_followers table

---

### ✅ STEP 25: Service Billing

**File: `025-create-service-bills.sql`**
- Creates: service_bills table

---

### ✅ STEP 26: Performance Indexes

**File: `026-add-performance-indexes.sql`**
- ⚡ IMPORTANT: Adds indexes for fast queries
- Run this to optimize database performance

---

### ✅ STEP 27: Agent Wallet System

**File: `027-agent-wallet-onboarding-fee.sql`**
- Creates: onboarding_escrow, agent_transactions tables

---

### ✅ STEP 28: Fix Data Types

**File: `028-fix-onboarding-request-id-types.sql`**
- Fixes: Column data types in onboarding tables

---

### ✅ STEP 29: Additional Tables

**File: `add-pickup-tokens-and-growth-history.sql`**
- Creates: pickup_tokens, growth_history tables

---

### ✅ STEP 30: Auth Schema

**File: `create-auth-schema.sql`**
- Creates: Additional auth-related schema

---

### ✅ STEP 31: Reviews

**File: `create-reviews-table.sql`**
- Creates: Product reviews table

---

## ⚡ Quick Copy-Paste List

```
001-setup-schema.sql
002-add-otp-table.sql
003-add-full-name-field.sql
004-create-products-table.sql
005-create-orders-table.sql
006-add-user-profile-tables.sql
007-add-auth-google-cac-columns.sql
008-create-agents-table.sql
009-create-merchant-onboarding-table.sql
010-add-merchant-tokens.sql
011-enable-rls-policies.sql
012-add-merchant-city-state-columns.sql
013-add-product-cost-price.sql
014-create-logistics-tables.sql
015-create-support-issues-table.sql
016-add-services-core.sql
017-add-service-availability-fields.sql
018-add-merchant-type.sql
019-add-user-safety-states.sql
020-create-notification-automation-tables.sql
021-create-rider-payouts-table.sql
022-create-promotions-tables.sql
023-extend-promotions-v2.sql
024-create-merchant-followers.sql
025-create-service-bills.sql
026-add-performance-indexes.sql
027-agent-wallet-onboarding-fee.sql
028-fix-onboarding-request-id-types.sql
add-pickup-tokens-and-growth-history.sql
create-auth-schema.sql
create-reviews-table.sql
```

## 🔑 Key Steps (Don't Skip!)

⚠️ **CRITICAL:**
- **Step 11** (`011-enable-rls-policies.sql`) - Enables security
- **Step 26** (`026-add-performance-indexes.sql`) - Optimizes queries

## ✨ After Running All SQL

1. ✅ All tables created
2. ✅ Security policies enabled
3. ✅ Performance indexes added
4. ✅ Ready for authentication setup

---

## 📌 Next Steps After SQL

1. Go to: **Authentication → Providers**
   - Enable "Email"
   - (Optional) Enable "Google"

2. Go to: **Settings → URL Configuration**
   - Add: `http://localhost:3000/auth/callback`
   - Add: `https://bigcat-global.vercel.app/auth/callback`

3. Start development:
   ```bash
   npm run dev
   ```

---

## ❓ Troubleshooting

**"Table already exists" Error?**
- Safe to ignore - means it was already created
- Just proceed to next file

**"Column already exists" Error?**
- Safe to ignore - means field already added
- Just proceed to next file

**Nothing happens after clicking RUN?**
- Check bottom of screen for success message
- Errors appear in red

---

## 📍 Supabase Links

- **Dashboard:** https://app.supabase.com/project/gpcldplegpslsnjubuhw
- **SQL Editor:** https://app.supabase.com/project/gpcldplegpslsnjubuhw/sql/new
- **Tables:** https://app.supabase.com/project/gpcldplegpslsnjubuhw/editor

---

**Ready?** Open Supabase SQL Editor and start copying/pasting! 🚀
