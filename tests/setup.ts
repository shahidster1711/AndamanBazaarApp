import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Global mock for Supabase
export const createMockChain = (data: any = [], error: any = null) => {
    const chain: any = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        // Make it thenable for await
        then: (onFullfilled: any) => Promise.resolve({ data, error }).then(onFullfilled),
    };
    return chain;
};

export const mockSupabase = {
    auth: {
        getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
        getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
        onAuthStateChange: vi.fn(() => ({
            data: { subscription: { unsubscribe: vi.fn() } },
        })),
        signInWithPassword: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
    },
    from: vi.fn(() => createMockChain()),
    channel: vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
    storage: {
        from: vi.fn(() => ({
            upload: vi.fn(),
            getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'mock-url' } })),
        })),
    },
};

vi.mock('../lib/supabase', () => ({
    supabase: mockSupabase as any,
    isSupabaseConfigured: vi.fn(() => true),
}));

// Global mock for Toast context
vi.mock('../components/Toast', () => ({
    ToastProvider: ({ children }: { children: React.ReactNode }) => children,
    useToast: () => ({
        showToast: vi.fn(),
    }),
}));
