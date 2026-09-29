# Thali Tracker

An AI nutrition tracker and food Q&A assistant for Indians anywhere in the world, on WhatsApp and the web.
Plan: https://claude.ai/artifact/M9QUAzLWVAPzVBDRkE7LyL

## What's here

`packages/food-db` is the food database the rest of the app reads from. The language model's job is to
work out *which dish and how much*; the calorie and macro numbers always come from here.

- **Ingredients:** 542 raw foods from IFCT 2017 (ICMR–National Institute of Nutrition), imported from the
  `@ifct2017/compositions` package, plus 6 foods IFCT lacks (sugar, curd, butter, cream, white bread, peanuts)
  from USDA FoodData Central.
- **Dishes:** 64 home-style Indian dishes, each defined as a recipe of IFCT ingredients with a cooked yield,
  so nutrition per 100 g is computed rather than typed in. Each dish has portion sizes (roti = 38 g,
  katori of dal = 150 g, plate of biryani = 300 g) and the names people actually type (pappu, varan, arhar dal).
- **Lookup:** `resolveMeal("2 phulka, 1 katori dal")` parses simple messages, matches spellings like
  daal/dhal/dal, splits combos like "rajma chawal", and returns anything it could not match so the bot can
  ask instead of guessing.
- **Postgres:** `db/schema.sql` and a generated `db/seed.sql`, with trigram search on dish names.
- **Evals:** `evals/meals.jsonl` (102 meal messages with the expected dishes) and `evals/reference.json`
  (a typical calorie range per dish). `npm run eval` fails if meal accuracy drops below 90% or a dish leaves its range.

## Commands

```sh
npm install
npm test              # unit tests
npm run eval          # meal-parsing accuracy and dish sanity ranges
npm run typecheck
npm run report -w @thali/food-db      # every dish's nutrition per default portion
npm run import:ifct -w @thali/food-db # rebuild data/ingredients.ifct.json from the IFCT package
npm run seed:sql -w @thali/food-db    # regenerate db/seed.sql after editing data files
```

## Adding a dish

Add an entry to `packages/food-db/data/dishes.json` with its recipe (IFCT codes and raw grams for one batch),
cooked `yieldGrams`, `portions`, and aliases. Add a reference range to `evals/reference.json` and a few
messages to `evals/meals.jsonl`, then run `npm test && npm run eval && npm run seed:sql -w @thali/food-db`.

## Data notes

- IFCT publishes energy in kJ and lists 0 for all fats and oils; those use Atwater factors instead
  (4 protein, 9 fat, 4 carbohydrate, 2 fibre). Two rows whose energy contradicts their own macros
  (N001 chicken leg, Q001 crab) are recalculated the same way. Every change is recorded in `energyNote`.
- Dish recipes are typical home recipes written for this project, not INDB values. They should be
  checked against the Indian Nutrient Databank (INDB) once it can be downloaded into this environment.
- IFCT 2017 data is published by NIN. Confirm its terms before commercial launch.
