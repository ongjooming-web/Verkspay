-- Create trigger to auto-insert profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, created_at, updated_at)
  VALUES (new.id, new.email, now(), now())
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists (to avoid duplicates)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Manually insert profile for existing user if it doesn't exist
INSERT INTO public.profiles (id, email, created_at, updated_at)
VALUES ('ded9709d-5c5b-4810-bc4f-a2cebe2d1a84', 'ongjooming@gmail.com', now(), now())
ON CONFLICT (id) DO NOTHING;
