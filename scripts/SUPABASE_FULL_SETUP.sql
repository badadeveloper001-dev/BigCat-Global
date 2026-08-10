-- ============================================================
-- BIGCAT GLOBAL - COMPLETE DATABASE SETUP
-- Paste this entire file into Supabase SQL Editor and click RUN
-- ============================================================


-- ============================================================
-- SECTION 1: CORE USER TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS auth_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  password_hash TEXT,
  name TEXT,
  full_name TEXT,
  address TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'buyer',
  business_name TEXT,
  business_description TEXT,
  business_category TEXT,
  smedan_id TEXT,
  cac_id TEXT,
  google_id TEXT,
  setup_completed BOOLEAN DEFAULT false,
  city TEXT,
  state TEXT,
  location TEXT,
  token_balance INTEGER NOT NULL DEFAULT 0,
  merchant_type TEXT DEFAULT 'products',
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT auth_users_token_balance_non_negative CHECK (token_balance >= 0)
);

CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth_users(email);
CREATE INDEX IF NOT EXISTS idx_auth_users_role ON auth_users(role);
CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_users_google_id ON auth_users(google_id) WHERE google_id IS NOT NULL;


-- ============================================================
-- SECTION 2: MERCHANT PROFILES
-- ============================================================

CREATE TABLE IF NOT EXISTS merchant_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth_users(id) ON DELETE CASCADE,
  business_name TEXT,
  business_description TEXT,
  category TEXT,
  location TEXT,
  logo_url TEXT,
  setup_completed BOOLEAN DEFAULT false,
  smedan_id TEXT UNIQUE,
  merchant_type TEXT DEFAULT 'products' CHECK (merchant_type IN ('products', 'services')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_merchant_profiles_user_id ON merchant_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_merchant_profiles_setup_completed ON merchant_profiles(setup_completed);
CREATE INDEX IF NOT EXISTS idx_merchant_profiles_type ON merchant_profiles(merchant_type);


-- ============================================================
-- SECTION 3: OTP VERIFICATION
-- ============================================================

CREATE TABLE IF NOT EXISTS otp_verification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_verification(email);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_verification(expires_at);


-- ============================================================
-- SECTION 4: PRODUCTS
-- ============================================================

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  cost_price DECIMAL(10, 2),
  category TEXT,
  weight DECIMAL(10, 2),
  weight_verified BOOLEAN DEFAULT false,
  weight_verification_status TEXT DEFAULT 'pending',
  images JSONB DEFAULT '[]'::jsonb,
  image_url TEXT,
  stock INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'active',
  average_rating DECIMAL(3,2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_merchant_id ON products(merchant_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);


-- ============================================================
-- SECTION 5: ORDERS & ORDER ITEMS
-- ============================================================

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  delivery_type TEXT NOT NULL DEFAULT 'normal',
  delivery_address TEXT,
  delivery_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
  product_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  grand_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  payment_method TEXT,
  coupon_code TEXT,
  coupon_discount DECIMAL(10, 2) DEFAULT 0,
  pickup_token TEXT,
  pickup_verified_at TIMESTAMP WITH TIME ZONE,
  pickup_verified_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  merchant_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  weight DECIMAL(10, 2) DEFAULT 0.5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_merchant_id ON order_items(merchant_id);

CREATE TABLE IF NOT EXISTS escrow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  recipient_id UUID,
  status TEXT NOT NULL DEFAULT 'held',
  released_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_escrow_order_id ON escrow(order_id);


-- ============================================================
-- SECTION 6: CONVERSATIONS & MESSAGES
-- ============================================================

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  merchant_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(buyer_id, merchant_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_buyer ON conversations(buyer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_merchant ON conversations(merchant_id);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);


-- ============================================================
-- SECTION 7: PAYMENT METHODS
-- ============================================================

CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  card_type TEXT NOT NULL,
  card_last_four TEXT NOT NULL,
  card_holder_name TEXT NOT NULL,
  expiry_month INTEGER NOT NULL,
  expiry_year INTEGER NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON payment_methods(user_id);


-- ============================================================
-- SECTION 8: AGENTS & MERCHANT ONBOARDING
-- ============================================================

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  region TEXT NOT NULL,
  access_code TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'agent',
  is_active BOOLEAN DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_access_code ON agents(access_code);
CREATE INDEX IF NOT EXISTS idx_agents_email ON agents(email);

CREATE TABLE IF NOT EXISTS merchant_onboarding_requests (
  id TEXT PRIMARY KEY,
  business_name TEXT NOT NULL,
  category TEXT NOT NULL,
  date_of_commencement DATE NOT NULL,
  owner_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  onboarding_status TEXT NOT NULL DEFAULT 'not_started',
  assigned_agent_id TEXT,
  onboarding_fee_paid BOOLEAN DEFAULT false,
  onboarding_fee_reference TEXT,
  onboarding_fee_escrowed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_status ON merchant_onboarding_requests(onboarding_status);
CREATE INDEX IF NOT EXISTS idx_onboarding_assigned_agent ON merchant_onboarding_requests(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_email ON merchant_onboarding_requests(email);


-- ============================================================
-- SECTION 9: LOGISTICS
-- ============================================================

CREATE TABLE IF NOT EXISTS logistics_riders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  region TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logistics_riders_active ON logistics_riders(is_active);

CREATE TABLE IF NOT EXISTS logistics_order_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL UNIQUE,
  rider_id UUID REFERENCES logistics_riders(id),
  logistics_status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  assigned_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logistics_order_assignments_order_id ON logistics_order_assignments(order_id);
CREATE INDEX IF NOT EXISTS idx_logistics_order_assignments_rider_id ON logistics_order_assignments(rider_id);
CREATE INDEX IF NOT EXISTS idx_logistics_order_assignments_status ON logistics_order_assignments(logistics_status);

CREATE TABLE IF NOT EXISTS logistics_rider_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID NOT NULL REFERENCES logistics_riders(id),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending',
  reference TEXT,
  notes TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logistics_rider_payouts_rider_id ON logistics_rider_payouts(rider_id);
CREATE INDEX IF NOT EXISTS idx_logistics_rider_payouts_status ON logistics_rider_payouts(status);


-- ============================================================
-- SECTION 10: SUPPORT ISSUES
-- ============================================================

CREATE TABLE IF NOT EXISTS support_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID,
  buyer_id UUID NOT NULL,
  merchant_id UUID,
  issue_type TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS support_issues_order_id_idx ON support_issues(order_id);
CREATE INDEX IF NOT EXISTS support_issues_buyer_id_idx ON support_issues(buyer_id);
CREATE INDEX IF NOT EXISTS support_issues_status_idx ON support_issues(status);
CREATE INDEX IF NOT EXISTS support_issues_created_at_idx ON support_issues(created_at DESC);

CREATE OR REPLACE FUNCTION public.set_support_issues_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_support_issues_updated_at ON support_issues;
CREATE TRIGGER trg_support_issues_updated_at
BEFORE UPDATE ON support_issues
FOR EACH ROW EXECUTE FUNCTION public.set_support_issues_updated_at();


-- ============================================================
-- SECTION 11: SERVICES PLATFORM
-- ============================================================

CREATE TABLE IF NOT EXISTS service_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  base_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  working_days TEXT[] NOT NULL DEFAULT '{}',
  working_hours TEXT,
  service_city TEXT,
  service_state TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS service_listings_merchant_idx ON service_listings(merchant_id);
CREATE INDEX IF NOT EXISTS service_listings_active_idx ON service_listings(is_active);
CREATE INDEX IF NOT EXISTS service_listings_category_idx ON service_listings(category);
CREATE INDEX IF NOT EXISTS service_listings_location_idx ON service_listings(service_state, service_city);

CREATE TABLE IF NOT EXISTS service_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL,
  buyer_id UUID NOT NULL,
  merchant_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  service_address TEXT,
  buyer_note TEXT,
  quoted_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'held',
  escrow_status TEXT NOT NULL DEFAULT 'held',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS service_bookings_buyer_idx ON service_bookings(buyer_id);
CREATE INDEX IF NOT EXISTS service_bookings_merchant_idx ON service_bookings(merchant_id);
CREATE INDEX IF NOT EXISTS service_bookings_status_idx ON service_bookings(status);
CREATE INDEX IF NOT EXISTS service_bookings_scheduled_idx ON service_bookings(scheduled_at);

CREATE TABLE IF NOT EXISTS service_booking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL,
  actor_id UUID,
  actor_type TEXT,
  from_status TEXT,
  to_status TEXT,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS service_booking_events_booking_idx ON service_booking_events(booking_id);

CREATE OR REPLACE FUNCTION public.set_services_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_service_listings_updated_at ON service_listings;
CREATE TRIGGER trg_service_listings_updated_at
BEFORE UPDATE ON service_listings
FOR EACH ROW EXECUTE FUNCTION public.set_services_updated_at();

DROP TRIGGER IF EXISTS trg_service_bookings_updated_at ON service_bookings;
CREATE TRIGGER trg_service_bookings_updated_at
BEFORE UPDATE ON service_bookings
FOR EACH ROW EXECUTE FUNCTION public.set_services_updated_at();

CREATE TABLE IF NOT EXISTS service_bills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id TEXT NOT NULL,
  buyer_id TEXT NOT NULL,
  service_listing_id UUID,
  scope_summary TEXT,
  timeline TEXT,
  line_items JSONB NOT NULL DEFAULT '[]',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  valid_until TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'draft',
  booking_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_bills_merchant_id ON service_bills(merchant_id);
CREATE INDEX IF NOT EXISTS idx_service_bills_buyer_id ON service_bills(buyer_id);
CREATE INDEX IF NOT EXISTS idx_service_bills_status ON service_bills(status);


-- ============================================================
-- SECTION 12: SAFETY & TRUST
-- ============================================================

CREATE TABLE IF NOT EXISTS user_safety_states (
  user_id UUID PRIMARY KEY,
  strike_count INTEGER NOT NULL DEFAULT 0,
  suspended_until TIMESTAMP WITH TIME ZONE,
  last_violation_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_safety_states_suspended_until_idx ON user_safety_states(suspended_until);

CREATE OR REPLACE FUNCTION public.set_user_safety_states_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_safety_states_updated_at ON user_safety_states;
CREATE TRIGGER trg_user_safety_states_updated_at
BEFORE UPDATE ON user_safety_states
FOR EACH ROW EXECUTE FUNCTION public.set_user_safety_states_updated_at();


-- ============================================================
-- SECTION 13: NOTIFICATIONS & AUTOMATION
-- ============================================================

CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('order', 'system', 'alert', 'report')),
  event_key TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON user_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifications_unread ON user_notifications(user_id, read_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_notifications_event_key_unique ON user_notifications(event_key) WHERE event_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS automation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key TEXT NOT NULL UNIQUE,
  user_id TEXT,
  event_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automation_events_event_type ON automation_events(event_type);
CREATE INDEX IF NOT EXISTS idx_automation_events_user_id ON automation_events(user_id);

CREATE TABLE IF NOT EXISTS order_automation_state (
  order_id TEXT PRIMARY KEY,
  merchant_id TEXT,
  buyer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  buyer_notified_at TIMESTAMP WITH TIME ZONE,
  merchant_notified_at TIMESTAMP WITH TIME ZONE,
  payment_notified_at TIMESTAMP WITH TIME ZONE,
  logistics_registered_at TIMESTAMP WITH TIME ZONE,
  reminder_sent_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_order_automation_reminder ON order_automation_state(reminder_sent_at, created_at);

CREATE TABLE IF NOT EXISTS weekly_business_report_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id TEXT NOT NULL,
  week_start DATE NOT NULL,
  totals JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(merchant_id, week_start)
);

CREATE TABLE IF NOT EXISTS cart_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  item_count INTEGER NOT NULL DEFAULT 0,
  cart_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  checked_out_at TIMESTAMP WITH TIME ZONE,
  reminder_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_sessions_abandoned ON cart_sessions(last_active_at, checked_out_at, reminder_sent_at);


-- ============================================================
-- SECTION 14: PROMOTIONS & COUPONS
-- ============================================================

CREATE TABLE IF NOT EXISTS promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('discount', 'bundle', 'flash_sale')),
  description TEXT,
  discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10, 2) NOT NULL,
  min_purchase_amount DECIMAL(10, 2) DEFAULT 0,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  usage_per_buyer INTEGER DEFAULT 1,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  product_ids UUID[] DEFAULT '{}',
  rule_type TEXT DEFAULT 'standard' CHECK (rule_type IN ('standard', 'spend_x_save_y', 'buy_x_get_y', 'nth_item_discount')),
  spend_threshold DECIMAL(10, 2),
  buy_quantity INTEGER,
  get_quantity INTEGER,
  nth_item INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promotions_merchant_id ON promotions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(is_active, end_date);

CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  promotion_id UUID REFERENCES promotions(id) ON DELETE CASCADE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10, 2) NOT NULL,
  min_purchase_amount DECIMAL(10, 2) DEFAULT 0,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  max_uses_per_buyer INTEGER DEFAULT 1,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_merchant_id ON coupons(merchant_id);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active, end_date);

CREATE TABLE IF NOT EXISTS coupon_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  used_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(coupon_id, buyer_id)
);

CREATE INDEX IF NOT EXISTS idx_coupon_usage_buyer_id ON coupon_usage(buyer_id);

CREATE TABLE IF NOT EXISTS promotion_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  views INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  uses INTEGER DEFAULT 0,
  revenue_impact DECIMAL(12, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(promotion_id, date)
);

CREATE INDEX IF NOT EXISTS idx_promotion_analytics_date ON promotion_analytics(date);

CREATE TABLE IF NOT EXISTS banner_ab_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  variant TEXT NOT NULL CHECK (variant IN ('A', 'B')),
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'click')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_banner_ab_events_merchant_variant ON banner_ab_events(merchant_id, variant);
CREATE INDEX IF NOT EXISTS idx_banner_ab_events_created_at ON banner_ab_events(created_at);


