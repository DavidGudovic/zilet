-- Author names are stored as names are written; pages set them in capitals with CSS. Matching
-- stays case-blind through zilet_author_key, and a name typed all in capitals or all in small
-- letters (SAVKA, savka) is stored as "Savka", for every write, including imports.
DROP TRIGGER IF EXISTS authors_uppercase_name ON authors;
DROP FUNCTION IF EXISTS uppercase_author_name();

CREATE OR REPLACE FUNCTION natural_author_name() RETURNS trigger AS $$
DECLARE
  clean text := btrim(regexp_replace(NEW.name, '[[:space:]]+', ' ', 'g'));
BEGIN
  NEW.name := CASE WHEN clean IN (upper(clean), lower(clean)) THEN initcap(clean) ELSE clean END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER authors_natural_name
BEFORE INSERT OR UPDATE OF name ON authors
FOR EACH ROW EXECUTE FUNCTION natural_author_name();

-- A collective byline, not a person's name.
UPDATE authors SET name = 'Internet izvori' WHERE name = 'INTERNET IZVORI';
UPDATE authors SET name = initcap(name) WHERE name = upper(name) AND name <> lower(name);
