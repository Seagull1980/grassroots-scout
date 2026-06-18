-- Migration: add bio column to children table

ALTER TABLE children ADD COLUMN bio TEXT;