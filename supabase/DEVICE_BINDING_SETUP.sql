-- ========================================================
-- PERMANENT SINGLE-DEVICE BINDING SETUP FOR SUPABASE
-- Run this script in Supabase Dashboard -> SQL Editor
-- Project URL: https://cvrcipyodrlwaqhwrqoi.supabase.co
-- ========================================================

-- 1. Add permanent device binding columns to public.users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS bound_device_id text,
ADD COLUMN IF NOT EXISTS bound_device_name text,
ADD COLUMN IF NOT EXISTS bound_device_at timestamptz;

-- 2. Index for fast device verification lookups
CREATE INDEX IF NOT EXISTS users_bound_device_idx ON public.users(bound_device_id);

-- 3. Secure Server-Side Authentication & Device Validation RPC
-- - The first device used for successful login automatically becomes the registered device.
-- - Unlimited logins and logouts allowed on that same registered device.
-- - All other devices are strictly blocked from logging in.
-- - Device registration is preserved permanently until an Administrator resets it.
CREATE OR REPLACE FUNCTION public.authenticate_and_validate_device(
  p_username text,
  p_password text,
  p_device_id text,
  p_device_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user record;
BEGIN
  -- Look up user by username or email with exact password & active status
  SELECT * INTO v_user
  FROM public.users
  WHERE (LOWER(username) = LOWER(TRIM(p_username)) OR LOWER(email) = LOWER(TRIM(p_username)))
    AND password = p_password
    AND is_active = true;

  IF v_user IS NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'INVALID_CREDENTIALS',
      'message', 'Invalid username or password. Please check your credentials.'
    );
  END IF;

  -- 1. If NO device is bound yet: Bind this device permanently on first successful login!
  IF v_user.bound_device_id IS NULL OR v_user.bound_device_id = '' THEN
    UPDATE public.users
    SET bound_device_id = p_device_id,
        bound_device_name = p_device_name,
        bound_device_at = now(),
        updated_at = now()
    WHERE id = v_user.id;

    -- Return updated record
    SELECT * INTO v_user FROM public.users WHERE id = v_user.id;

    RETURN jsonb_build_object(
      'success', true,
      'is_first_binding', true,
      'message', 'Device successfully bound to this account.',
      'user', row_to_json(v_user)
    );

  -- 2. If already bound: Check if the login is from the registered device
  ELSIF v_user.bound_device_id = p_device_id THEN
    -- Update device name or last active timestamp
    UPDATE public.users
    SET bound_device_name = COALESCE(p_device_name, bound_device_name),
        updated_at = now()
    WHERE id = v_user.id;

    RETURN jsonb_build_object(
      'success', true,
      'is_first_binding', false,
      'user', row_to_json(v_user)
    );

  -- 3. Device mismatch: Block access completely!
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'DEVICE_BLOCKED',
      'message', format('This account is permanently bound to another device (%s). You cannot log in from this device. Please contact an Administrator to reset your device binding.', COALESCE(v_user.bound_device_name, 'Registered Device')),
      'bound_device_name', v_user.bound_device_name,
      'bound_device_at', v_user.bound_device_at
    );
  END IF;
END;
$$;

-- 4. Admin-Only Device Reset RPC
-- Allows an Administrator to unbind a user's device, so they can register a new one
CREATE OR REPLACE FUNCTION public.reset_user_device_binding(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.users
  SET bound_device_id = NULL,
      bound_device_name = NULL,
      bound_device_at = NULL,
      updated_at = now()
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Device binding has been successfully reset. The user can now bind a new device on their next login.'
  );
END;
$$;

-- Grant execution to public / anon role
GRANT EXECUTE ON FUNCTION public.authenticate_and_validate_device(text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_user_device_binding(uuid) TO anon, authenticated;

-- 5. Seed or Update Default Super Admin Account
INSERT INTO public.users (username, email, password, full_name, role, ward_number, is_active)
VALUES
  ('superadmin', 'superadmin@election.com', 'superadmin123', 'Super Administrator', 'super_admin', '2', true)
ON CONFLICT (username) DO UPDATE SET
  password = EXCLUDED.password,
  full_name = EXCLUDED.full_name,
  role = 'super_admin';
