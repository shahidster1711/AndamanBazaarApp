-- Migration: Security Enhancements
-- Description: Add rate limiting, audit logs, and security features
-- Author: AndamanBazaar Team
-- Date: 2026-02-12

-- =====================================================
-- RATE LIMITING TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.rate_limits (
  key TEXT PRIMARY KEY, -- Format: user_id:action or ip:action
  count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Index for cleaning expired entries
CREATE INDEX idx_rate_limits_expires ON public.rate_limits(expires_at);

-- Row Level Security
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rate limits" ON public.rate_limits
  FOR SELECT USING (key LIKE auth.uid()::TEXT || '%');

-- =====================================================
-- AUDIT LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'listing_created', 'message_sent', 'login', 'profile_updated', etc.
  resource_type TEXT, -- 'listing', 'message', 'chat', 'profile'
  resource_id UUID,
  ip_address INET,
  user_agent TEXT,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'blocked', 'failed', 'warning')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for querying
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action, created_at DESC);
CREATE INDEX idx_audit_logs_status ON public.audit_logs(status, created_at DESC);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- Row Level Security (read-only for users, full access for admins)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audit logs" ON public.audit_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Only backend can insert (via service role)
-- No INSERT policy for regular users

-- =====================================================
-- SECURITY EVENTS TABLE (for suspicious activity)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('rate_limit_exceeded', 'xss_attempt', 'sql_injection_attempt', 'prompt_injection', 'suspicious_file_upload', 'multiple_failed_logins', 'account_lockout')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  details JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_security_events_user ON public.security_events(user_id, created_at DESC);
CREATE INDEX idx_security_events_type ON public.security_events(event_type, severity);
CREATE INDEX idx_security_events_unresolved ON public.security_events(resolved, severity, created_at DESC);

-- Row Level Security
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Only admins can view (no policies for regular users)

-- =====================================================
-- RATE LIMITING FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key TEXT,
  p_max_requests INTEGER,
  p_window_seconds INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_limit_record RECORD;
  v_now TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
  -- Clean up expired entries periodically
  DELETE FROM public.rate_limits WHERE expires_at < v_now;
  
  -- Check if key exists
  SELECT * INTO v_limit_record FROM public.rate_limits WHERE key = p_key;
  
  IF NOT FOUND THEN
    -- First request, create new entry
    INSERT INTO public.rate_limits (key, count, window_start, expires_at)
    VALUES (
      p_key,
      1,
      v_now,
      v_now + (p_window_seconds || ' seconds')::INTERVAL
    );
    RETURN TRUE;
  ELSE
    -- Check if window has expired
    IF v_now > v_limit_record.expires_at THEN
      -- Reset window
      UPDATE public.rate_limits
      SET count = 1,
          window_start = v_now,
          expires_at = v_now + (p_window_seconds || ' seconds')::INTERVAL
      WHERE key = p_key;
      RETURN TRUE;
    ELSE
      -- Within window
      IF v_limit_record.count < p_max_requests THEN
        -- Increment and allow
        UPDATE public.rate_limits
        SET count = count + 1
        WHERE key = p_key;
        RETURN TRUE;
      ELSE
        -- Rate limit exceeded
        -- Log security event
        INSERT INTO public.security_events (event_type, severity, details, created_at)
        VALUES (
          'rate_limit_exceeded',
          'medium',
          jsonb_build_object(
            'key', p_key,
            'limit', p_max_requests,
            'window_seconds', p_window_seconds
          ),
          v_now
        );
        RETURN FALSE;
      END IF;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_rate_limit IS 'Check if a request exceeds rate limit. Returns TRUE if allowed, FALSE if blocked.';

-- =====================================================
-- AUDIT LOG HELPER FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action TEXT,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT 'success',
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS void AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, status, metadata)
  VALUES (auth.uid(), p_action, p_resource_type, p_resource_id, p_status, p_metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- AUTO-AUDIT TRIGGERS FOR CRITICAL TABLES
-- =====================================================

-- Trigger function for listing changes
CREATE OR REPLACE FUNCTION audit_listing_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    PERFORM log_audit_event('listing_created', 'listing', NEW.id, 'success', to_jsonb(NEW));
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    PERFORM log_audit_event('listing_updated', 'listing', NEW.id, 'success', 
      jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW)));
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    PERFORM log_audit_event('listing_deleted', 'listing', OLD.id, 'success', to_jsonb(OLD));
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_listings
  AFTER INSERT OR UPDATE OR DELETE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION audit_listing_changes();

-- Trigger function for profile changes
CREATE OR REPLACE FUNCTION audit_profile_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    -- Only log if important fields changed
    IF (OLD.name != NEW.name OR OLD.phone_number != NEW.phone_number OR OLD.email != NEW.email) THEN
      PERFORM log_audit_event('profile_updated', 'profile', NEW.id, 'success',
        jsonb_build_object(
          'changed_fields', jsonb_build_object(
            'name', CASE WHEN OLD.name != NEW.name THEN true ELSE false END,
            'phone', CASE WHEN OLD.phone_number != NEW.phone_number THEN true ELSE false END,
            'email', CASE WHEN OLD.email != NEW.email THEN true ELSE false END
          )
        ));
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_profiles
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION audit_profile_changes();

-- =====================================================
-- SECURITY HELPER FUNCTIONS
-- =====================================================

-- Function to check if user is in good standing (not flagged/banned)
CREATE OR REPLACE FUNCTION is_user_in_good_standing(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_recent_security_events INTEGER;
BEGIN
  -- Check for critical security events in last 24 hours
  SELECT COUNT(*) INTO v_recent_security_events
  FROM public.security_events
  WHERE user_id = p_user_id
    AND severity IN ('high', 'critical')
    AND created_at > NOW() - INTERVAL '24 hours'
    AND resolved = false;
  
  -- If more than 3 critical events, user is not in good standing
  RETURN v_recent_security_events < 3;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get rate limit info for user
CREATE OR REPLACE FUNCTION get_rate_limit_info(p_key TEXT)
RETURNS TABLE(
  remaining_requests INTEGER,
  reset_at TIMESTAMP WITH TIME ZONE,
  is_limited BOOLEAN
) AS $$
DECLARE
  v_limit RECORD;
  v_max_requests INTEGER := 20; -- Default
BEGIN
  SELECT * INTO v_limit FROM public.rate_limits WHERE key = p_key;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT v_max_requests, NOW() + INTERVAL '60 seconds', false;
  ELSE
    IF NOW() > v_limit.expires_at THEN
      -- Window expired
      DELETE FROM public.rate_limits WHERE key = p_key;
      RETURN QUERY SELECT v_max_requests, NOW() + INTERVAL '60 seconds', false;
    ELSE
      -- Within window
      RETURN QUERY SELECT 
        (v_max_requests - v_limit.count)::INTEGER,
        v_limit.expires_at,
        (v_limit.count >= v_max_requests);
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.rate_limits IS 'Rate limiting storage for API endpoints and user actions';
COMMENT ON TABLE public.audit_logs IS 'Audit trail for all important user actions and system events';
COMMENT ON TABLE public.security_events IS 'Security incidents and suspicious activity tracking';
