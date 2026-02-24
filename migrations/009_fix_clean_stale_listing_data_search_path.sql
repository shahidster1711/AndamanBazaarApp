-- Migration 009: Fix search_path for clean_stale_listing_data
-- Addressing lint warning: function_search_path_mutable
-- https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

ALTER FUNCTION public.clean_stale_listing_data() SET search_path = public;
