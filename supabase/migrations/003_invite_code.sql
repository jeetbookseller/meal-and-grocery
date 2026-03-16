-- Add invite_code column to households (8-char prefix of a UUID, unique)
ALTER TABLE public.households
  ADD COLUMN IF NOT EXISTS invite_code text UNIQUE NOT NULL
  DEFAULT substring(gen_random_uuid()::text, 1, 8);

-- Update create_household to return invite_code in addition to id and name
CREATE OR REPLACE FUNCTION create_household(p_name text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id        uuid;
  v_household_id   uuid;
  v_household_name text;
  v_invite_code    text;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.households (name)
  VALUES (p_name)
  RETURNING id, name, invite_code INTO v_household_id, v_household_name, v_invite_code;

  INSERT INTO public.household_members (household_id, user_id)
  VALUES (v_household_id, v_user_id);

  PERFORM public.seed_default_sections(v_household_id);

  RETURN json_build_object('id', v_household_id, 'name', v_household_name, 'invite_code', v_invite_code);
END;
$$;

-- join_household: add the calling user to a household identified by invite code.
-- Raises an exception for invalid codes or if user is already a member.
CREATE OR REPLACE FUNCTION join_household(p_invite_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id        uuid;
  v_household_id   uuid;
  v_household_name text;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id, name INTO v_household_id, v_household_name
  FROM public.households
  WHERE invite_code = p_invite_code;

  IF v_household_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_id = v_household_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Already a member of this household';
  END IF;

  INSERT INTO public.household_members (household_id, user_id)
  VALUES (v_household_id, v_user_id);

  RETURN json_build_object('id', v_household_id, 'name', v_household_name);
END;
$$;
