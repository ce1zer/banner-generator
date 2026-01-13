# Bully Agency — AI Background/Composition Generator (MVP)

Dog breeders upload **one dog photo**, pick a **theme**, fill a few text fields (stored only), and generate **one cinematic 4:5 composition**. The AI generates **background/composition only** (no text on the image).

## Tech

- Next.js (App Router) + TypeScript + Tailwind
- Supabase: Auth (magic link), Postgres, Storage
- Deploy: Vercel

## Local setup

1. Install deps

```bash
npm install
```

2. Create a Supabase project

- Create a project in Supabase.
- Copy your project URL + anon key + service role key.

3. Configure environment variables

This repo includes `env.example` (copy values into your preferred local env mechanism).

Required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only; used for admin + storage)
- `ADMIN_EMAILS` (comma-separated allowlist)

Optional:

- `NANO_BANANA_API_URL`, `NANO_BANANA_API_KEY`
  - If missing, the app returns a generated placeholder PNG so the full flow works locally.
  - To call the real provider without hardcoding field names, set `NANO_BANANA_REQUEST_TEMPLATE_JSON` (see Nano Banana adapter section).

4. Apply database migration

In Supabase SQL Editor, run:

- `supabase/migrations/001_init.sql`

This creates:

- `themes` (seeded with 2 starter themes)
- `generations` (job records)
- RLS policies (themes readable when active; generations per-user)

5. Create Storage buckets (private)

In Supabase Storage:

- Create bucket **`uploads`** (private)
- Create bucket **`generated`** (private)

This MVP uses the **service role key** server-side to upload and create signed URLs, so you do *not* need complex Storage RLS policies yet.

### IMPORTANT (Vercel payload limits)

Vercel serverless functions can reject large multipart uploads (`FUNCTION_PAYLOAD_TOO_LARGE`).
This MVP uploads the dog photo **directly from the browser to Supabase Storage**.

Apply the Storage policy migration:

- `supabase/migrations/002_storage_uploads_policy.sql`

6. Configure Auth (magic link)

In Supabase Auth:

- Enable Email provider
- Ensure redirect URLs include your local dev URL:
  - `http://localhost:3000/auth/callback`

7. Run dev server

```bash
npm run dev
```

Open `http://localhost:3000`.

## App routes

- **`/`**: landing page
- **`/create`** (public): fill form + upload photo (no login required until Generate)
- **`/my`** (protected): history list
- **`/admin`** (protected + allowlist): theme prompt template CRUD

## API routes

- **GET ` /api/themes`**: public list of active themes (`id`, `name`, `slug`)
- **POST `/api/generations/start`**: auth required; creates generation job and runs generation inline (MVP)
- **GET `/api/generations/[id]`**: auth required; status + signed URL when ready
- **Admin**:
  - **GET/POST `/api/admin/themes`**
  - **PUT/DELETE `/api/admin/themes/[id]`**

## Generation job lifecycle

Database statuses are designed for moving to background processing later:

`draft → queued → generating → succeeded/failed`

MVP behavior:

- `/create` stores a **draft in the browser only** (localStorage + IndexedDB for the file).
- When the user clicks **Generate**:
  - if not logged in: we open an auth modal and set a **“pending generate”** flag.
  - after magic-link login: the app resumes and starts generation automatically.
- Server creates a `generations` row and moves it through `queued → generating → succeeded/failed`.

## Admin security (IMPORTANT)

Theme CRUD runs server-side using **`SUPABASE_SERVICE_ROLE_KEY`** (RLS-bypassing).

Additionally, the app enforces an allowlist:

- Set `ADMIN_EMAILS="you@domain.com,other@domain.com"`
- Admin access checks `session.user.email` against that list.

This MVP intentionally **does not rely on RLS for admin writes** to avoid claim/role complexity.

## Nano Banana adapter

The adapter lives in:

- `src/lib/nanoBanana/index.ts`

Contract:

- input: `{ prompt, referenceImageUrl, aspect: "4:5" }`
- output: `{ buffer, contentType, width, height }`
- robustness: **hard timeout + 1 retry**

### TODO (provider mapping)

The adapter intentionally does **not** assume exact Nano Banana Pro request/response fields.
Instead, you configure a **JSON request template** in env and the adapter replaces placeholders.

Required env vars to call the real provider:

- `NANO_BANANA_API_URL`
- `NANO_BANANA_API_KEY`
- `NANO_BANANA_REQUEST_TEMPLATE_JSON`

Placeholders supported inside `NANO_BANANA_REQUEST_TEMPLATE_JSON`:

- `{{PROMPT}}`
- `{{REFERENCE_IMAGE_URL}}` (short-lived signed URL created server-side)
- `{{ASPECT}}` (always `4:5`)

Example (adjust keys to match provider docs):

```json
{
  "prompt": "{{PROMPT}}",
  "reference_image_url": "{{REFERENCE_IMAGE_URL}}",
  "aspect_ratio": "{{ASPECT}}"
}
```

Optional env vars:

- `NANO_BANANA_AUTH_HEADER` (default `Authorization`)
- `NANO_BANANA_AUTH_VALUE_TEMPLATE` (default `Bearer {{API_KEY}}`)
- `NANO_BANANA_RESPONSE_MODE` (`auto` default; or `image`, `json_base64`, `json_url`)
- `NANO_BANANA_JSON_IMAGE_BASE64_FIELD` (default `image_base64`)
- `NANO_BANANA_JSON_IMAGE_URL_FIELD` (default `image_url`)
- `NANO_BANANA_JSON_CONTENT_TYPE_FIELD` (default `content_type`)

## Deployment (Vercel)

1. Push the repo to GitHub
2. Import into Vercel
3. Add env vars in Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_EMAILS`
   - (optional) `NANO_BANANA_API_URL`, `NANO_BANANA_API_KEY`
4. In Supabase Auth redirect URLs, add:
   - `https://<your-vercel-domain>/auth/callback`

## Future TODO hooks (worker/queue)

Vercel request timeouts will become a risk as generation times increase.
The inline work is intentionally isolated in:

- `runInlineGeneration(...)` inside `src/app/api/generations/start/route.ts`

Next step is to move that into:

- Supabase Edge Function (or a queue + worker)
- and have `/api/generations/start` only enqueue + return `generationId`

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
