# bloomia
Bloomia is an abstract, rule-based puzzle game. Each run evolves from monochrome calm into neon complexity as you navigate drifting nodes.

## Run locally
Because this repo uses native ES modules (no build step), you just need a static file server:

- `python3 -m http.server 8000`
- open `http://localhost:8000`

Opening `index.html` directly via `file://` won’t work in most browsers due to module/CORS restrictions.

## GitHub Pages
This repo is designed to deploy as-is to GitHub Pages (static files only).

## Supabase leaderboard (optional)
Supabase fits the “public API scoreboard” requirement because you can:
- use an `anon` key from the browser (no secrets on the client)
- enforce guardrails with Postgres constraints + RLS
- expose a read-only `leaderboard` view and a write-only `scores` table

Setup:
1. Create a Supabase project.
2. In Supabase → SQL editor, run `supabase/schema.sql`.
3. In Supabase → Project settings → API, copy:
   - Project URL
   - `anon` public key
4. In-game: open **Settings** and paste the URL + anon key.

Notes:
- This is “anti-cheat friction”, not cheat-proof (the client is public). RLS prevents easy DB vandalism (updates/deletes, arbitrary reads) but can’t prove a run was “legit” without a server-side verifier.
