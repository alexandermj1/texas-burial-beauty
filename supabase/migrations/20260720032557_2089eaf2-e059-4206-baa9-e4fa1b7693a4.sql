-- Add 'staff' role to app_role enum. Staff users have limited admin access
-- (Submissions panel, Map, Email Marketing only).
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'staff';