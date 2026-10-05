-- PRD v4 §7 Step 15j: store policies (docs/PRD-ai-assistant.md D48). Owners and
-- managers write short answers to the policy questions customers ask most; the
-- AI assistant answers store-wide questions from them. One row per filled-in
-- policy; the list of policy types lives in src/store-policies.ts.

CREATE TABLE store_policies (
  store_id    uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  policy_key  text NOT NULL,
  body        text NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, policy_key)
);

-- Down
-- DROP TABLE IF EXISTS store_policies;
