# Setup

Everything in the app is built and type-checked. What's left is account/config work
only you can do (I can't create accounts or OAuth apps on your behalf). Follow this
in order — steps 1–3 get you a working local dev environment; steps 4–5 are needed
before sign-in and synopsis generation work; step 6 is for deploying.

## 1. Create a Supabase project

1. Go to https://supabase.com and create a free account/project (any region is fine).
2. In your new project, go to **Project Settings → API**. You'll need three values:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` `secret` key → `SUPABASE_SERVICE_ROLE_KEY` (never expose this to the browser)
3. Copy `.env.local.example` to `.env.local` and fill in those three values.

```bash
cp .env.local.example .env.local
```

## 2. Run the schema migration

In the Supabase dashboard, go to **SQL Editor → New query**, paste the contents of
[`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql), and run it.
This creates the `issues`, `user_collection`, and `issue_corrections` tables, row-level
security policies, and the private `collection-photos` storage bucket.

## 3. Import the seed data

Paste the contents of [`supabase/seed/seed.sql`](supabase/seed/seed.sql) into the SQL
Editor and run it. This inserts all 827 pre-researched issues (Dec 1953–present) into
`issues`. It's safe to re-run — it won't overwrite existing rows.

If you ever edit `supabase/seed/playboy_issue_seed_data.csv` by hand, regenerate the SQL with:

```bash
npm run seed:generate
```

At this point `npm run dev` will show a fully browsable, read-only checklist (no
sign-in wired up yet from Supabase's side).

## 4. Enable Google and Microsoft sign-in

Both are configured the same way: in a provider's console you register an OAuth app
and get a client ID/secret, then paste those into Supabase's Auth settings.

**Google:**
1. https://console.cloud.google.com → create a project (or use an existing one) →
   **APIs & Services → Credentials → Create Credentials → OAuth client ID** → type
   "Web application".
2. Authorized redirect URI: use the callback URL Supabase shows you in the next step
   (looks like `https://<your-project-ref>.supabase.co/auth/v1/callback`).
3. Copy the generated Client ID and Client Secret.
4. In Supabase: **Authentication → Providers → Google** → toggle on, paste the
   Client ID/Secret, save.

**Microsoft (Azure/Entra):**
1. https://portal.azure.com → **Microsoft Entra ID → App registrations → New registration**.
2. Redirect URI (type "Web"): same Supabase callback URL as above, from
   **Authentication → Providers → Azure** in Supabase.
3. Under **Certificates & secrets**, create a new client secret and copy its value
   (not the secret ID) — you can't view it again later.
4. Copy the app's **Application (client) ID**.
5. In Supabase: **Authentication → Providers → Azure** → toggle on, paste the Client
   ID/Secret, save. (Supabase's "Azure" provider is Microsoft/Entra — it's what backs
   personal Outlook/Microsoft accounts too, not just work/school ones.)

Also set **Authentication → URL Configuration → Site URL** to `http://localhost:3000`
for now (add your production URL too once you deploy).

## 5. Get an Anthropic API key (for on-demand synopses)

1. https://console.anthropic.com → **API Keys** → create a key.
2. Put it in `.env.local` as `ANTHROPIC_API_KEY`.

The model ID used is `claude-sonnet-5` (see `src/app/api/synopsis/route.ts`); override
it with an `ANTHROPIC_MODEL` env var if that ID isn't available on your account.

## 6. Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. Sign in with Google or Microsoft, start checking off
issues, try Add Magazine, open an issue detail page to trigger its first synopsis
generation.

## 7. Deploy (Vercel)

1. Push this repo to GitHub.
2. Import it in https://vercel.com/new.
3. Add the same four env vars from `.env.local` in Vercel's Project Settings → Environment Variables.
4. After deploying, add your Vercel URL to Supabase's **Authentication → URL Configuration**
   (Site URL and Redirect URLs) and to the Google/Azure OAuth apps' redirect URIs if needed.

## Notes on the data model

- `cover_model` is the Playmate of the Month, not a verified cover photographer's
  credit — especially post-1990s, the actual cover model may differ. The UI labels
  this "Featured model" for that reason.
- A blank `interview_subject` means *unknown*, not *no interview that month* — the
  UI never claims certainty there isn't one.
- 2021–2024 is a known sourcing gap in the seed data (Playboy's irregular print
  schedule during that stretch). Use "Suggest a correction" on an issue's detail page
  as you go through your physical copies to fill it in — any signed-in user can
  suggest a correction, and either of you can accept it from the issue page.
