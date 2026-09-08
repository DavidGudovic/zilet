CREATE TABLE submissions (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES "user"(id),
  author_name text NOT NULL,
  title text NOT NULL,
  text text NOT NULL,
  rubric text NOT NULL,
  media_id text REFERENCES media(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  screening text NOT NULL DEFAULT 'manual' CHECK (screening IN ('passed', 'manual')),
  screening_reason text NOT NULL DEFAULT '',
  post_id text REFERENCES posts(id) ON DELETE SET NULL,
  reviewed_by text REFERENCES "user"(id),
  review_note text NOT NULL DEFAULT '',
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX submission_queue_idx ON submissions(status, created_at);
CREATE INDEX submission_user_idx ON submissions(user_id, created_at);
