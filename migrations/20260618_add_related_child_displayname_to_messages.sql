-- Migration: add relatedChildDisplayName to messages table

ALTER TABLE messages ADD COLUMN relatedChildDisplayName VARCHAR;