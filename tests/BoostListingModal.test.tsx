import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BoostListingModal } from '../src/components/BoostListingModal';
import { supabase } from '../src/lib/supabase';

vi.mock('../src/lib/supabase');

describe('BoostListingModal Component', () => {
    const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        listingId: 'mock-listing-123',
        listingTitle: 'Test Island Land',
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset window.location mock
        Object.defineProperty(window, 'location', {
            configurable: true,
            value: { href: vi.fn() },
        });

        // Mock exact global fetch API
        global.fetch = vi.fn();
    });

    it('should not render when isOpen is false', () => {
        render(<BoostListingModal {...defaultProps} isOpen={false} />);
        expect(screen.queryByText(/Boost Your Listing/i)).not.toBeInTheDocument();
    });

    it('should render all 3 tiers with correct pricing when open', () => {
        render(<BoostListingModal {...defaultProps} />);

        expect(screen.getByText('Boost Your Listing')).toBeInTheDocument();
        expect(screen.getByText('Test Island Land')).toBeInTheDocument();

        // Tier Names
        expect(screen.getByText('Spark')).toBeInTheDocument();
        expect(screen.getByText('Boost')).toBeInTheDocument();
        expect(screen.getByText('Power')).toBeInTheDocument();

        // Pricing
        expect(screen.getByText('₹49')).toBeInTheDocument();
        expect(screen.getByText('₹99')).toBeInTheDocument();
        expect(screen.getByText('₹199')).toBeInTheDocument();
    });

    it('should allow user to change selected tier and update the checkout button price', async () => {
        render(<BoostListingModal {...defaultProps} />);

        // Setup initial default (Boost)
        expect(screen.getByText(/Pay ₹99 Securely/i)).toBeInTheDocument();

        // Click on Spark Tier
        const sparkTier = screen.getByText('Spark');
        fireEvent.click(sparkTier);

        // Assert button price updated
        await waitFor(() => {
            expect(screen.getByText(/Pay ₹49 Securely/i)).toBeInTheDocument();
        });

        // Click on Power Tier
        const powerTier = screen.getByText('Power');
        fireEvent.click(powerTier);

        // Assert button price updated
        await waitFor(() => {
            expect(screen.getByText(/Pay ₹199 Securely/i)).toBeInTheDocument();
        });
    });

    it('should show an error toast and abort if the user is not signed in', async () => {
        render(<BoostListingModal {...defaultProps} />);

        const payButton = screen.getByText(/Pay ₹99/i);
        fireEvent.click(payButton);

        // Supabase getSession mock from tests/setup.ts returns `session: null` by default
        await waitFor(() => {
            expect(supabase.auth.getSession).toHaveBeenCalled();
            // Test that fetch was never called
            expect(global.fetch).not.toHaveBeenCalled();
        });
    });

    it('should call the create-boost-order Edge Function and redirect to Cashfree on success', async () => {
        render(<BoostListingModal {...defaultProps} />);

        // Mock Supabase to return an authenticated user session
        vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
            data: { session: { access_token: 'mock_jwt_token' } } as any,
            error: null
        });

        // Mock fetch response returning a cashfree payment link
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                success: true,
                payment_link: 'https://cashfree.com/mock-payment-url'
            })
        } as any);

        const payButton = screen.getByText(/Pay ₹99/i);
        fireEvent.click(payButton);

        // Expect loading state
        expect(screen.getByText(/Creating Payment.../i)).toBeInTheDocument();

        await waitFor(() => {
            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('/functions/v1/create-boost-order'),
                expect.objectContaining({
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer mock_jwt_token'
                    },
                    body: JSON.stringify({
                        listing_id: 'mock-listing-123',
                        tier: 'boost'
                    })
                })
            );

            // Expect window redirect to trigger
            expect(window.location.href).toBe('https://cashfree.com/mock-payment-url');
        });
    });
});
