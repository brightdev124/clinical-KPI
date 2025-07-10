-- Add transaction functions for Supabase

-- Begin transaction function
CREATE OR REPLACE FUNCTION begin_transaction()
RETURNS void AS $$
BEGIN
  -- Start a transaction
  BEGIN;
END;
$$ LANGUAGE plpgsql;

-- Commit transaction function
CREATE OR REPLACE FUNCTION commit_transaction()
RETURNS void AS $$
BEGIN
  -- Commit the transaction
  COMMIT;
END;
$$ LANGUAGE plpgsql;

-- Rollback transaction function
CREATE OR REPLACE FUNCTION rollback_transaction()
RETURNS void AS $$
BEGIN
  -- Rollback the transaction
  ROLLBACK;
END;
$$ LANGUAGE plpgsql;