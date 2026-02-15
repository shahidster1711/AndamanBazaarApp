import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';
import { vi } from 'vitest';

describe('App', () => {
  it('renders sign in link when unauthenticated', async () => {
    render(<App />);

    // Use waitFor to account for the initial loading state in App.tsx
    await waitFor(() => {
      expect(screen.getByText(/Sign In/i)).toBeInTheDocument();
    });
  });
});