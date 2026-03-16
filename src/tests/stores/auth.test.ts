import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'

const {
  mockGetSession,
  mockOnAuthStateChange,
  mockSignInWithPassword,
  mockSignUp,
  mockSignOut,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockOnAuthStateChange: vi.fn(),
  mockSignInWithPassword: vi.fn(),
  mockSignUp: vi.fn(),
  mockSignOut: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      signOut: mockSignOut,
    },
  },
}))

const mockUser = { id: 'user-1', email: 'test@example.com' }
const mockSession = { user: mockUser, access_token: 'token-123' }

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
})

describe('useAuthStore', () => {
  describe('init()', () => {
    it('sets user and session from getSession()', async () => {
      mockGetSession.mockResolvedValue({ data: { session: mockSession } })
      const store = useAuthStore()
      await store.init()
      expect(store.user).toEqual(mockUser)
      expect(store.session).toEqual(mockSession)
    })

    it('sets null when no session exists', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } })
      const store = useAuthStore()
      await store.init()
      expect(store.user).toBeNull()
      expect(store.session).toBeNull()
    })

    it('subscribes to onAuthStateChange', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } })
      const store = useAuthStore()
      await store.init()
      expect(mockOnAuthStateChange).toHaveBeenCalledOnce()
    })
  })

  describe('login()', () => {
    it('calls signInWithPassword and sets user/session on success', async () => {
      mockSignInWithPassword.mockResolvedValue({ data: { user: mockUser, session: mockSession }, error: null })
      const store = useAuthStore()
      await store.login('test@example.com', 'password123')
      expect(mockSignInWithPassword).toHaveBeenCalledWith({ email: 'test@example.com', password: 'password123' })
      expect(store.user).toEqual(mockUser)
      expect(store.session).toEqual(mockSession)
      expect(store.error).toBeNull()
      expect(store.loading).toBe(false)
    })

    it('sets error string on failure', async () => {
      mockSignInWithPassword.mockResolvedValue({ data: { user: null, session: null }, error: { message: 'Invalid login credentials' } })
      const store = useAuthStore()
      await store.login('bad@example.com', 'wrongpass')
      expect(store.error).toBe('Invalid login credentials')
      expect(store.user).toBeNull()
      expect(store.loading).toBe(false)
    })
  })

  describe('signup()', () => {
    it('calls signUp and sets user/session on success', async () => {
      mockSignUp.mockResolvedValue({ data: { user: mockUser, session: mockSession }, error: null })
      const store = useAuthStore()
      await store.signup('new@example.com', 'password123')
      expect(mockSignUp).toHaveBeenCalledWith({ email: 'new@example.com', password: 'password123' })
      expect(store.user).toEqual(mockUser)
      expect(store.session).toEqual(mockSession)
      expect(store.error).toBeNull()
      expect(store.loading).toBe(false)
    })

    it('sets error string on failure', async () => {
      mockSignUp.mockResolvedValue({ data: { user: null, session: null }, error: { message: 'User already registered' } })
      const store = useAuthStore()
      await store.signup('existing@example.com', 'password123')
      expect(store.error).toBe('User already registered')
      expect(store.loading).toBe(false)
    })
  })

  describe('logout()', () => {
    it('calls signOut and clears user/session', async () => {
      mockSignOut.mockResolvedValue({ error: null })
      const store = useAuthStore()
      // Simulate being logged in
      store.user = mockUser as any
      store.session = mockSession as any
      await store.logout()
      expect(mockSignOut).toHaveBeenCalledOnce()
      expect(store.user).toBeNull()
      expect(store.session).toBeNull()
    })
  })
})
