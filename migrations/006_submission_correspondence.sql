CREATE TABLE submission_messages (
  id text PRIMARY KEY,
  submission_id text NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  actor_id text NOT NULL REFERENCES "user"(id),
  recipient_id text NOT NULL REFERENCES "user"(id),
  kind text NOT NULL CHECK (kind IN ('question', 'reply', 'accepted', 'rejected')),
  body text NOT NULL CHECK (length(body) <= 4000),
  delivery_status text NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'failed', 'unavailable')),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX submission_message_thread_idx ON submission_messages(submission_id, created_at);
