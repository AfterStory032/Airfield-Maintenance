-- Add shift column to users table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'shift'
    ) THEN
        ALTER TABLE users ADD COLUMN shift VARCHAR(10) DEFAULT 'Regular';
    END IF;
END
$$;

-- Update existing users with default shift values if needed
UPDATE users SET shift = 'Regular' WHERE shift IS NULL;

-- Create or update trigger to sync user data with auth.users metadata
CREATE OR REPLACE FUNCTION public.sync_user_shifts_to_auth()
RETURNS TRIGGER AS $$
BEGIN
  -- Update auth.users metadata with shift info
  UPDATE auth.users
  SET raw_user_meta_data = 
      CASE 
          WHEN raw_user_meta_data IS NULL THEN 
              jsonb_build_object('shift', NEW.shift)
          ELSE 
              raw_user_meta_data || jsonb_build_object('shift', NEW.shift)
      END
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger if not exists
DROP TRIGGER IF EXISTS sync_user_shifts_trigger ON users;
CREATE TRIGGER sync_user_shifts_trigger
AFTER UPDATE ON users
FOR EACH ROW
WHEN (OLD.shift IS DISTINCT FROM NEW.shift)
EXECUTE FUNCTION sync_user_shifts_to_auth();

-- Update auth function to handle shifts
CREATE OR REPLACE FUNCTION app_de8b393e2913418682a1f3ac5249efa2_update_user_role(payload json)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  caller_id uuid;
  target_user_id uuid;
  target_role text;
  target_shift text;
  caller_role text;
  is_admin boolean;
  response json;
BEGIN
  -- Get the caller's ID from the JWT
  caller_id := auth.uid();
  
  -- Check if caller exists and is an admin
  SELECT role INTO caller_role FROM users WHERE id = caller_id;
  is_admin := caller_role = 'admin';
  
  -- If caller is not an admin, return error
  IF NOT is_admin THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Unauthorized: Only admins can update user roles'
    );
  END IF;
  
  -- Extract data from payload
  target_user_id := (payload->>'userId')::uuid;
  target_role := payload->>'role';
  target_shift := payload->>'shift';
  
  -- Validate role
  IF target_role NOT IN ('admin', 'shift_leader', 'engineer', 'technician', 'viewer') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid role. Valid roles are: admin, shift_leader, engineer, technician, viewer'
    );
  END IF;
  
  -- Validate shift if provided
  IF target_shift IS NOT NULL AND target_shift NOT IN ('A', 'B', 'C', 'D', 'Regular') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid shift. Valid shifts are: A, B, C, D, Regular'
    );
  END IF;
  
  BEGIN
    -- Update user's metadata
    UPDATE auth.users
    SET raw_user_meta_data = 
      CASE 
        WHEN raw_user_meta_data IS NULL THEN 
          json_build_object('role', target_role)::jsonb || 
          CASE WHEN target_shift IS NOT NULL THEN 
            json_build_object('shift', target_shift)::jsonb 
          ELSE 
            '{}'::jsonb 
          END
        ELSE 
          raw_user_meta_data || 
          json_build_object('role', target_role)::jsonb || 
          CASE WHEN target_shift IS NOT NULL THEN 
            json_build_object('shift', target_shift)::jsonb 
          ELSE 
            '{}'::jsonb 
          END
      END
    WHERE id = target_user_id;
    
    -- Update the users table record
    UPDATE users
    SET 
      role = target_role,
      shift = COALESCE(target_shift, shift),
      updated_at = now()
    WHERE id = target_user_id;
    
    response := json_build_object(
      'success', true,
      'message', 'User role and shift updated successfully'
    );
  EXCEPTION WHEN OTHERS THEN
    response := json_build_object(
      'success', false,
      'error', SQLERRM
    );
  END;
  
  RETURN response;
END;
$$;