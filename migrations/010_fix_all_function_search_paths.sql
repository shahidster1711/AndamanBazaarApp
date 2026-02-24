-- Migration 010: Fix search_path for ALL functions
-- Addressing lint warning: function_search_path_mutable
-- Security Best Practice: Always set search_path for SECURITY DEFINER functions

-- 001_recommendations_schema.sql
ALTER FUNCTION public.clean_expired_recommendations() SET search_path = public;
ALTER FUNCTION public.get_similar_users_listings(UUID, INTEGER) SET search_path = public;
ALTER FUNCTION public.update_trending_listings() SET search_path = public;

-- 002_chat_enhancements.sql
ALTER FUNCTION public.mark_messages_as_read(UUID, UUID) SET search_path = public;
ALTER FUNCTION public.archive_chat(UUID, BOOLEAN) SET search_path = public;
ALTER FUNCTION public.delete_message(UUID) SET search_path = public;
ALTER FUNCTION public.get_total_unread_count() SET search_path = public;
ALTER FUNCTION public.cleanup_old_typing_events() SET search_path = public;

-- 003_security_enhancements.sql
ALTER FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) SET search_path = public;
ALTER FUNCTION public.log_audit_event(TEXT, TEXT, UUID, TEXT, JSONB) SET search_path = public;
ALTER FUNCTION public.audit_listing_changes() SET search_path = public;
ALTER FUNCTION public.audit_profile_changes() SET search_path = public;
ALTER FUNCTION public.is_user_in_good_standing(UUID) SET search_path = public;
ALTER FUNCTION public.get_rate_limit_info(TEXT) SET search_path = public;

-- 004_post_ad_enhancements.sql
ALTER FUNCTION public.check_duplicate_listing(UUID, TEXT, TEXT, FLOAT) SET search_path = public;
ALTER FUNCTION public.get_price_suggestion(TEXT, TEXT) SET search_path = public;
ALTER FUNCTION public.clean_stale_drafts() SET search_path = public;
ALTER FUNCTION public.expire_old_listings() SET search_path = public;

-- 008_production_readiness_fixes.sql
ALTER FUNCTION public.increment_listing_views(UUID) SET search_path = public;
