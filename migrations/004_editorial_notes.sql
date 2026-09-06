-- The signature is server-owned and travels with the draft/live revision.
ALTER TABLE revisions ADD COLUMN editorial_note_by text REFERENCES "user"(id);
