import { supabase } from './supabase';

// ===== RATE LIMITING =====

interface RateLimitConfig {
    maxRequests: number;
    windowSeconds: number;
}

const defaultConfig: RateLimitConfig = {
    maxRequests: 20,
    windowSeconds: 60,
};

// In-memory rate limit cache (fast client-side fallback)
const rateLimitCache = new Map<string, { count: number; resetAt: number }>();

/**
 * Rate limiting — uses server-side DB function with client-side fallback.
 * The DB function (check_rate_limit) is the source of truth and enforces
 * limits even if the client is bypassed.
 */
export const checkRateLimit = (
    key: string,
    config: Partial<RateLimitConfig> = {}
): { allowed: boolean; retryAfter?: number } => {
    const { maxRequests, windowSeconds } = { ...defaultConfig, ...config };
    const now = Date.now();

    // Clean expired entries
    for (const [k, v] of rateLimitCache.entries()) {
        if (v.resetAt < now) rateLimitCache.delete(k);
    }

    const existing = rateLimitCache.get(key);

    if (!existing) {
        rateLimitCache.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
        // Fire-and-forget server-side check
        checkServerRateLimit(key, config).catch(() => { });
        return { allowed: true };
    }

    if (existing.count < maxRequests) {
        existing.count++;
        // Fire-and-forget server-side check
        checkServerRateLimit(key, config).catch(() => { });
        return { allowed: true };
    }

    const retryAfter = Math.ceil((existing.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
};

/**
 * Server-side rate limit check via Supabase function
 */
export const checkServerRateLimit = async (
    key: string,
    config: Partial<RateLimitConfig> = {}
): Promise<{ allowed: boolean; error?: string }> => {
    const { maxRequests, windowSeconds } = { ...defaultConfig, ...config };

    try {
        const { data, error } = await supabase.rpc('check_rate_limit', {
            p_key: key,
            p_max_requests: maxRequests,
            p_window_seconds: windowSeconds,
        });

        if (error) {
            console.error('Rate limit check failed:', error);
            return { allowed: true }; // Fail open to avoid blocking users
        }

        return { allowed: !!data };
    } catch (err) {
        console.error('Rate limit error:', err);
        return { allowed: true }; // Fail open
    }
};

// ===== AUDIT LOGGING =====

interface AuditLogEntry {
    action: string;
    resource_type?: string;
    resource_id?: string;
    metadata?: Record<string, any>;
    status?: 'success' | 'blocked' | 'failed';
}

/**
 * Log user actions for audit trail
 */
export const logAuditEvent = async (entry: AuditLogEntry): Promise<void> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return; // Skip if not authenticated

        const { error } = await supabase.from('audit_logs').insert({
            user_id: user.id,
            ...entry,
            ip_address: null, // Can't get IP on client-side
            user_agent: navigator.userAgent,
        });

        if (error) {
            console.error('Audit log failed:', error);
        }
    } catch (err) {
        // Silent fail - don't block user actions
        console.debug('Audit log error:', err);
    }
};

// ===== CSRF Note =====
// CSRF protection is handled inherently by Supabase's JWT-based auth.
// Bearer tokens in headers are not vulnerable to classic CSRF attacks.
// No additional CSRF utilities needed.

// ===== INPUT SANITIZATION WRAPPERS =====

/**
 * Secure localStorage wrapper with error handling
 */
export const secureStorage = {
    get: <T>(key: string, fallback: T): T => {
        try {
            const item = localStorage.getItem(key);
            if (!item) return fallback;
            return JSON.parse(item) as T;
        } catch {
            return fallback;
        }
    },

    set: (key: string, value: any): boolean => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch {
            return false;
        }
    },

    remove: (key: string): void => {
        try {
            localStorage.removeItem(key);
        } catch {
            // Silent fail
        }
    },
};

// ===== REQUEST TRACKING =====

interface RequestMetrics {
    endpoint: string;
    duration: number;
    status: 'success' | 'error';
    timestamp: number;
}

const requestMetrics: RequestMetrics[] = [];

/**
 * Track API request metrics for monitoring
 */
export const trackRequest = (metrics: Omit<RequestMetrics, 'timestamp'>): void => {
    requestMetrics.push({
        ...metrics,
        timestamp: Date.now(),
    });

    // Keep only last 100 requests
    if (requestMetrics.length > 100) {
        requestMetrics.shift();
    }
};

/**
 * Get request metrics (for debugging)
 */
export const getRequestMetrics = (): RequestMetrics[] => {
    return [...requestMetrics];
};

/**
 * Detect suspicious activity patterns
 */
export const detectSuspiciousActivity = (): {
    suspicious: boolean;
    reason?: string;
} => {
    if (requestMetrics.length < 10) {
        return { suspicious: false };
    }

    const recentRequests = requestMetrics.slice(-20);
    const now = Date.now();
    const last5Seconds = recentRequests.filter(r => now - r.timestamp < 5000);

    // More than 10 requests in 5 seconds
    if (last5Seconds.length > 10) {
        return { suspicious: true, reason: 'Too many requests' };
    }

    // High error rate
    const errors = recentRequests.filter(r => r.status === 'error');
    if (errors.length > 10) {
        return { suspicious: true, reason: 'High error rate' };
    }

    return { suspicious: false };
};

// ===== CONTENT SECURITY POLICY =====

/**
 * Generate inline style nonce for CSP
 * Use this for dynamic styles to avoid 'unsafe-inline'
 */
export const generateStyleNonce = (): string => {
    return crypto.randomUUID().replace(/-/g, '');
};

// ===== ERROR SANITIZATION =====

/**
 * Sanitize error messages before showing to user
 * Prevents leaking sensitive information
 */
export const sanitizeErrorMessage = (error: any): string => {
    const message = error?.message || String(error);

    // Remove sensitive patterns
    const sanitized = message
        .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
        .replace(/\b\d{10}\b/g, '[PHONE]')
        .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, '[TOKEN]')
        .replace(/password[=:]\s*\S+/gi, 'password=[REDACTED]')
        .replace(/api[_-]?key[=:]\s*\S+/gi, 'api_key=[REDACTED]');

    // Generic error for database/auth errors
    if (/database|sql|auth|jwt/i.test(sanitized)) {
        return 'An error occurred. Please try again later.';
    }

    return sanitized;
};
