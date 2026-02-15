import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Listings } from '../views/Listings';
import { supabase } from '../lib/supabase';
import { vi } from 'vitest';

describe('Listings View', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderListings = () => {
    render(
      <MemoryRouter initialEntries={['/listings']}>
        <Listings />
      </MemoryRouter>
    );
  };

  // Mock chain helper
  const createMockChain = (data: any = [], error: any = null) => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then: (onFullfilled: any) => Promise.resolve({ data, error }).then(onFullfilled),
  });

  it('renders the search input', async () => {
    (supabase.from as any).mockImplementation(() => createMockChain([]));
    renderListings();
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/Search in the Islands.../i);
      expect(searchInput).toBeInTheDocument();
    });
  });

  it('renders categories', async () => {
    (supabase.from as any).mockImplementation(() => createMockChain([]));
    renderListings();
    await waitFor(() => {
      expect(screen.getByText('Mobiles')).toBeInTheDocument();
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Vehicles')).toBeInTheDocument();
    });
  });

  it('shows no results found for unmatched search', async () => {
    (supabase.from as any).mockImplementation(() => createMockChain([]));

    renderListings();
    await waitFor(() => {
      expect(screen.getByText(/No results/i)).toBeInTheDocument();
    });
  });
});