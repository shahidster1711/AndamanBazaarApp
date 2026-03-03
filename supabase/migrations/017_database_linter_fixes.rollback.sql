-- Restores indexes dropped by 017_database_linter_fixes.sql
-- Source: captured from original migrations (migrations/ and supabase/migrations/).
--
-- To capture definitions from a live DB before migration, run:
--   SELECT indexname, indexdef FROM pg_indexes
--   WHERE schemaname = 'public' AND indexname IN (
--     'idx_listing_boosts_status', 'idx_audit_boost', 'idx_audit_event', 'idx_audit_order',
--     'idx_invoices_boost', 'idx_invoices_number', 'idx_user_interactions_user_type',
--     'idx_user_interactions_created', 'idx_recommendations_user_score', 'idx_recommendations_expires',
--     'idx_listings_idempotency', 'idx_listings_moderation', 'idx_listings_drafts',
--     'idx_trending_city_score', 'idx_trending_category_score', 'idx_messages_unread',
--     'idx_chats_active', 'idx_typing_events_chat', 'idx_audit_logs_action', 'idx_audit_logs_status',
--     'idx_audit_logs_created', 'idx_security_events_type', 'idx_security_events_unresolved',
--     'idx_listings_moderation_status', 'idx_listings_deleted_at', 'idx_listings_active_category_created',
--     'idx_listings_views_count', 'idx_listings_fts', 'idx_messages_deleted_at', 'idx_listings_featured',
--     'idx_listings_browse', 'idx_listings_user_status', 'idx_listing_boosts_active',
--     'idx_listing_boosts_cashfree_order', 'idx_profiles_email', 'idx_profiles_phone',
--     'idx_profiles_city', 'idx_profiles_trust_level', 'idx_reports_status', 'idx_trending_category',
--     'idx_trending_period_rank', 'idx_user_interactions_type', 'idx_chat_typing_events_user_id',
--     'idx_chats_archived_by'
--   );
--
-- Then replace any inferred definitions below with the exact indexdef output.

-- === From migration 014_financial_system.sql ===
CREATE INDEX idx_listing_boosts_status ON public.listing_boosts USING btree (status);
CREATE INDEX idx_audit_boost ON public.payment_audit_log USING btree (boost_id);
CREATE INDEX idx_audit_event ON public.payment_audit_log USING btree (event_type);
CREATE INDEX idx_audit_order ON public.payment_audit_log USING btree (cashfree_order_id);
CREATE INDEX idx_invoices_boost ON public.invoices USING btree (boost_id);
CREATE INDEX idx_invoices_number ON public.invoices USING btree (invoice_number);

-- === From migration 001_recommendations_schema.sql ===
CREATE INDEX idx_user_interactions_user_type ON public.user_interactions USING btree (user_id, interaction_type, created_at DESC);
CREATE INDEX idx_user_interactions_created ON public.user_interactions USING btree (created_at DESC);
CREATE INDEX idx_recommendations_user_score ON public.recommendations_cache USING btree (user_id, score DESC, expires_at DESC);
CREATE INDEX idx_recommendations_expires ON public.recommendations_cache USING btree (expires_at);
CREATE INDEX idx_trending_city_score ON public.trending_listings USING btree (city, score DESC);
CREATE INDEX idx_trending_category_score ON public.trending_listings USING btree (category_id, score DESC);

-- === From migration 002_chat_enhancements.sql ===
CREATE INDEX idx_messages_unread ON public.messages USING btree (chat_id, is_read, created_at DESC);
CREATE INDEX idx_chats_active ON public.chats USING btree (is_archived, last_message_at DESC);
CREATE INDEX idx_typing_events_chat ON public.chat_typing_events USING btree (chat_id, started_at DESC);

-- === From migration 003_security_enhancements.sql ===
CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action, created_at DESC);
CREATE INDEX idx_audit_logs_status ON public.audit_logs USING btree (status, created_at DESC);
CREATE INDEX idx_audit_logs_created ON public.audit_logs USING btree (created_at DESC);
CREATE INDEX idx_security_events_type ON public.security_events USING btree (event_type, severity);
CREATE INDEX idx_security_events_unresolved ON public.security_events USING btree (resolved, severity, created_at DESC);

-- === From migration 004_post_ad_enhancements.sql ===
CREATE INDEX idx_listings_idempotency ON public.listings USING btree (idempotency_key) WHERE (idempotency_key IS NOT NULL);
CREATE INDEX idx_listings_moderation ON public.listings USING btree (moderation_status, created_at DESC) WHERE (moderation_status = 'pending_review'::text);
CREATE INDEX idx_listings_drafts ON public.listings USING btree (status, updated_at) WHERE (status = 'draft'::text);

-- === From migration 011_listing_boosts_cashfree.sql ===
CREATE INDEX idx_listing_boosts_cashfree_order ON public.listing_boosts USING btree (cashfree_order_id);

-- === Inferred / from schema – verify against pg_indexes before restore ===
-- These may have been created by Supabase dashboard, older migrations, or schema sync.
-- If any fails (e.g. missing column), run the pg_indexes query above and use the exact indexdef.
CREATE INDEX idx_listings_moderation_status ON public.listings USING btree (moderation_status);
CREATE INDEX idx_listings_deleted_at ON public.listings USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);
CREATE INDEX idx_listings_active_category_created ON public.listings USING btree (status, category_id, created_at DESC) WHERE (status = 'active'::text);
CREATE INDEX idx_listings_views_count ON public.listings USING btree (views_count DESC);
CREATE INDEX idx_listings_fts ON public.listings USING gin (to_tsvector('simple'::regconfig, coalesce(title, ''::text) || ' '::text || coalesce(description, ''::text)));
CREATE INDEX idx_messages_deleted_at ON public.messages USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);
CREATE INDEX idx_listings_featured ON public.listings USING btree (is_featured, featured_until) WHERE (is_featured = true);
CREATE INDEX idx_listings_browse ON public.listings USING btree (status, category_id, city, created_at DESC) WHERE (status = 'active'::text);
CREATE INDEX idx_listings_user_status ON public.listings USING btree (user_id, status);
CREATE INDEX idx_listing_boosts_active ON public.listing_boosts USING btree (status, featured_until) WHERE (status = 'paid'::text AND featured_until IS NOT NULL);
CREATE UNIQUE INDEX idx_profiles_email ON public.profiles USING btree (email) WHERE (email IS NOT NULL);
CREATE INDEX idx_profiles_phone ON public.profiles USING btree (phone_number) WHERE (phone_number IS NOT NULL);
CREATE INDEX idx_profiles_city ON public.profiles USING btree (city) WHERE (city IS NOT NULL);
CREATE INDEX idx_profiles_trust_level ON public.profiles USING btree (trust_level) WHERE (trust_level IS NOT NULL);
CREATE INDEX idx_reports_status ON public.reports USING btree (status);
CREATE INDEX idx_trending_category ON public.trending_listings USING btree (category_id);
CREATE INDEX idx_trending_period_rank ON public.trending_listings USING btree (period, rank);
CREATE INDEX idx_user_interactions_type ON public.user_interactions USING btree (interaction_type);
CREATE INDEX idx_chat_typing_events_user_id ON public.chat_typing_events USING btree (user_id);
CREATE INDEX idx_chats_archived_by ON public.chats USING btree (archived_by) WHERE (archived_by IS NOT NULL);
