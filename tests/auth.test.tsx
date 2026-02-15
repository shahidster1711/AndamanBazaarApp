import React from 'react';
import { render, screen } from '@testing-library/react';
import { AuthView } from '../views/AuthView';

describe('AuthView', () => {
  it('renders the Google OAuth button', () => {
    render(<AuthView />);
    const googleButton = screen.getByText(/Continue with Google/i);
    expect(googleButton).toBeInTheDocument();
  });
});