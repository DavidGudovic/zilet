ALTER TABLE posts ADD COLUMN published_updated_at timestamptz;

-- Historical best-known public date; draft-only saves must never affect it.
UPDATE posts SET published_updated_at = greatest(posts.published_at, revisions.created_at)
FROM revisions WHERE revisions.id = posts.published_revision_id;
