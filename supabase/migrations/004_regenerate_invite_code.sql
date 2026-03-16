-- regenerate_invite_code: generates a fresh 8-char invite code for a household.
-- Caller must be a member of the household.
CREATE OR REPLACE FUNCTION regenerate_invite_code(p_household_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id  uuid;
  v_new_code text;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_id = p_household_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Not a member of this household';
  END IF;

  v_new_code := substring(gen_random_uuid()::text, 1, 8);

  UPDATE public.households
  SET invite_code = v_new_code
  WHERE id = p_household_id;

  RETURN v_new_code;
END;
$$;
