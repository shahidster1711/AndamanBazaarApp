import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Home } from '../views/Home';

describe('HomeView', () => {
  it('renders the main heading', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    const heading = screen.getByText(/Trade Locally in/i);
    const subheading = screen.getByText(/The Andamans./i);
    expect(heading).toBeInTheDocument();
    expect(subheading).toBeInTheDocument();
  });
});