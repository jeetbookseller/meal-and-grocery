import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

export const useHouseholdStore = defineStore('household', () => {
  const householdId = ref<string | null>(null)
  const householdName = ref<string | null>(null)
  const inviteCode = ref<string | null>(null)
  const ready = ref(false)
  const needsHousehold = ref(false)
  const justCreated = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function init() {
    loading.value = true
    error.value = null

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw userError ?? new Error('Not authenticated')

      const { data: membership, error: memberError } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (memberError) throw memberError

      if (membership) {
        const { data: household, error: householdError } = await supabase
          .from('households')
          .select('id, name, invite_code')
          .eq('id', membership.household_id)
          .single()

        if (householdError) throw householdError

        householdId.value = household.id
        householdName.value = household.name
        inviteCode.value = household.invite_code
        ready.value = true
      } else {
        needsHousehold.value = true
      }
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to load household'
    } finally {
      loading.value = false
    }
  }

  async function createHousehold(name: string) {
    loading.value = true
    error.value = null

    try {
      const { data, error: rpcError } = await supabase.rpc('create_household', {
        p_name: name,
      })

      if (rpcError) throw rpcError

      householdId.value = data.id
      householdName.value = data.name
      inviteCode.value = data.invite_code
      needsHousehold.value = false
      justCreated.value = true
      ready.value = true
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to create household'
    } finally {
      loading.value = false
    }
  }

  async function joinHousehold(code: string) {
    loading.value = true
    error.value = null

    try {
      const { data, error: rpcError } = await supabase.rpc('join_household', {
        p_invite_code: code,
      })

      if (rpcError) throw rpcError

      householdId.value = data.id
      householdName.value = data.name
      needsHousehold.value = false
      ready.value = true
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to join household'
    } finally {
      loading.value = false
    }
  }

  async function regenerateInviteCode() {
    if (!householdId.value) return

    loading.value = true
    error.value = null

    try {
      const { data, error: rpcError } = await supabase.rpc('regenerate_invite_code', {
        p_household_id: householdId.value,
      })

      if (rpcError) throw rpcError

      inviteCode.value = data
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to regenerate invite code'
    } finally {
      loading.value = false
    }
  }

  return {
    householdId,
    householdName,
    inviteCode,
    ready,
    needsHousehold,
    justCreated,
    loading,
    error,
    init,
    createHousehold,
    joinHousehold,
    regenerateInviteCode,
  }
})
