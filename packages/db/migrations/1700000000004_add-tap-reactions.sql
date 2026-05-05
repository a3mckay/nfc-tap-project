-- Up Migration
CREATE TABLE tap_reactions (
  id          bigserial PRIMARY KEY,
  tag_id      uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  session_id  text NOT NULL,
  reaction    text NOT NULL CHECK (reaction IN ('loved', 'liked', 'passed')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tag_id, session_id)
);
CREATE INDEX tap_reactions_tag_id_idx ON tap_reactions(tag_id);

-- Down Migration
DROP TABLE IF EXISTS tap_reactions;
