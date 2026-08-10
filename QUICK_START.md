# BigCat Global - One-Command Setup Guide

## ⚡ Quick Start (One Command)

```bash
npm run setup:all
```

This command will:
1. ✅ Verify Supabase credentials
2. ✅ Run database migrations
3. ✅ Create all tables and schemas
4. ✅ Enable Row Level Security (RLS)
5. ✅ Set up indexes for performance
6. ✅ Display next steps

## 📋 What's Already Done

### Environment Configuration ✅
- `NEXT_PUBLIC_SUPABASE_URL` → Configured
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Configured  
- `SUPABASE_SERVICE_ROLE_KEY` → Configured

### Available NPM Scripts

```bash
# Database Operations
npm run setup-db          # Complete database setup with migrations
npm run migrate           # Run database migrations only
npm run verify-supabase   # Verify Supabase connection

# Development
npm run dev               # Start development server
npm run build             # Build for production
npm run start             # Start production server
npm run lint              # Lint code
```

## 🔧 Individual Setup Steps

### Step 1: Verify Connection
```bash
npm run verify-supabase
```

### Step 2: Run Migrations
Choose one method:

**Option A: Automatic (Recommended)**
```bash
npm run setup-db
```

**Option B: Via Dashboard**
1. Go to: https://app.supabase.com/project/gpcldplegpslsnjubuhw/sql/new
2. Copy each `.sql` file from `scripts/` directory
3. Paste into SQL Editor and execute

### Step 3: Configure Authentication

1. **Enable Auth Providers**
   - Go to: https://app.supabase.com/project/gpcldplegpslsnjubuhw/auth/providers
   - Enable "Email"
   - (Optional) Enable "Google"

2. **Configure Redirect URLs**
   - Go to: Settings → URL Configuration
   - Add: `http://localhost:3000/auth/callback`
   - Add: `https://bigcat-global.vercel.app/auth/callback`

3. **Email Configuration** (Optional)
   - Go to: Authentication → Email Templates
   - Customize confirmation, reset, and invite emails

### Step 4: Start Development

```bash
npm run dev
```

Open http://localhost:3000 in your browser

## 🗂️ Database Schema

Your Supabase database includes tables for:

### User Management
- `auth_users` - User accounts
- `user_profiles` - User information
- `merchant_followers` - Follower relationships

### Products & Commerce
- `products` - Product listings
- `orders` - Customer orders
- `order_items` - Items in orders
- `reviews` - Product reviews

### Merchant Features
- `merchant_onboarding_requests` - Signup process
- `merchant_setup` - Store configuration
- `merchant_tokens` - Virtual currency
- `agent_transactions` - Payment tracking

### Additional Features
- `conversations` - Customer messaging
- `notifications` - User notifications
- `support_issues` - Support tickets
- `services` - Service listings
- `logistics_shipments` - Shipping tracking
- `promotions` - Campaigns and coupons

## 🔐 Security Features Enabled

- ✅ **Row Level Security (RLS)** - Users can only access their own data
- ✅ **Service Role Authentication** - Admin operations with elevated privileges
- ✅ **Email Verification** - Secure email-based auth
- ✅ **Encrypted Passwords** - bcrypt hashing

## 📊 Testing the Setup

### Test Sign Up
```
1. Go to: http://localhost:3000/auth/signup
2. Enter email and password
3. Verify account creation in Supabase Dashboard
```

### Test Login
```
1. Go to: http://localhost:3000/auth/login
2. Use credentials from sign up
3. Access authenticated pages
```

### Verify Database Tables
```
1. Go to: https://app.supabase.com/project/gpcldplegpslsnjubuhw
2. Click "SQL Editor"
3. Run: SELECT COUNT(*) FROM auth_users;
```

## 🆘 Troubleshooting

### "Connection Refused" Error
- Check internet connection
- Verify credentials in `.env.local`
- Ensure Supabase project is active

### "Table does not exist" Error
- Run migrations again: `npm run setup-db`
- Check Supabase dashboard for errors
- Verify all `.sql` files executed successfully

### Auth Not Working
- Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`
- Check email provider is enabled in Supabase
- Clear browser cookies and try again

### Slow Queries
- Run migration 026 (indexes) if not done
- Check Supabase dashboard for slow queries
- Enable query analysis

## 📚 Resources

- **Supabase Dashboard**: https://app.supabase.com
- **Supabase Docs**: https://supabase.com/docs
- **Setup Guide**: SUPABASE_SETUP_GUIDE.md
- **Full Guide**: See all documentation files in project root

## ✨ What's Next

After setup:

1. **Customize Auth** - Add more auth providers
2. **Configure Email** - Set up email templates
3. **Add Features** - Build on the database schema
4. **Deploy** - Push to Vercel with production environment variables
5. **Monitor** - Use Supabase Analytics for insights

---

**Ready to code?** Run `npm run dev` and start building! 🚀
