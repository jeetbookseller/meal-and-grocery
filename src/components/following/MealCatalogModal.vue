<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        @click.self="$emit('close')"
      >
        <div class="modal-panel max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <div class="p-6 flex flex-col gap-4">
            <h2 class="text-lg font-semibold">
              {{ isEditing ? 'Edit Recipe' : 'Add Recipe' }}
            </h2>

            <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">

              <!-- Emoji + Name row -->
              <div class="flex gap-2">
                <div class="w-20 shrink-0">
                  <label class="block text-xs text-text-secondary mb-1">Emoji</label>
                  <input
                    v-model="form.emoji"
                    type="text"
                    class="input text-center text-xl"
                    maxlength="4"
                  />
                </div>
                <div class="flex-1">
                  <label class="block text-xs text-text-secondary mb-1">Name <span class="text-danger">*</span></label>
                  <input
                    v-model="form.name"
                    type="text"
                    class="input"
                    placeholder="e.g. Chickpea Tikka Masala"
                    required
                  />
                </div>
              </div>

              <!-- Effort + Protein row -->
              <div class="flex gap-2">
                <div class="flex-1">
                  <label class="block text-xs text-text-secondary mb-1">Effort <span class="text-danger">*</span></label>
                  <select v-model="form.category" class="input" required>
                    <option value="low">Low Energy (15-20 min)</option>
                    <option value="medium">Medium (30 min)</option>
                    <option value="high">High Energy (45+ min)</option>
                    <option value="onepot">One Pot/Pan</option>
                  </select>
                </div>
                <div class="flex-1">
                  <label class="block text-xs text-text-secondary mb-1">Protein</label>
                  <select v-model="form.protein" class="input">
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <!-- Cook time -->
              <div>
                <label class="block text-xs text-text-secondary mb-1">Cook Time <span class="text-danger">*</span></label>
                <input
                  v-model="form.cook_time"
                  type="text"
                  class="input"
                  placeholder="e.g. 30 min"
                  required
                />
              </div>

              <!-- Description -->
              <div>
                <label class="block text-xs text-text-secondary mb-1">Description</label>
                <textarea
                  v-model="form.description"
                  class="input resize-none"
                  rows="2"
                  placeholder="Short description of the dish..."
                />
              </div>

              <!-- Key Ingredients -->
              <div>
                <label class="block text-xs text-text-secondary mb-1">
                  Key Ingredients <span class="text-danger">*</span>
                  <span class="text-text-muted">(comma-separated, min 2)</span>
                </label>
                <textarea
                  v-model="form.ingredientsRaw"
                  class="input resize-none"
                  rows="2"
                  placeholder="chickpeas, tomatoes, garlic, coconut milk"
                  required
                />
                <p v-if="ingredientError" class="text-xs text-danger mt-1">{{ ingredientError }}</p>
              </div>

              <!-- Tags -->
              <div>
                <label class="block text-xs text-text-secondary mb-2">Tags</label>
                <div class="flex flex-wrap gap-2">
                  <label
                    v-for="tag in ALL_TAGS"
                    :key="tag"
                    class="flex items-center gap-1.5 text-sm cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      :value="tag"
                      v-model="form.tags"
                      class="rounded"
                    />
                    {{ tag }}
                  </label>
                </div>
              </div>

              <!-- Error -->
              <p v-if="submitError" class="text-sm text-danger">{{ submitError }}</p>

              <!-- Actions -->
              <div class="flex gap-2 pt-2">
                <button type="button" class="btn-ghost flex-1" @click="$emit('close')">
                  Cancel
                </button>
                <button
                  type="submit"
                  class="btn-primary flex-1"
                  :disabled="saving"
                >
                  {{ saving ? 'Saving...' : (isEditing ? 'Save Changes' : 'Add Recipe') }}
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { MealCatalogItem } from '@/types/database'

const ALL_TAGS = ['breakfast', 'lunch', 'dinner', 'snack', 'weekend', 'meal-prep', 'no-cook']

const props = defineProps<{
  meal?: MealCatalogItem | null
}>()

const emit = defineEmits<{
  close: []
  save: [payload: {
    name: string
    category: MealCatalogItem['category']
    protein: MealCatalogItem['protein']
    cook_time: string
    emoji: string
    description: string | null
    key_ingredients: string[]
    tags: string[]
  }]
}>()

const isEditing = computed(() => !!props.meal)

const form = ref({
  emoji: '🥗',
  name: '',
  category: 'medium' as MealCatalogItem['category'],
  protein: 'medium' as MealCatalogItem['protein'],
  cook_time: '',
  description: '',
  ingredientsRaw: '',
  tags: ['dinner'] as string[],
})

const saving = ref(false)
const submitError = ref<string | null>(null)

watch(
  () => props.meal,
  (meal) => {
    if (meal) {
      form.value = {
        emoji: meal.emoji,
        name: meal.name,
        category: meal.category,
        protein: meal.protein,
        cook_time: meal.cook_time,
        description: meal.description ?? '',
        ingredientsRaw: meal.key_ingredients.join(', '),
        tags: [...meal.tags],
      }
    }
  },
  { immediate: true }
)

const parsedIngredients = computed(() =>
  form.value.ingredientsRaw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
)

const ingredientError = computed(() => {
  if (form.value.ingredientsRaw && parsedIngredients.value.length < 2)
    return 'Please enter at least 2 ingredients.'
  return null
})

async function handleSubmit() {
  submitError.value = null
  if (ingredientError.value) return

  saving.value = true
  try {
    emit('save', {
      name: form.value.name.trim(),
      category: form.value.category,
      protein: form.value.protein,
      cook_time: form.value.cook_time.trim(),
      emoji: form.value.emoji || '🥗',
      description: form.value.description.trim() || null,
      key_ingredients: parsedIngredients.value,
      tags: form.value.tags.length ? form.value.tags : ['dinner'],
    })
  } catch (e) {
    submitError.value = e instanceof Error ? e.message : 'Failed to save recipe'
    saving.value = false
  }
}
</script>
