import * as Sentry from '@sentry/react';

/**
 * Initialize Sentry error tracking.
 * Call this once at app startup (before React renders).
 *
 * Required env var: VITE_SENTRY_DSN
 * Optional env var: VITE_SENTRY_ENVIRONMENT (defaults to 'production')
 */
export function initSentry() {
    const dsn = import.meta.env.VITE_SENTRY_DSN;
    if (!dsn) {
        console.warn('[Sentry] VITE_SENTRY_DSN not set — error tracking disabled.');
        return;
    }

    Sentry.init({
        dsn,
        environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || 'production',
        integrations: [
            Sentry.browserTracingIntegration(),
            Sentry.replayIntegration({
                maskAllText: false,
                blockAllMedia: false,
            }),
        ],
        // Performance: capture 20% of transactions in production
        tracesSampleRate: import.meta.env.DEV ? 1.0 : 0.2,
        // Session Replay: capture 10% of sessions, 100% on error
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
        // Filter noisy errors
        beforeSend(event) {
            // Ignore network errors caused by user going offline
            if (event.exception?.values?.[0]?.value?.includes('Failed to fetch')) {
                return null;
            }
            return event;
        },
    });
}

/**
 * Capture an exception in Sentry with optional context.
 */
export function captureError(error: unknown, context?: Record<string, any>) {
    if (context) {
        Sentry.setContext('additional', context);
    }
    Sentry.captureException(error);
}

/**
 * Set the current user for Sentry context.
 * Call after login or auth state change.
 */
export function setSentryUser(user: { id: string; email?: string } | null) {
    if (user) {
        Sentry.setUser({ id: user.id, email: user.email });
    } else {
        Sentry.setUser(null);
    }
}

// Re-export Sentry's ErrorBoundary for use in React trees
export const SentryErrorBoundary = Sentry.ErrorBoundary;
