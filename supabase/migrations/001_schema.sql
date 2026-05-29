-- QingCha tea space management system - PostgreSQL schema
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS rooms (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  capacity_min INTEGER,
  capacity_max INTEGER,
  type TEXT,
  hourly_rate NUMERIC(10,2),
  image_url TEXT,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS packages (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  original_price NUMERIC(10,2),
  duration_hours INTEGER DEFAULT 2,
  max_guests INTEGER,
  tea_count INTEGER,
  snack_dry_count INTEGER,
  snack_pastry_count INTEGER,
  includes_parking BOOLEAN DEFAULT true,
  parking_hours INTEGER DEFAULT 2,
  spend_threshold NUMERIC(10,2),
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS package_rooms (
  package_id INTEGER REFERENCES packages(id) ON DELETE CASCADE,
  room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
  PRIMARY KEY (package_id, room_id)
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  price NUMERIC(10,2) NOT NULL,
  unit TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name TEXT,
  phone TEXT UNIQUE,
  notes TEXT,
  total_spent NUMERIC(10,2) DEFAULT 0,
  visit_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  room_id INTEGER REFERENCES rooms(id),
  package_id INTEGER REFERENCES packages(id),
  customer_id INTEGER REFERENCES customers(id),
  booking_date DATE,
  start_time TEXT,
  end_time TEXT,
  actual_end_time TEXT,
  overtime_hours NUMERIC(5,2) DEFAULT 0,
  overtime_fee NUMERIC(10,2) DEFAULT 0,
  package_fee NUMERIC(10,2),
  addons_fee NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2) DEFAULT 0,
  tea_amount NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'booked',
  payment_status TEXT DEFAULT 'unpaid',
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  name TEXT,
  category TEXT,
  price NUMERIC(10,2),
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  unit TEXT,
  stock_quantity NUMERIC(10,2) DEFAULT 0,
  alert_threshold NUMERIC(10,2) DEFAULT 0,
  cost_price NUMERIC(10,2),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_logs (
  id SERIAL PRIMARY KEY,
  inventory_id INTEGER REFERENCES inventory(id) ON DELETE CASCADE,
  change_type TEXT,
  quantity NUMERIC(10,2),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Enable on all tables
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users get full access
CREATE POLICY "Authenticated full access" ON rooms FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON packages FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON package_rooms FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON products FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON customers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON bookings FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON order_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON inventory FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON inventory_logs FOR ALL USING (auth.role() = 'authenticated');

-- RPC functions for reports
CREATE OR REPLACE FUNCTION get_daily_stats(start_date DATE, end_date DATE)
RETURNS TABLE(booking_date DATE, revenue NUMERIC, bookings BIGINT)
AS $$
  SELECT b.booking_date,
         COALESCE(SUM(b.total_amount), 0) as revenue,
         COUNT(*) as bookings
  FROM bookings b
  WHERE b.booking_date BETWEEN start_date AND end_date
    AND b.status != 'cancelled' AND b.payment_status = 'paid'
  GROUP BY b.booking_date
  ORDER BY b.booking_date;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION get_order_breakdown(start_date DATE, end_date DATE)
RETURNS TABLE(booking_date DATE, category TEXT, amount NUMERIC)
AS $$
  SELECT b.booking_date, oi.category, SUM(oi.price * oi.quantity) as amount
  FROM order_items oi
  INNER JOIN bookings b ON oi.booking_id = b.id
  WHERE b.booking_date BETWEEN start_date AND end_date AND b.status != 'cancelled'
  GROUP BY b.booking_date, oi.category;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION get_room_usage(start_date DATE, end_date DATE)
RETURNS TABLE(name TEXT, count BIGINT)
AS $$
  SELECT r.name, COUNT(*) as count
  FROM bookings b INNER JOIN rooms r ON b.room_id = r.id
  WHERE b.booking_date BETWEEN start_date AND end_date AND b.status != 'cancelled'
  GROUP BY r.name ORDER BY count DESC;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION get_top_products(start_date DATE, end_date DATE)
RETURNS TABLE(name TEXT, count BIGINT, total NUMERIC)
AS $$
  SELECT oi.name, SUM(oi.quantity) as count, SUM(oi.price * oi.quantity) as total
  FROM order_items oi
  INNER JOIN bookings b ON oi.booking_id = b.id
  WHERE b.booking_date BETWEEN start_date AND end_date AND b.status != 'cancelled'
  GROUP BY oi.name ORDER BY count DESC LIMIT 10;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION get_top_customers(start_date DATE, end_date DATE)
RETURNS TABLE(name TEXT, total NUMERIC, visits BIGINT)
AS $$
  SELECT c.name, SUM(b.total_amount) as total, COUNT(*) as visits
  FROM bookings b INNER JOIN customers c ON b.customer_id = c.id
  WHERE b.booking_date BETWEEN start_date AND end_date
    AND b.status != 'cancelled' AND b.payment_status = 'paid'
  GROUP BY c.name ORDER BY total DESC LIMIT 10;
$$ LANGUAGE sql;
