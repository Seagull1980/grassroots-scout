-- Migration: add share_name column to child_player_availability
-- Adds a boolean column to control whether a child's real name may be shared publicly

ALTER TABLE child_player_availability
ADD COLUMN share_name BOOLEAN NOT NULL DEFAULT 0;
