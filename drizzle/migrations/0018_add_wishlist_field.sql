-- Migration: Add wishlist field to clients table (WS-015)
-- Date: 2025-12-31

ALTER TABLE clients ADD COLUMN wishlist TEXT NULL AFTER vip_portal_last_login;
