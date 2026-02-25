-- ============================================================
-- Migration 014: Financial System
-- Creates listing_boosts, payment_audit_log, invoices tables
-- and auto-incrementing invoice number generator.
-- ============================================================
-- 1. Create listing_boosts table
CREATE TABLE IF NOT EXISTS public.listing_boosts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tier TEXT NOT NULL CHECK (tier IN ('spark', 'boost', 'power')),
    amount_inr NUMERIC(10, 2) NOT NULL,
    duration_days INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN (
            'pending',
            'paid',
            'failed',
            'refunded',
            'expired'
        )
    ),
    cashfree_order_id TEXT UNIQUE,
    cashfree_payment_id TEXT,
    payment_method TEXT DEFAULT 'upi',
    featured_from TIMESTAMPTZ,
    featured_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
-- Indexes
CREATE INDEX IF NOT EXISTS idx_listing_boosts_listing ON public.listing_boosts(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_boosts_user ON public.listing_boosts(user_id);
CREATE INDEX IF NOT EXISTS idx_listing_boosts_status ON public.listing_boosts(status);
CREATE INDEX IF NOT EXISTS idx_listing_boosts_cashfree ON public.listing_boosts(cashfree_order_id);
-- RLS
ALTER TABLE public.listing_boosts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own boosts" ON public.listing_boosts;
CREATE POLICY "Users can view own boosts" ON public.listing_boosts FOR
SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Service role full access boosts" ON public.listing_boosts;
CREATE POLICY "Service role full access boosts" ON public.listing_boosts FOR ALL USING (auth.role() = 'service_role');
-- 2. Create payment_audit_log table (append-only)
CREATE TABLE IF NOT EXISTS public.payment_audit_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    boost_id UUID REFERENCES public.listing_boosts(id) ON DELETE
    SET NULL,
        event_type TEXT NOT NULL,
        cashfree_order_id TEXT,
        raw_payload JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_audit_boost ON public.payment_audit_log(boost_id);
CREATE INDEX IF NOT EXISTS idx_audit_event ON public.payment_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_order ON public.payment_audit_log(cashfree_order_id);
ALTER TABLE public.payment_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access audit" ON public.payment_audit_log;
CREATE POLICY "Service role full access audit" ON public.payment_audit_log FOR ALL USING (auth.role() = 'service_role');
-- 3. Invoice number sequence
CREATE SEQUENCE IF NOT EXISTS public.invoice_seq START 1;
-- Invoice number generator function
CREATE OR REPLACE FUNCTION public.generate_invoice_number() RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE seq_val INTEGER;
month_str TEXT;
BEGIN seq_val := nextval('public.invoice_seq');
month_str := to_char(now(), 'YYYYMM');
RETURN 'AB-INV-' || month_str || '-' || lpad(seq_val::text, 5, '0');
END;
$$;
-- 4. Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    invoice_number TEXT UNIQUE NOT NULL DEFAULT generate_invoice_number(),
    boost_id UUID REFERENCES public.listing_boosts(id) ON DELETE
    SET NULL,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        -- Customer info (snapshot at time of purchase)
        customer_name TEXT NOT NULL DEFAULT 'AndamanBazaar User',
        customer_email TEXT NOT NULL,
        customer_phone TEXT,
        -- Line item
        item_description TEXT NOT NULL,
        amount_total NUMERIC(10, 2) NOT NULL,
        -- Payment details
        payment_method TEXT,
        cashfree_order_id TEXT,
        cashfree_payment_id TEXT,
        paid_at TIMESTAMPTZ,
        -- Invoice PDF
        invoice_pdf_url TEXT,
        -- Email tracking
        email_sent BOOLEAN NOT NULL DEFAULT false,
        email_sent_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_invoices_user ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_boost ON public.invoices(boost_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices(invoice_number);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own invoices" ON public.invoices;
CREATE POLICY "Users can view own invoices" ON public.invoices FOR
SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Service role full access invoices" ON public.invoices;
CREATE POLICY "Service role full access invoices" ON public.invoices FOR ALL USING (auth.role() = 'service_role');
-- 5. Storage bucket for invoices
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', false) ON CONFLICT (id) DO NOTHING;
-- Authenticated users can read their own invoice PDFs
DROP POLICY IF EXISTS "Users can read own invoice PDFs" ON storage.objects;
CREATE POLICY "Users can read own invoice PDFs" ON storage.objects FOR
SELECT USING (
        bucket_id = 'invoices'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name)) [1] = auth.uid()::text
    );
-- Service role can upload invoice PDFs
DROP POLICY IF EXISTS "Service role upload invoices" ON storage.objects;
CREATE POLICY "Service role upload invoices" ON storage.objects FOR
INSERT WITH CHECK (
        bucket_id = 'invoices'
        AND auth.role() = 'service_role'
    );
-- 6. Add featured columns to listings if missing
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
        AND table_name = 'listings'
        AND column_name = 'is_featured'
) THEN
ALTER TABLE public.listings
ADD COLUMN is_featured BOOLEAN DEFAULT false;
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
        AND table_name = 'listings'
        AND column_name = 'featured_until'
) THEN
ALTER TABLE public.listings
ADD COLUMN featured_until TIMESTAMPTZ;
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
        AND table_name = 'listings'
        AND column_name = 'featured_tier'
) THEN
ALTER TABLE public.listings
ADD COLUMN featured_tier TEXT;
END IF;
END $$;
-- 7. Realtime for listing_boosts
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_rel pr
        JOIN pg_class c ON c.oid = pr.prrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pr.prpubid = (
            SELECT oid
            FROM pg_publication
            WHERE pubname = 'supabase_realtime'
        )
        AND n.nspname = 'public'
        AND c.relname = 'listing_boosts'
) THEN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.listing_boosts';
END IF;
END $$;