-- 003_meals_free_form_meal_type.sql
-- Drop the restrictive CHECK constraint on meal_type to allow free-form values
ALTER TABLE meals DROP CONSTRAINT IF EXISTS meals_meal_type_check;
