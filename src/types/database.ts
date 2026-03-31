export type MealType = string

export interface Household {
  id: string
  name: string
  invite_code: string
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
  is_checked: boolean
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
  store: string | null
  is_checked: boolean
  sort_order: number
  created_by: string
  created_at: string
}

export interface GroceryItemMeal {
  grocery_item_id: string
  meal_id: string
}

export interface PantryItem {
  id: string
  household_id: string
  name: string
  quantity: string | null
  is_checked: boolean
  sort_order: number
  created_by: string
  created_at: string
}

export interface PantryItemMeal {
  pantry_item_id: string
  meal_id: string
}

export interface MealCatalogItem {
  id: string
  household_id: string | null
  name: string
  category: 'low' | 'medium' | 'high' | 'onepot'
  protein: 'high' | 'medium' | 'low'
  cook_time: string
  emoji: string
  description: string | null
  key_ingredients: string[]
  tags: string[]
  created_by: string | null
  created_at: string
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
      pantry_items: {
        Row: PantryItem
        Insert: Omit<PantryItem, 'id' | 'created_at'>
        Update: Partial<Omit<PantryItem, 'id' | 'created_at'>>
      }
      pantry_item_meals: {
        Row: PantryItemMeal
        Insert: PantryItemMeal
        Update: Partial<PantryItemMeal>
      }
      meal_catalog: {
        Row: MealCatalogItem
        Insert: Omit<MealCatalogItem, 'id' | 'created_at'>
        Update: Partial<Omit<MealCatalogItem, 'id' | 'created_at'>>
      }
    }
    Functions: {
      seed_default_sections: {
        Args: { p_household_id: string }
        Returns: void
      }
      create_household: {
        Args: { p_name: string }
        Returns: { id: string; name: string; invite_code: string }
      }
      join_household: {
        Args: { p_invite_code: string }
        Returns: { id: string; name: string }
      }
      regenerate_invite_code: {
        Args: { p_household_id: string }
        Returns: string
      }
    }
  }
}
