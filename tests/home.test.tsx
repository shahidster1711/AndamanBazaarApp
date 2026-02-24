import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Home } from '../src/pages/Home';

describe('HomeView', () => {
  it('renders the main heading', async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    await waitFor(() => {
      const heading = screen.getByText(/Buy & Sell/i);
      const subheading = screen.getByText(/in Paradise\./i);
      expect(heading).toBeInTheDocument();
      expect(subheading).toBeInTheDocument();
    });
  });
});