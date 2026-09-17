-- Apply to every author write, including imports and accepted reader submissions.
CREATE OR REPLACE FUNCTION uppercase_author_name() RETURNS trigger AS $$
BEGIN
  NEW.name := upper(btrim(NEW.name));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER authors_uppercase_name
BEFORE INSERT OR UPDATE OF name ON authors
FOR EACH ROW EXECUTE FUNCTION uppercase_author_name();

UPDATE authors SET name = upper(btrim(name)) WHERE name IS DISTINCT FROM upper(btrim(name));
