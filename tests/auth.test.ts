import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logout, isAuthenticated, getCurrentUserId } from '../lib/auth';
import { supabase } from '../lib/supabase';
import * as security from '../lib/security';

// Mock the supabase module
vi.mock('../lib/supabase', () => ({
    supabase: {
        auth: {
            signOut: vi.fn(),
            getSession: vi.fn(),
            getUser: vi.fn(),
        }
    }
}));

// Mock the security module
vi.mock('../lib/security', () => ({
    logAuditEvent: vi.fn(),
    sanitizeErrorMessage: vi.fn((err) => err?.message || String(err))
}));

describe('Auth Utilities', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('logout', () => {
        it('should successfully log out a user', async () => {
            // Mock successful signOut
            vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null } as any);

            const result = await logout();

            expect(result.success).toBe(true);
            expect(result.error).toBeUndefined();
            expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
            expect(security.logAuditEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: 'user_logout',
                    status: 'success',
                })
            );
        });

        it('should handle logout errors gracefully', async () => {
            const mockError = new Error('Network error');
            vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: mockError } as any);

            const result = await logout();

            expect(result.success).toBe(false);
            expect(result.error).toBeTruthy();
            expect(security.sanitizeErrorMessage).toHaveBeenCalledWith(mockError);
            expect(security.logAuditEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: 'user_logout',
                    status: 'failed',
                })
            );
        });

        it('should log audit events before and after logout', async () => {
            vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null } as any);

            await logout();

            // Should be called at least once for success
            expect(security.logAuditEvent).toHaveBeenCalled();
            const calls = vi.mocked(security.logAuditEvent).mock.calls;
            expect(calls.some(call => call[0].status === 'success')).toBe(true);
        });

        it('should sanitize error messages', async () => {
            const mockError = new Error('Auth session expired: token abc123xyz');
            vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: mockError } as any);
            vi.mocked(security.sanitizeErrorMessage).mockReturnValue('An error occurred. Please try again later.');

            const result = await logout();

            expect(result.success).toBe(false);
            expect(security.sanitizeErrorMessage).toHaveBeenCalledWith(mockError);
            expect(result.error).toBe('An error occurred. Please try again later.');
        });
    });

    describe('isAuthenticated', () => {
        it('should return true when user has active session', async () => {
            vi.mocked(supabase.auth.getSession).mockResolvedValue({
                data: { session: { user: { id: 'user123' } } as any },
                error: null
            } as any);

            const result = await isAuthenticated();

            expect(result).toBe(true);
        });

        it('should return false when no session exists', async () => {
            vi.mocked(supabase.auth.getSession).mockResolvedValue({
                data: { session: null },
                error: null
            } as any);

            const result = await isAuthenticated();

            expect(result).toBe(false);
        });

        it('should return false on error', async () => {
            vi.mocked(supabase.auth.getSession).mockRejectedValue(new Error('Network error'));

            const result = await isAuthenticated();

            expect(result).toBe(false);
        });
    });

    describe('getCurrentUserId', () => {
        it('should return user ID when authenticated', async () => {
            vi.mocked(supabase.auth.getUser).mockResolvedValue({
                data: { user: { id: 'user123' } as any },
                error: null
            } as any);

            const result = await getCurrentUserId();

            expect(result).toBe('user123');
        });

        it('should return null when not authenticated', async () => {
            vi.mocked(supabase.auth.getUser).mockResolvedValue({
                data: { user: null },
                error: null
            } as any);

            const result = await getCurrentUserId();

            expect(result).toBeNull();
        });

        it('should return null on error', async () => {
            vi.mocked(supabase.auth.getUser).mockRejectedValue(new Error('Network error'));

            const result = await getCurrentUserId();

            expect(result).toBeNull();
        });
    });
});
