-- Trusted plant references (founder, 2026-11-16): facts and specs can come from
-- a reference site (NC State Extension, Missouri Botanical Garden, ASPCA, the
-- Canadian Poisonous Plants Information System), ranked after the brand's own site.

ALTER TABLE product_facts DROP CONSTRAINT product_facts_source_kind_check;
ALTER TABLE product_facts ADD CONSTRAINT product_facts_source_kind_check
  CHECK (source_kind IN ('brand', 'reference', 'retailer', 'review', 'other', 'owner'));

ALTER TABLE product_specs DROP CONSTRAINT product_specs_source_kind_check;
ALTER TABLE product_specs ADD CONSTRAINT product_specs_source_kind_check
  CHECK (source_kind IN ('brand', 'reference', 'retailer', 'review', 'other', 'owner'));

-- Down
-- ALTER TABLE product_facts DROP CONSTRAINT product_facts_source_kind_check;
-- ALTER TABLE product_facts ADD CONSTRAINT product_facts_source_kind_check CHECK (source_kind IN ('brand', 'retailer', 'review', 'other', 'owner'));
-- ALTER TABLE product_specs DROP CONSTRAINT product_specs_source_kind_check;
-- ALTER TABLE product_specs ADD CONSTRAINT product_specs_source_kind_check CHECK (source_kind IN ('brand', 'retailer', 'review', 'other', 'owner'));
