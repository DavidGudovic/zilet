-- Credit identities ignore casing and accidental spacing, never diacritics.
CREATE OR REPLACE FUNCTION zilet_author_key(value text) RETURNS text
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS $$
  SELECT lower(btrim(regexp_replace(normalize(translate(value, chr(160) || chr(8239), '  '), NFC), '[[:space:]]+', ' ', 'g')))
$$;

CREATE TABLE author_redirects (
  slug text PRIMARY KEY,
  author_id text NOT NULL REFERENCES authors(id) ON DELETE CASCADE
);

-- Lock writes while updating JSON revision references and choosing canonical profiles.
LOCK TABLE authors, posts, revisions IN SHARE ROW EXCLUSIVE MODE;
CREATE TEMP TABLE author_merge ON COMMIT DROP AS
SELECT id, first_value(id) OVER (
  PARTITION BY zilet_author_key(name)
  ORDER BY (name <> upper(name) AND name <> lower(name)) DESC,
    is_editor DESC, (bio IS NOT NULL AND bio <> '') DESC,
    (portrait_id IS NOT NULL) DESC, length(slug), slug, id
) AS canonical_id FROM authors;

-- Preserve all distinct biography paragraphs, editor flags and a credited portrait.
UPDATE authors a SET
  bio = (SELECT string_agg(bio, E'\n\n' ORDER BY preferred DESC, bio) FROM
    (SELECT other.bio, bool_or(other.id = a.id) preferred FROM authors other
      JOIN author_merge m ON m.id = other.id WHERE m.canonical_id = a.id
      AND nullif(other.bio, '') IS NOT NULL GROUP BY other.bio) b),
  is_editor = (SELECT bool_or(other.is_editor) FROM authors other JOIN author_merge m ON m.id = other.id WHERE m.canonical_id = a.id),
  portrait_id = coalesce(a.portrait_id, (SELECT other.portrait_id FROM authors other JOIN author_merge m ON m.id = other.id WHERE m.canonical_id = a.id AND other.portrait_id IS NOT NULL ORDER BY other.id LIMIT 1))
WHERE EXISTS (SELECT 1 FROM author_merge m WHERE m.canonical_id = a.id AND m.id <> a.id);

INSERT INTO author_redirects(slug, author_id)
SELECT a.slug, m.canonical_id FROM authors a JOIN author_merge m ON m.id = a.id WHERE m.id <> m.canonical_id;

-- Invalidate open editor snapshots before remapping all draft/live/history references.
UPDATE posts SET version = version + 1 WHERE id IN (
  SELECT r.post_id FROM revisions r JOIN author_merge m ON r.content->>'authorId' = m.id WHERE m.id <> m.canonical_id
);
UPDATE revisions r SET content = jsonb_set(r.content, '{authorId}', to_jsonb(m.canonical_id))
FROM author_merge m WHERE r.content->>'authorId' = m.id AND m.id <> m.canonical_id;
DELETE FROM authors a USING author_merge m WHERE a.id = m.id AND m.id <> m.canonical_id;
CREATE UNIQUE INDEX authors_name_key_idx ON authors (zilet_author_key(name));
