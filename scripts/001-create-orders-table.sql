-- Create orders table for checkout and payment flow
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  vendor_id INTEGER NOT NULL,
  vendor_name TEXT NOT NULL,
  buyer_id UUID REFERENCES auth.users(id),
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('platform', 'vendor', 'pickup')),
  delivery_address TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  payment_reference TEXT,
  payment_provider TEXT DEFAULT 'palmpay',
  escrow_status TEXT DEFAULT 'pending' CHECK (escrow_status IN ('pending', 'held', 'released', 'refunded', 'disputed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Buyers can view their own orders
CREATE POLICY "buyers_select_own_orders" ON orders 
  FOR SELECT USING (auth.uid() = buyer_id);

-- Buyers can insert their own orders
CREATE POLICY "buyers_insert_own_orders" ON orders 
  FOR INSERT WITH CHECK (auth.uid() = buyer_id);

-- Buyers can update their own orders (for confirming delivery, etc.)
CREATE POLICY "buyers_update_own_orders" ON orders 
  FOR UPDATE USING (auth.uid() = buyer_id);

-- Service role can do everything (for webhooks and admin operations)
-- This is handled automatically by service_role key

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_reference ON orders(payment_reference);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
