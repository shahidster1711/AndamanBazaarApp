
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthView } from '../../src/pages/AuthView';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';
import { ToastProvider } from '../../src/components/Toast';

// Mock Supabase
vi.mock('../../src/lib/supabase', () => ({
    supabase: {
        auth: {
            getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
            signInWithPassword: vi.fn(),
            signUp: vi.fn(),
            signInWithOtp: vi.fn(),
            verifyOtp: vi.fn(),
            signInWithOAuth: vi.fn(),
        },
    },
    isSupabaseConfigured: vi.fn().mockReturnValue(true),
}));

describe('Auth UI Logic (Vitest)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderAuth = () => {
        return render(
            <BrowserRouter>
                <ToastProvider>
                    <AuthView />
                </ToastProvider>
            </BrowserRouter>
        );
    };

    it('switches between Login, Signup, and Phone modes', () => {
        renderAuth();

        // Default is login
        expect(screen.getByText('Sign In Securely')).toBeTruthy();

        // Switch to Signup
        fireEvent.click(screen.getByRole('button', { name: /signup/i }));
        expect(screen.getByText('Create Island Account')).toBeTruthy();
        expect(screen.getByLabelText(/Display Name/i)).toBeTruthy();

        // Switch to Phone
        fireEvent.click(screen.getByRole('button', { name: /phone/i }));
        expect(screen.getByText('Get OTP')).toBeTruthy();
        expect(screen.getByLabelText(/Phone Number/i)).toBeTruthy();
    });

    it('validates password strength in Signup mode', async () => {
        renderAuth();
        fireEvent.click(screen.getByRole('button', { name: /signup/i }));

        const passwordInput = screen.getByLabelText(/Secret Password/i);

        // Weak password
        fireEvent.change(passwordInput, { target: { value: 'weak' } });
        expect(screen.getByText(/○ 8\+ chars/i)).toBeTruthy();
        expect(screen.getByText(/○ Uppercase/i)).toBeTruthy();

        // Stronger password
        fireEvent.change(passwordInput, { target: { value: 'StrongPass1' } });
        expect(screen.getByText(/✓ 8\+ chars/i)).toBeTruthy();
        expect(screen.getByText(/✓ Uppercase/i)).toBeTruthy();
        expect(screen.getByText(/✓ Lowercase/i)).toBeTruthy();
        expect(screen.getByText(/✓ Number/i)).toBeTruthy();
    });

    it('handles email login submission', async () => {
        const signInSpy = vi.spyOn(supabase.auth, 'signInWithPassword').mockResolvedValue({ data: { session: {} } as any, error: null });
        renderAuth();

        fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByLabelText(/Secret Password/i), { target: { value: 'Password123!' } });
        fireEvent.click(screen.getByRole('button', { name: /Sign In Securely/i }));

        await waitFor(() => {
            expect(signInSpy).toHaveBeenCalledWith({
                email: 'test@example.com',
                password: 'Password123!',
            });
        });
    });

    it('shows error message if supabase is not configured', () => {
        vi.mocked(isSupabaseConfigured).mockReturnValue(false);

        renderAuth();
        expect(screen.getByText(/Auth is not configured/i)).toBeTruthy();
    });
});
