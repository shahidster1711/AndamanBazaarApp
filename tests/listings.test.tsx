import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Listings } from '../src/pages/Listings';
import { supabase } from '../src/lib/supabase';
import { vi } from 'vitest';

vi.mock('../src/lib/supabase');


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
      const searchInput = screen.getByPlaceholderText(/Search across the islands…/i);
      expect(searchInput).toBeInTheDocument();
    });
  });

  it('renders categories', async () => {
    (supabase.from as any).mockImplementation(() => createMockChain([]));
    renderListings();
    await waitFor(() => {
      expect(screen.getByText(/Fresh Catch/i)).toBeInTheDocument();
      expect(screen.getByText(/Produce/i)).toBeInTheDocument();
      expect(screen.getByText(/Handicrafts/i)).toBeInTheDocument();
    });
  });

  it('shows no results found for unmatched search', async () => {
    (supabase.from as any).mockImplementation(() => createMockChain([]));

    renderListings();
    await waitFor(() => {
      expect(screen.getByText(/Nothing found yet/i)).toBeInTheDocument();
    });
  });
});