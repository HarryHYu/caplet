-- Add summary column to financial_states table if it doesn't exist
ALTER TABLE financial_states 
ADD COLUMN IF NOT EXISTS summary TEXT DEFAULT '';

