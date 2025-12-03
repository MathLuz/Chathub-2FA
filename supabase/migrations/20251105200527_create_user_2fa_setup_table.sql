/*
  # Create user 2FA setup table

  1. New Tables
    - `user_2fa_setup`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `secret` (text) - TOTP secret for 2FA
      - `is_verified` (boolean) - whether 2FA has been verified
      - `backup_codes` (text array) - backup codes for account recovery
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Security
    - Enable RLS on `user_2fa_setup` table
    - Add policy for users to read/manage their own 2FA settings
*/

CREATE TABLE IF NOT EXISTS user_2fa_setup (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  secret text NOT NULL,
  is_verified boolean DEFAULT false,
  backup_codes text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE user_2fa_setup ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own 2FA setup"
  ON user_2fa_setup FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own 2FA setup"
  ON user_2fa_setup FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own 2FA setup"
  ON user_2fa_setup FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own 2FA setup"
  ON user_2fa_setup FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
