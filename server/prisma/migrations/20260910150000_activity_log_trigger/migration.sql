CREATE OR REPLACE FUNCTION prevent_activity_log_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Activity log records are immutable and cannot be updated or deleted.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_activity_log_immutability_update
BEFORE UPDATE ON activity_log
FOR EACH ROW
EXECUTE FUNCTION prevent_activity_log_mutation();

CREATE TRIGGER enforce_activity_log_immutability_delete
BEFORE DELETE ON activity_log
FOR EACH ROW
EXECUTE FUNCTION prevent_activity_log_mutation();
