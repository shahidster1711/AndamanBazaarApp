import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Listings } from '../views/Listings';

describe('Listings', () => {
  it('renders the search input', () => {
    render(
      <MemoryRouter initialEntries={['/listings']}>
        <Listings />
      </MemoryRouter>
    );
    const searchInput = screen.getByPlaceholderText(/Search in the Islands.../i);
    expect(searchInput).toBeInTheDocument();
  });
});