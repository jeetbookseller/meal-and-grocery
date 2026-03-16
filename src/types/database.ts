export type MealType = 'breakfast' | 'lunch' | 'dinner'

export interface Household {
  id: string
  name: string
  created_at: string
}

export interface HouseholdMember {
  household_id: string
  user_id: string
}

export interface Meal {
  id: string
  household_id: string
  date: string
  meal_type: MealType | null
  title: string
  notes: string | null
  sort_order: number
  created_by: string
  created_at: string
  updated_at: string
}

export interface GrocerySection {
  id: string
  household_id: string
  name: string
  sort_order: number
  is_default: boolean
}

export interface GroceryItem {
  id: string
  household_id: string
  section_id: string
  name: string
  quantity: string | null
  is_checked: boolean
  sort_order: number
  created_by: string
  created_at: string
}

export interface GroceryItemMeal {
  grocery_item_id: string
  meal_id: string
}

export interface Database {
  public: {
    Tables: {
      households: {
        Row: Household
        Insert: Omit<Household, 'id' | 'created_at'>
        Update: Partial<Omit<Household, 'id'>>
      }
      household_members: {
        Row: HouseholdMember
        Insert: HouseholdMember
        Update: Partial<HouseholdMember>
      }
      meals: {
        Row: Meal
        Insert: Omit<Meal, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Meal, 'id' | 'created_at' | 'updated_at'>>
      }
      grocery_sections: {
        Row: GrocerySection
        Insert: Omit<GrocerySection, 'id'>
        Update: Partial<Omit<GrocerySection, 'id'>>
      }
      grocery_items: {
        Row: GroceryItem
        Insert: Omit<GroceryItem, 'id' | 'created_at'>
        Update: Partial<Omit<GroceryItem, 'id' | 'created_at'>>
      }
      grocery_item_meals: {
        Row: GroceryItemMeal
        Insert: GroceryItemMeal
        Update: Partial<GroceryItemMeal>
      }
    }
    Functions: {
      seed_default_sections: {
        Args: { p_household_id: string }
        Returns: void
      }
    }
  }
}
