
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Profile } from '../src/pages/Profile';
import { supabase } from '../src/lib/supabase';
import { MemoryRouter } from 'react-router-dom';
import { createMockChain } from './setup';

vi.mock('../src/lib/supabase');

describe('Profile View', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Default mock user
        (supabase.auth.getUser as any).mockResolvedValue({
            data: { user: { id: 'user-123', email: 'test@example.com' } },
            error: null
        });

        // Mock profile and listings using global helper
        (supabase.from as any).mockImplementation((table: string) => {
            if (table === 'profiles') {
                return createMockChain({
                    id: 'user-123',
                    name: 'Test User',
                    city: 'Port Blair',
                    area: 'Garacharma',
                    created_at: new Date('2024-01-01').toISOString(),
                    is_location_verified: true
                });
            }
            if (table === 'listings') {
                return createMockChain([{
                    id: 'listing-1',
                    title: 'My Awesome Item',
                    price: 500,
                    status: 'active',
                    city: 'Port Blair',
                    views_count: 5
                }]);
            }
            return createMockChain();
        });
    });

    const renderProfile = () => {
        render(
            <MemoryRouter>
                <Profile />
            </MemoryRouter>
        );
    };

    it('renders user profile details', async () => {
        renderProfile();
        expect(await screen.findByText('Test User')).toBeInTheDocument();
        expect(await screen.findByText(/Joined in/i)).toBeInTheDocument();
        // Stats should be visible
        expect(await screen.findByText(/Active Ads/i)).toBeInTheDocument();
    });

    it('renders user listings', async () => {
        renderProfile();
        // Wait for the listing to appear
        expect(await screen.findByText('My Awesome Item')).toBeInTheDocument();
        expect(await screen.findByText(/₹\s*500/)).toBeInTheDocument();
    });
});
