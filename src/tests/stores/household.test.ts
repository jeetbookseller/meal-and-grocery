import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useHouseholdStore } from '@/stores/household'

const {
  mockGetUser,
  mockFromSelect,
  mockRpc,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFromSelect: vi.fn(),
  mockRpc: vi.fn(),
}))

// Builder helpers for chained Supabase calls
function makeMemberQuery(result: any) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue(result),
      }),
    }),
  }
}

function makeHouseholdQuery(result: any) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue(result),
      }),
    }),
  }
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: mockGetUser,
    },
    from: mockFromSelect,
    rpc: mockRpc,
  },
}))

const mockUser = { id: 'user-1', email: 'test@example.com' }
const mockHousehold = { id: 'household-1', name: 'Our Home', invite_code: 'abc12345' }

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })
})

describe('useHouseholdStore', () => {
  describe('init()', () => {
    it('sets needsHousehold=true when user has no membership', async () => {
      mockFromSelect.mockReturnValueOnce(makeMemberQuery({ data: null, error: null }))

      const store = useHouseholdStore()
      await store.init()

      expect(store.needsHousehold).toBe(true)
      expect(store.ready).toBe(false)
      expect(store.householdId).toBeNull()
    })

    it('loads household and sets ready=true when membership exists', async () => {
      mockFromSelect
        .mockReturnValueOnce(makeMemberQuery({ data: { household_id: 'household-1' }, error: null }))
        .mockReturnValueOnce(makeHouseholdQuery({ data: mockHousehold, error: null }))

      const store = useHouseholdStore()
      await store.init()

      expect(store.ready).toBe(true)
      expect(store.needsHousehold).toBe(false)
      expect(store.householdId).toBe('household-1')
      expect(store.householdName).toBe('Our Home')
    })

    it('sets error string when getUser fails', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'Not authenticated' } })

      const store = useHouseholdStore()
      await store.init()

      expect(store.error).toBe('Not authenticated')
      expect(store.ready).toBe(false)
    })

    it('sets error string when household_members query fails', async () => {
      mockFromSelect.mockReturnValueOnce(makeMemberQuery({ data: null, error: { message: 'DB error' } }))

      const store = useHouseholdStore()
      await store.init()

      expect(store.error).toBe('DB error')
      expect(store.ready).toBe(false)
    })

    it('sets loading=false after completion', async () => {
      mockFromSelect.mockReturnValueOnce(makeMemberQuery({ data: null, error: null }))

      const store = useHouseholdStore()
      await store.init()

      expect(store.loading).toBe(false)
    })
  })

  describe('createHousehold(name)', () => {
    it('calls create_household RPC and sets householdId, householdName, inviteCode, ready', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { id: 'household-1', name: 'Our Home', invite_code: 'abc12345' },
        error: null,
      })

      const store = useHouseholdStore()
      await store.createHousehold('Our Home')

      expect(mockRpc).toHaveBeenCalledWith('create_household', { p_name: 'Our Home' })
      expect(store.householdId).toBe('household-1')
      expect(store.householdName).toBe('Our Home')
      expect(store.inviteCode).toBe('abc12345')
      expect(store.ready).toBe(true)
      expect(store.needsHousehold).toBe(false)
    })

    it('sets error string on RPC failure', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Failed to create' },
      })

      const store = useHouseholdStore()
      await store.createHousehold('Our Home')

      expect(store.error).toBe('Failed to create')
      expect(store.ready).toBe(false)
      expect(store.inviteCode).toBeNull()
    })

    it('sets loading=false after completion', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { id: 'household-1', name: 'Our Home', invite_code: 'abc12345' },
        error: null,
      })

      const store = useHouseholdStore()
      await store.createHousehold('Our Home')

      expect(store.loading).toBe(false)
    })
  })

  describe('joinHousehold(code)', () => {
    it('calls join_household RPC and sets householdId, householdName, ready', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { id: 'household-1', name: 'Our Home' },
        error: null,
      })

      const store = useHouseholdStore()
      await store.joinHousehold('abc12345')

      expect(mockRpc).toHaveBeenCalledWith('join_household', { p_invite_code: 'abc12345' })
      expect(store.householdId).toBe('household-1')
      expect(store.householdName).toBe('Our Home')
      expect(store.ready).toBe(true)
      expect(store.needsHousehold).toBe(false)
    })

    it('sets error string on invalid invite code', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Invalid invite code' },
      })

      const store = useHouseholdStore()
      await store.joinHousehold('badcode')

      expect(store.error).toBe('Invalid invite code')
      expect(store.ready).toBe(false)
      expect(store.householdId).toBeNull()
    })

    it('sets error string when already a member', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Already a member of this household' },
      })

      const store = useHouseholdStore()
      await store.joinHousehold('abc12345')

      expect(store.error).toBe('Already a member of this household')
      expect(store.ready).toBe(false)
    })

    it('sets loading=false after completion', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { id: 'household-1', name: 'Our Home' },
        error: null,
      })

      const store = useHouseholdStore()
      await store.joinHousehold('abc12345')

      expect(store.loading).toBe(false)
    })
  })
})
