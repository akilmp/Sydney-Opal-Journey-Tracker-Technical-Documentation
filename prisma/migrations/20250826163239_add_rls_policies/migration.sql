-- Enable Row Level Security and policies for user-owned tables

-- Stub auth.uid() for local dev
CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT '00000000-0000-0000-0000-000000000000'::uuid;
$$;

-- Users table
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_isolation ON "User"
  USING ("id" = auth.uid()::text)
  WITH CHECK ("id" = auth.uid()::text);

-- Profiles table
ALTER TABLE "Profile" ENABLE ROW LEVEL SECURITY;
CREATE POLICY profile_isolation ON "Profile"
  USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);

-- Opal uploads
ALTER TABLE "OpalUpload" ENABLE ROW LEVEL SECURITY;
CREATE POLICY opal_upload_isolation ON "OpalUpload"
  USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);

-- Trips
ALTER TABLE "Trip" ENABLE ROW LEVEL SECURITY;
CREATE POLICY trip_isolation ON "Trip"
  USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);

-- Commute windows
ALTER TABLE "CommuteWindow" ENABLE ROW LEVEL SECURITY;
CREATE POLICY commute_window_isolation ON "CommuteWindow"
  USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);

-- Favourites
ALTER TABLE "Favourite" ENABLE ROW LEVEL SECURITY;
CREATE POLICY favourite_isolation ON "Favourite"
  USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);

-- Settings
ALTER TABLE "Setting" ENABLE ROW LEVEL SECURITY;
CREATE POLICY setting_isolation ON "Setting"
  USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);
