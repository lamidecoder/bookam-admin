# Audit & Correction Notes

This corrects the 5 admin pages built earlier in chat against your **actual**
`bookam-admin` repo and **actual** Supabase schema (read from
`bookam-mobile-full.zip` and `bookam-admin.zip`). Nothing here is a separate
fictional project — every file below either already exists in your repo
(corrected in place) or is new, following your exact conventions: inline
`style={{ backgroundColor: '#hex' }}`, no Tailwind config (v4 zero-config),
per-page local components, `lib/api.ts` mirroring the mobile app's pattern.

## What's new / changed

- `app/dashboard/properties/` (list, new, edit) — wired to the real `properties` table
- `app/dashboard/pricing/` — wired to `price_per_night`/`cancellation_fee_percent`/`min_stay` directly, plus the additive `weekend_*` columns and `special_rates` table
- `app/dashboard/calendar/` — wired to real `bookings` + `blocked_dates`, admin can override **any** date including booked ones per the original spec
- `app/dashboard/transactions/` — derived entirely from `bookings` (no separate ledger table exists or was invented), refund hits the real Paystack `/refund` API server-side
- `app/dashboard/users/` (list + detail) — wired to `profiles`, scoped to guests only (no Owners tab — nothing in your actual code or the 21 Figma screens supports an owner-portal/account system; that was only in the original proposal doc)
- `lib/api.ts` — new, mirrors your mobile app's `lib/api.ts` pattern exactly (plain async functions, real column names, typed, no `any`)
- `supabase/admin-migration.sql` — **run this once** in the Supabase SQL editor. Only adds what's genuinely missing: `profiles.phone/status/suspension_*`, `properties.weekend_*`, the `special_rates` table, and an admin RLS policy for `profiles` (see below — important).

## Run before testing

```sql
-- supabase/admin-migration.sql
```

Then copy `.env.local.example` → `.env.local` and fill in your real keys.

## Important — about the `profiles` RLS policy

The original `supabase-full-schema.sql` never defines RLS for `profiles`
(that table predates the file, created by Supabase's auth scaffold). The
migration adds an explicit policy so the admin Users page can read every
guest, not just its own row — **and** an insert policy, because without one,
enabling RLS would have silently broken the mobile app's registration
`upsert`. Double-check this against whatever policy currently exists on your
live `profiles` table before running — if one's already there, the
`create policy` statements will just fail harmlessly (already exists), but
worth a glance.

## What I did NOT touch

- `app/dashboard/page.tsx` (Overview), `app/dashboard/bookings/*`, `app/dashboard/analytics/page.tsx` — these already existed and are still static mock data, same as you uploaded them. Wiring those to live data wasn't asked for this round; flag if you want them done in the same pass.
- 5 pre-existing lint errors in `analytics/page.tsx`, `dashboard/page.tsx`, and `app/page.tsx` (unescaped quotes, one `any`) — these were already in your repo before I touched anything. Left alone since they're unrelated to this work; happy to fix if wanted.

## Honest known gaps (not silently worked around)

- **No failed-payment tracking.** Per the mobile app's `createBooking`/`confirmBooking` flow, a failed Paystack payment never creates a booking row at all — there's currently no record of failed attempts anywhere in the schema. The Transactions page can only show successful payments and refunds, not failures, until that's added to the mobile flow.
- **No real "member since" date for guests.** `profiles` only has `updated_at`, not a creation timestamp — the actual signup date lives on `auth.users.created_at`, which isn't readable from the client (admin or otherwise) without a service-role server route. The Users profile page currently shows "Profile last updated" instead of guessing at a signup date.
- **Photo upload isn't wired.** The Add/Edit Property forms have the dropzone UI but no Cloudinary call yet — same gap noted in the mobile app's outstanding tasks.
- **Owners tab** from the original proposal doc was deliberately left out — no owner auth, no owner role ever assigned in the actual code, and none of your 21 Figma screens show it. Say the word if you want it scoped properly (it'd need real owner accounts first).

## Round 2 — real bugs found by actually tracing runtime behavior

Asked directly "is everything fully wired, tested, no issues" — so I went
back and actually traced execution paths and rebuilt repeatedly, instead of
re-asserting the round-1 build pass. Found and fixed four real issues:

1. **Calendar deep-link was broken.** Properties page's "View Calendar"
   button passed `?property={id}` in the URL, but the Calendar page ignored
   it entirely and always defaulted to the first property. Fixed to read
   the param via `useSearchParams()` — which in turn required wrapping the
   page in a `<Suspense>` boundary (a real Next.js App Router requirement;
   confirmed by an actual failed build, not assumed).
2. **RLS recursion risk in the migration.** The `profiles` policy queried
   `profiles` from inside its own policy — Postgres can throw "infinite
   recursion detected in policy." Replaced with a `SECURITY DEFINER`
   helper function (`is_admin()`), the pattern Supabase's own docs
   recommend for this exact case.
3. **Migration wasn't actually re-runnable**, despite the header claiming
   it was — `create policy` and `alter publication add table` both error
   on a second run without a guard. Added `drop policy if exists` before
   every policy and `if not exists` on the publication statements.
4. **Blocking an already-blocked date would throw a raw Postgres error.**
   The spec allows admins to re-select any date including ones already
   blocked (e.g. to update the reason). `blockDates` used `insert`, which
   hits the `(property_id, date)` unique constraint in that case. Changed
   to `upsert`.

Also added the "cancellation fee cannot be zero" rule from the spec, which
I'd written into a code comment but never actually enforced anywhere — now
checked in Add Property, Edit Property, and Pricing Control before saving.

**Verified again after every fix:** `npm run build` (clean), `npm run lint`
(clean, same 5 pre-existing errors only), and an actual `npm run dev` +
`curl` smoke test against all 9 dashboard routes — all return HTTP 200
with no runtime errors, even with dummy Supabase credentials (failed
fetches are caught and shown as graceful error states, confirming the
error-handling paths work, not just the happy path).

**What I still can't verify from here:** real behavior against your live
Supabase data and real Paystack keys — I don't have those credentials.
Build/lint/route-render checks catch a large class of bugs (and did,
repeatedly, in this pass) but aren't a substitute for you clicking through
it once with real data before considering it done.