-- ============================================================
-- SECTION 15: MERCHANT FOLLOWERS
-- ============================================================

CREATE TABLE IF NOT EXISTS merchant_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(merchant_id, buyer_id)
);

CREATE INDEX IF NOT EXISTS idx_merchant_followers_merchant_id ON merchant_followers(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_followers_buyer_id ON merchant_followers(buyer_id);


-- ============================================================
-- SECTION 16: REVIEWS
-- ============================================================

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  verified_purchase BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);


-- ============================================================
-- SECTION 17: AGENT WALLET & ONBOARDING ESCROW
-- ============================================================

CREATE TABLE IF NOT EXISTS onboarding_escrow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_request_id TEXT NOT NULL,
  agent_id TEXT,
  amount INTEGER NOT NULL DEFAULT 2000,
  status TEXT NOT NULL DEFAULT 'held',
  payment_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  released_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_onboarding_escrow_request_id ON onboarding_escrow(onboarding_request_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_escrow_agent_status ON onboarding_escrow(agent_id, status);

CREATE TABLE IF NOT EXISTS agent_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  onboarding_request_id TEXT,
  type TEXT NOT NULL DEFAULT 'onboarding_fee',
  amount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_transactions_agent_created ON agent_transactions(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_transactions_request_id ON agent_transactions(onboarding_request_id);


-- ============================================================
-- SECTION 18: MERCHANT GROWTH & PICKUP TOKENS
-- ============================================================

CREATE TABLE IF NOT EXISTS merchant_scale_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id TEXT NOT NULL,
  merchant_name TEXT,
  previous_scale TEXT,
  next_scale TEXT NOT NULL,
  total_sales NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS merchant_scale_history_merchant_id_idx ON merchant_scale_history(merchant_id, created_at DESC);


-- ============================================================
-- SECTION 19: ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on core tables
ALTER TABLE auth_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- auth_users: users can only read/update their own row
DROP POLICY IF EXISTS auth_users_select_own ON auth_users;
CREATE POLICY auth_users_select_own ON auth_users
  FOR SELECT USING (id = auth.uid()::UUID);

DROP POLICY IF EXISTS auth_users_update_own ON auth_users;
CREATE POLICY auth_users_update_own ON auth_users
  FOR UPDATE USING (id = auth.uid()::UUID);

-- orders: buyers see their own orders
DROP POLICY IF EXISTS orders_select_own ON orders;
CREATE POLICY orders_select_own ON orders
  FOR SELECT USING (buyer_id = auth.uid()::UUID);

-- products: anyone can view active products
DROP POLICY IF EXISTS products_select_active ON products;
CREATE POLICY products_select_active ON products
  FOR SELECT USING (is_active = true);

-- merchants can manage their own products
DROP POLICY IF EXISTS products_merchant_manage ON products;
CREATE POLICY products_merchant_manage ON products
  FOR ALL USING (merchant_id = auth.uid()::UUID);

-- notifications: users see only their own
DROP POLICY IF EXISTS notifications_select_own ON user_notifications;
CREATE POLICY notifications_select_own ON user_notifications
  FOR SELECT USING (user_id = auth.uid()::TEXT);


-- ============================================================
-- DONE!
-- ============================================================
