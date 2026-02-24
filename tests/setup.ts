import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// ──────────────────────────────────────────────────────────────────────────────
// Supabase mock helper – exported so individual test files can import it
// ──────────────────────────────────────────────────────────────────────────────
export const createMockChain = (data: any = null, error: any = null) => ({
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  neq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data, error }),
  maybeSingle: vi.fn().mockResolvedValue({ data, error }),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  range: vi.fn().mockResolvedValue({ data: Array.isArray(data) ? data : [], error }),
  or: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  like: vi.fn().mockReturnThis(),
  ilike: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  not: vi.fn().mockReturnThis(),
  contains: vi.fn().mockReturnThis(),
  overlaps: vi.fn().mockReturnThis(),
  filter: vi.fn().mockReturnThis(),
  match: vi.fn().mockReturnThis(),
  // Allow awaiting the chain directly
  then: (onFulfilled: any) =>
    Promise.resolve({ data: Array.isArray(data) ? data : data !== null ? [data] : [], error }).then(onFulfilled),
})

// Mock Supabase client – path must match what src/ files import
vi.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => createMockChain()),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
  isSupabaseConfigured: vi.fn().mockReturnValue(true),
}))

// ──────────────────────────────────────────────────────────────────────────────
// Browser API mocks
// ──────────────────────────────────────────────────────────────────────────────

// window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// window.location
Object.defineProperty(window, 'location', {
  writable: true,
  value: {
    href: 'http://localhost:5173',
    origin: 'http://localhost:5173',
    pathname: '/',
    search: '',
    hash: '',
    reload: vi.fn(),
    assign: vi.fn(),
    replace: vi.fn(),
  },
})

// Smooth scroll behaviour (tested by layout.test.tsx)
Object.defineProperty(document.documentElement.style, 'scrollBehavior', {
  writable: true,
  value: 'smooth',
})

// IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  takeRecords: vi.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
}))

// ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Notification API
global.Notification = vi.fn().mockImplementation(() => ({
  permission: 'default',
  requestPermission: vi.fn().mockResolvedValue('granted'),
})) as any

// crypto.randomUUID
if (!global.crypto) {
  global.crypto = {} as Crypto
}
global.crypto.randomUUID = vi.fn().mockReturnValue('test-uuid-12345')

// localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
}
global.localStorage = localStorageMock as any

// sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
}
global.sessionStorage = sessionStorageMock as any

// navigator.geolocation
global.navigator = {
  ...global.navigator,
  geolocation: {
    getCurrentPosition: vi.fn().mockImplementation((success) => {
      success({
        coords: {
          latitude: 11.5,
          longitude: 92.5,
          accuracy: 10,
        },
        timestamp: Date.now(),
      })
    }),
    watchPosition: vi.fn().mockReturnValue(1),
    clearWatch: vi.fn(),
  },
}

// Add a minimal meta description so DOM queries in tests don't fail
const metaDesc = document.createElement('meta')
metaDesc.setAttribute('name', 'description')
metaDesc.setAttribute('content', 'AndamanBazaar – hyperlocal marketplace')
document.head.appendChild(metaDesc)