-- Session 13: Add username column for public profiles + public read policies

-- Add username column to users
ALTER TABLE users ADD COLUMN username TEXT UNIQUE;
CREATE INDEX idx_users_username ON users(username);

-- Allow public read of user profiles (needed for /u/[username] pages)
CREATE POLICY "Public can view user profiles"
  ON users FOR SELECT
  USING (TRUE);

-- Drop the old select policy that restricted to own row only
DROP POLICY IF EXISTS "Users can view own profile" ON users;

-- Allow public read of sightings (needed for public trip reports and profiles)
CREATE POLICY "Public can view all sightings"
  ON sightings FOR SELECT
  USING (TRUE);

-- Drop the old select policy that restricted to own sightings
DROP POLICY IF EXISTS "Users can view own sightings" ON sightings;
