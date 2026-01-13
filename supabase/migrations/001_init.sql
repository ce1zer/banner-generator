-- Bully Agency – AI Background/Composition Generator (MVP)
-- Core tables + RLS policies. Apply this in your Supabase SQL Editor.

create extension if not exists pgcrypto;

-- Updated-at trigger helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- THEMES
create table if not exists public.themes (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  prompt_template text not null,
  is_active boolean not null default true,
  access_tier text not null default 'free' check (access_tier in ('free','pro')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_themes_updated_at on public.themes;
create trigger trg_themes_updated_at
before update on public.themes
for each row execute procedure public.set_updated_at();

alter table public.themes enable row level security;

drop policy if exists "themes_select_active" on public.themes;
create policy "themes_select_active"
on public.themes
for select
to anon, authenticated
using (is_active = true);

-- GENERATIONS
create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  theme_id uuid references public.themes(id),
  status text not null check (status in ('draft','queued','generating','succeeded','failed')),
  input jsonb not null default '{}'::jsonb,
  prompt_final text not null default '',
  dog_photo_path text not null default '',
  result_image_path text,
  image_width int,
  image_height int,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_generations_updated_at on public.generations;
create trigger trg_generations_updated_at
before update on public.generations
for each row execute procedure public.set_updated_at();

alter table public.generations enable row level security;

drop policy if exists "generations_select_own" on public.generations;
create policy "generations_select_own"
on public.generations
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "generations_insert_own" on public.generations;
create policy "generations_insert_own"
on public.generations
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "generations_update_own" on public.generations;
create policy "generations_update_own"
on public.generations
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Seed 2 initial themes (idempotent upsert by slug)
insert into public.themes (slug, name, prompt_template, is_active, access_tier, sort_order)
values
(
  'urban-noir',
  'Urban Noir Alley',
  $tpl$
Create a single 4:5 portrait cinematic composition with a dog as the hero subject, using the provided reference dog photo for identity and coat markings.

Theme: {{THEME_NAME}} ({{THEME_SLUG}})
Aspect: {{ASPECT}}
Style: {{STYLE}}

Scene: gritty wet asphalt alley at night, neon reflections, soft volumetric fog, cinematic rim light on the dog, shallow depth of field.

Constraints:
- absolutely no text, no typography, no letters, no logos, no signage, no watermarks
- keep clean composition with negative space reserved for typography overlay later (but do not add any)
- realistic lighting and shadows; preserve dog anatomy
$tpl$,
  true,
  'free',
  10
),
(
  'royal-studio',
  'Royal Studio Portrait',
  $tpl$
Create a single 4:5 portrait high-end studio composition with a dog as the hero subject, using the provided reference dog photo for identity and coat markings.

Theme: {{THEME_NAME}} ({{THEME_SLUG}})
Aspect: {{ASPECT}}
Style: {{STYLE}}

Scene: elegant royal studio backdrop, subtle gilded accents, soft key light + fill, tasteful vignette, premium editorial look.

Constraints:
- absolutely no text, no typography, no letters, no logos, no watermarks
- keep clean composition with negative space reserved for typography overlay later (but do not add any)
- realistic lighting and shadows; preserve dog anatomy
$tpl$,
  true,
  'free',
  20
)
on conflict (slug) do update set
  name = excluded.name,
  prompt_template = excluded.prompt_template,
  is_active = excluded.is_active,
  access_tier = excluded.access_tier,
  sort_order = excluded.sort_order,
  updated_at = now();

