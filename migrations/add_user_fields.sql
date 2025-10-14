-- Migration: Add additional user fields
-- Run this in Supabase SQL Editor

-- Add age column to users table
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS age INTEGER;

-- Add guardian information for students
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS guardian_name TEXT;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS guardian_contact TEXT;

-- Add specialization for instructors
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS specialization TEXT;

-- Add profile picture URL (optional)
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

-- Add bio/description field (optional)
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS bio TEXT;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Add comments for documentation
COMMENT ON COLUMN users.age IS 'User age in years';
COMMENT ON COLUMN users.guardian_name IS 'Guardian name for students under 18';
COMMENT ON COLUMN users.guardian_contact IS 'Guardian contact information';
COMMENT ON COLUMN users.specialization IS 'Instructor specialization/expertise';
COMMENT ON COLUMN users.profile_picture_url IS 'URL to user profile picture';
COMMENT ON COLUMN users.bio IS 'User biography/description';

-- Update existing users with default values (optional)
-- UPDATE users SET age = 25 WHERE age IS NULL AND role = 'student';
-- UPDATE users SET specialization = 'General' WHERE specialization IS NULL AND role = 'instructor';