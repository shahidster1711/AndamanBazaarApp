import { supabase } from './supabase';
import { logAuditEvent, sanitizeErrorMessage } from './security';

// ===== AUTHENTICATION UTILITIES =====

/**
 * Result type for authentication operations
 */
export interface AuthResult {
    success: boolean;
    error?: string;
}

/**
 * Securely log out the current user
 * Clears the Supabase session and logs the action for audit trail
 * 
 * @returns Promise with success status and optional error message
 * 
 * @example
 * ```typescript
 * const result = await logout();
 * if (result.success) {
 *   navigate('/auth');
 * } else {
 *   alert(result.error);
 * }
 * ```
 */
export const logout = async (): Promise<AuthResult> => {
    try {
        // Log the logout action before signing out
        await logAuditEvent({
            action: 'user_logout',
            status: 'success',
            metadata: { timestamp: new Date().toISOString() }
        });

        // Sign out from Supabase
        const { error } = await supabase.auth.signOut();

        if (error) {
            throw error;
        }

        return { success: true };
    } catch (err: any) {
        const safeError = sanitizeErrorMessage(err);

        // Log failed logout attempt
        await logAuditEvent({
            action: 'user_logout',
            status: 'failed',
            metadata: { error: safeError }
        });

        return {
            success: false,
            error: safeError || 'Failed to logout. Please try again.'
        };
    }
};

/**
 * Check if a user is currently authenticated
 * @returns Promise resolving to true if user is logged in
 */
export const isAuthenticated = async (): Promise<boolean> => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        return !!session;
    } catch {
        return false;
    }
};

/**
 * Get the current user's ID
 * @returns Promise resolving to user ID or null
 */
export const getCurrentUserId = async (): Promise<string | null> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        return user?.id || null;
    } catch {
        return null;
    }
};
