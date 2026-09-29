-- Food reference tables. Meal logs and users arrive with the conversation agent (build step 2).
-- pg_trgm gives fuzzy alias search in the database; pgvector for semantic search comes later.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS ingredient (
  code        text PRIMARY KEY,           -- IFCT code, or X### for supplementary USDA foods
  name        text NOT NULL,
  food_group  text NOT NULL,
  local_names text NOT NULL DEFAULT '',
  source      text NOT NULL CHECK (source IN ('IFCT2017', 'USDA-FDC')),
  kcal        numeric NOT NULL,           -- all nutrients per 100 g edible portion
  protein_g   numeric NOT NULL,
  fat_g       numeric NOT NULL,
  carbs_g     numeric NOT NULL,
  fiber_g     numeric NOT NULL,
  energy_note text
);

CREATE TABLE IF NOT EXISTS dish (
  id           text PRIMARY KEY,
  name         text NOT NULL,
  diet         text NOT NULL CHECK (diet IN ('veg', 'egg', 'nonveg', 'vegan')),
  yield_grams  numeric NOT NULL CHECK (yield_grams > 0),
  default_unit text NOT NULL,
  assumption   text
);

CREATE TABLE IF NOT EXISTS dish_ingredient (
  dish_id         text NOT NULL REFERENCES dish(id) ON DELETE CASCADE,
  ingredient_code text NOT NULL REFERENCES ingredient(code),
  grams           numeric NOT NULL CHECK (grams > 0),
  PRIMARY KEY (dish_id, ingredient_code)
);

CREATE TABLE IF NOT EXISTS dish_portion (
  dish_id text NOT NULL REFERENCES dish(id) ON DELETE CASCADE,
  unit    text NOT NULL,
  grams   numeric NOT NULL CHECK (grams > 0),
  PRIMARY KEY (dish_id, unit)
);

CREATE TABLE IF NOT EXISTS dish_alias (
  dish_id    text NOT NULL REFERENCES dish(id) ON DELETE CASCADE,
  alias      text NOT NULL,
  normalized text NOT NULL,
  PRIMARY KEY (dish_id, alias)
);
CREATE INDEX IF NOT EXISTS dish_alias_trgm ON dish_alias USING gin (normalized gin_trgm_ops);

-- Per-100 g nutrition of each cooked dish, computed from its recipe and yield.
CREATE OR REPLACE VIEW dish_nutrition AS
SELECT d.id AS dish_id,
       round(sum(i.kcal * di.grams) / d.yield_grams, 1)      AS kcal_per_100g,
       round(sum(i.protein_g * di.grams) / d.yield_grams, 2) AS protein_per_100g,
       round(sum(i.fat_g * di.grams) / d.yield_grams, 2)     AS fat_per_100g,
       round(sum(i.carbs_g * di.grams) / d.yield_grams, 2)   AS carbs_per_100g,
       round(sum(i.fiber_g * di.grams) / d.yield_grams, 2)   AS fiber_per_100g
FROM dish d
JOIN dish_ingredient di ON di.dish_id = d.id
JOIN ingredient i ON i.code = di.ingredient_code
GROUP BY d.id, d.yield_grams;
