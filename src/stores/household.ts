import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

export const useHouseholdStore = defineStore('household', () => {
  const householdId = ref<string | null>(null)
  const householdName = ref<string | null>(null)
  const ready = ref(false)
  const needsHousehold = ref(false)
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
          .select('id, name')
          .eq('id', membership.household_id)
          .single()

        if (householdError) throw householdError

        householdId.value = household.id
        householdName.value = household.name
        ready.value = true
      } else {
        needsHousehold.value = true
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load household'
    } finally {
      loading.value = false
    }
  }

  async function createHousehold(name: string) {
    loading.value = true
    error.value = null

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw userError ?? new Error('Not authenticated')

      const { data: household, error: insertError } = await supabase
        .from('households')
        .insert({ name })
        .select('id, name')
        .single()

      if (insertError) throw insertError

      const { error: memberError } = await supabase
        .from('household_members')
        .insert({ household_id: household.id, user_id: user.id })

      if (memberError) throw memberError

      const { error: seedError } = await supabase.rpc('seed_default_sections', {
        p_household_id: household.id,
      })

      if (seedError) throw seedError

      householdId.value = household.id
      householdName.value = household.name
      needsHousehold.value = false
      ready.value = true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to create household'
    } finally {
      loading.value = false
    }
  }

  return { householdId, householdName, ready, needsHousehold, loading, error, init, createHousehold }
})
