-- Add registrationNumber and registrationDate to users
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='registrationnumber') THEN
        ALTER TABLE users ADD COLUMN registrationNumber INTEGER UNIQUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='registrationdate') THEN
        ALTER TABLE users ADD COLUMN registrationDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END$$;

-- Ensure existing user with email cgill1980@hotmail.com has registrationNumber = 1
UPDATE users SET registrationNumber = 1 WHERE lower(email) = 'cgill1980@hotmail.com' AND (registrationNumber IS NULL OR registrationNumber <> 1);

-- Fill any NULL registrationNumbers with sequential values
WITH seq AS (
  SELECT id, row_number() OVER (ORDER BY createdat, id) + (SELECT COALESCE(MAX(registrationnumber),0) FROM users) as rn
  FROM users WHERE registrationnumber IS NULL
)
UPDATE users u SET registrationnumber = s.rn
FROM seq s WHERE u.id = s.id;
