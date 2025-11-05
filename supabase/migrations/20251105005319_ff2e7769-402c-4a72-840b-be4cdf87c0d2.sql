-- Drop existing trigger and function to recreate with better error handling
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved function with error handling and logging
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_name TEXT;
  user_account_type TEXT;
BEGIN
  -- Extract metadata with fallbacks
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'agencyName',
    NEW.email
  );
  
  user_account_type := COALESCE(
    NEW.raw_user_meta_data->>'accountType',
    'creator'
  );

  -- Insert profile with error handling
  BEGIN
    INSERT INTO public.profiles (
      id,
      name,
      account_type,
      plan,
      is_active,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      user_name,
      user_account_type,
      'free',
      true,
      NOW(),
      NOW()
    );
    
    -- Log success in activity_log
    INSERT INTO public.activity_log (
      entity,
      action,
      entity_id,
      actor_user_id,
      metadata,
      created_at
    )
    VALUES (
      'user',
      'profile_created',
      NEW.id,
      NEW.id,
      jsonb_build_object(
        'email', NEW.email,
        'account_type', user_account_type
      ),
      NOW()
    );
    
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't block user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    
    -- Try to log error in activity_log
    BEGIN
      INSERT INTO public.activity_log (
        entity,
        action,
        entity_id,
        metadata,
        created_at
      )
      VALUES (
        'user',
        'profile_creation_failed',
        NEW.id,
        jsonb_build_object(
          'email', NEW.email,
          'error', SQLERRM
        ),
        NOW()
      );
    EXCEPTION WHEN OTHERS THEN
      -- If even logging fails, just raise a warning
      RAISE WARNING 'Failed to log profile creation error: %', SQLERRM;
    END;
    
    -- Re-raise the exception to block user creation if profile creation fails
    RAISE;
  END;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add comment for documentation
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates a profile for new users and logs the action. Prevents orphaned accounts by failing user creation if profile creation fails.';