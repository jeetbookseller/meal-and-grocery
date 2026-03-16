-- create_household: atomically creates a household, adds the calling user as a member,
-- and seeds the default grocery sections. Runs as SECURITY DEFINER so the households
-- INSERT bypasses the RLS SELECT-policy ordering issue (the SELECT policy requires
-- household membership which doesn't exist yet at the time of INSERT...RETURNING).

CREATE OR REPLACE FUNCTION create_household(p_name text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id      uuid;
  v_household_id uuid;
  v_household_name text;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.households (name)
  VALUES (p_name)
  RETURNING id, name INTO v_household_id, v_household_name;

  INSERT INTO public.household_members (household_id, user_id)
  VALUES (v_household_id, v_user_id);

  PERFORM public.seed_default_sections(v_household_id);

  RETURN json_build_object('id', v_household_id, 'name', v_household_name);
END;
$$;
