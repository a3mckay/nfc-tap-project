-- PRD v4 §7 Step 15a: Shelf-Side AI Assistant data (docs/PRD-ai-assistant.md §5).
-- Questions are behavioural data, not identity: question and answer text is
-- stripped of personal details before it's written (src/product-questions.ts),
-- and customers are identified only by the anonymous session cookie.

-- Up to 3 problem-first key points shown on the tap page (D21).
ALTER TABLE enrichments ADD COLUMN great_when jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Themes group questions. A product theme ("Does the chukka run small?") can
-- roll up into a store-wide theme ("Sizing") via parent_id; store-wide themes
-- have no product_id (D8).
CREATE TABLE question_themes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id  uuid REFERENCES products(id) ON DELETE CASCADE,
  parent_id   uuid REFERENCES question_themes(id) ON DELETE SET NULL,
  label       text NOT NULL,
  kind        text,   -- fit, materials, care, occasion, stock, price, policy, …
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX question_themes_store_idx ON question_themes(store_id, product_id);

-- Every question asked on the tap page (customers) or in the training view (staff).
CREATE TABLE product_questions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id       uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id     uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tag_id         uuid REFERENCES tags(id) ON DELETE SET NULL,
  session_id     text,   -- anonymous nfc_session cookie; null for staff
  asked_by       text NOT NULL CHECK (asked_by IN ('customer', 'staff')),
  staff_id       uuid REFERENCES store_staff(id) ON DELETE SET NULL,
  question_text  text NOT NULL,                       -- PII already removed
  pii_removed    jsonb NOT NULL DEFAULT '[]'::jsonb,  -- e.g. ["phone"] (D30)
  answer_text    text,                                -- null when unanswered
  sources        jsonb NOT NULL DEFAULT '[]'::jsonb,  -- what the answer drew on (D29)
  status         text NOT NULL CHECK (status IN ('answered', 'unanswered', 'staff_answered', 'dismissed')),
  theme_id       uuid REFERENCES question_themes(id) ON DELETE SET NULL,
  language       text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CHECK (asked_by = 'staff' OR staff_id IS NULL)   -- customer questions never carry a staff id
);
CREATE INDEX product_questions_product_idx ON product_questions(store_id, product_id, created_at DESC);
CREATE INDEX product_questions_status_idx ON product_questions(store_id, status);
CREATE INDEX product_questions_session_idx ON product_questions(session_id, product_id);
CREATE INDEX product_questions_theme_idx ON product_questions(theme_id);

-- The hidden answer pool (D11, D12, D38): answers written by owners, managers
-- and co-managers. The AI ranks them above every other source; they're never
-- listed on the customer page. Store-wide answers (no product_id) include store
-- policies such as returns and alterations (D18).
CREATE TABLE product_answers (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id         uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id       uuid REFERENCES products(id) ON DELETE CASCADE,
  theme_id         uuid REFERENCES question_themes(id) ON DELETE SET NULL,
  question         text NOT NULL,
  answer           text NOT NULL,
  author_role      text NOT NULL CHECK (author_role IN ('owner', 'manager', 'co_manager')),
  author_admin_id  uuid REFERENCES store_admins(id) ON DELETE SET NULL,
  author_staff_id  uuid REFERENCES store_staff(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  retired_at       timestamptz
);
CREATE INDEX product_answers_store_idx ON product_answers(store_id, product_id) WHERE retired_at IS NULL;

-- The research fact sheet (§6.2, D42): facts found by the AI research tool,
-- each with its source. Owners and managers can edit them; owner_edited facts
-- survive regeneration.
CREATE TABLE product_facts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id    uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  topic         text NOT NULL,   -- materials, care, fit, sizing, origin, other
  fact          text NOT NULL,
  source_url    text,
  source_kind   text NOT NULL CHECK (source_kind IN ('brand', 'retailer', 'review', 'other', 'owner')),
  owner_edited  boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX product_facts_product_idx ON product_facts(store_id, product_id);

-- Down
-- DROP TABLE IF EXISTS product_facts;
-- DROP TABLE IF EXISTS product_answers;
-- DROP TABLE IF EXISTS product_questions;
-- DROP TABLE IF EXISTS question_themes;
-- ALTER TABLE enrichments DROP COLUMN IF EXISTS great_when;
