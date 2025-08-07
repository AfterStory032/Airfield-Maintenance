-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  avatar_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Set up storage policies for avatars
CREATE OR REPLACE FUNCTION setup_avatar_storage_policies()
RETURNS VOID AS $$
BEGIN
  -- Enable RLS on the storage.objects table
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

  -- Policy allowing users to view any avatar
  DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
  CREATE POLICY "Anyone can view avatars" 
    ON storage.objects FOR SELECT 
    USING (bucket_id = 'avatars');

  -- Policy allowing authenticated users to upload their own avatar
  DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
  CREATE POLICY "Users can upload their own avatar" 
    ON storage.objects FOR INSERT 
    TO authenticated 
    WITH CHECK (
      bucket_id = 'avatars'
    );

  -- Policy allowing users to update their own avatar
  DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
  CREATE POLICY "Users can update their own avatar" 
    ON storage.objects FOR UPDATE 
    TO authenticated 
    USING (
      bucket_id = 'avatars'
    );

  -- Policy allowing users to delete their own avatar
  DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
  CREATE POLICY "Users can delete their own avatar" 
    ON storage.objects FOR DELETE 
    TO authenticated 
    USING (
      bucket_id = 'avatars'
    );

  -- Set up RLS on profiles table
  ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

  -- Policy allowing users to view any profile
  DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
  CREATE POLICY "Anyone can view profiles" 
    ON public.profiles FOR SELECT 
    USING (true);

  -- Policy allowing authenticated users to update their own profile
  DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
  CREATE POLICY "Users can update their own profile" 
    ON public.profiles FOR UPDATE 
    TO authenticated 
    USING (auth.uid() = id);

  -- Policy allowing authenticated users to insert their own profile
  DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
  CREATE POLICY "Users can insert their own profile" 
    ON public.profiles FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = id);
END;
$$ LANGUAGE plpgsql;

-- Execute the function to set up policies
SELECT setup_avatar_storage_policies();