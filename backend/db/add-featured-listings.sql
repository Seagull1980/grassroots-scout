-- Add featured listings columns to existing tables
ALTER TABLE team_vacancies ADD COLUMN isFeatured BOOLEAN DEFAULT 0;
ALTER TABLE team_vacancies ADD COLUMN featuredUntil DATETIME NULL;
ALTER TABLE team_vacancies ADD COLUMN featuredPrice DECIMAL(10,2) NULL;

ALTER TABLE player_availability ADD COLUMN isFeatured BOOLEAN DEFAULT 0;
ALTER TABLE player_availability ADD COLUMN featuredUntil DATETIME NULL;
ALTER TABLE player_availability ADD COLUMN featuredPrice DECIMAL(10,2) NULL;

-- Create payments table for transaction tracking
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  paymentType VARCHAR(50) NOT NULL, -- 'featured_listing', 'urgent_tag', 'verification', etc.
  itemId INTEGER NOT NULL, -- vacancy_id or availability_id
  itemType VARCHAR(50) NOT NULL, -- 'vacancy' or 'availability'
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'GBP',
  paymentStatus VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
  paymentMethod VARCHAR(50), -- 'stripe', 'paypal', etc.
  stripePaymentIntentId VARCHAR(255),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  completedAt DATETIME NULL,
  FOREIGN KEY (userId) REFERENCES users (id)
);

-- Create pricing table for flexible pricing
CREATE TABLE IF NOT EXISTS pricing (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  featureType VARCHAR(50) NOT NULL UNIQUE, -- 'featured_listing', 'urgent_tag', 'verification'
  price DECIMAL(10,2) NOT NULL,
  duration INTEGER NOT NULL, -- duration in days
  description TEXT,
  isActive BOOLEAN DEFAULT 1,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default pricing
INSERT OR REPLACE INTO pricing (featureType, price, duration, description) VALUES
('featured_listing', 4.99, 30, 'Featured listing appears at the top of search results for 30 days'),
('urgent_tag', 2.99, 14, 'Urgent tag highlights your listing for 14 days'),
('priority_support', 9.99, 30, 'Priority customer support for 30 days'),
('verification_badge', 19.99, 365, 'Verified badge for your profile for 1 year');
