import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
    cleanup();
});

// Mock environment variables for tests
process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.API_KEY = 'test-api-key';

// Mock DOMPurify for server-side tests
vi.mock('dompurify', () => ({
    default: {
        sanitize: (input: string) => input, // Simple pass-through mock
    },
}));

// Mock navigator.geolocation for location tests
Object.defineProperty(global.navigator, 'geolocation', {
    value: {
        getCurrentPosition: vi.fn((success) =>
            success({
                coords: {
                    latitude: 11.6234,
                    longitude: 92.7265,
                    accuracy: 100,
                },
            })
        ),
    },
    configurable: true,
});

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
    value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
    },
    writable: true,
});

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
    value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
    },
    writable: true,
});
