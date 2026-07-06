# Email Marketing — Texas + Bayer

A new **Email Marketing** tab in the Admin panel with two sub-sections (Texas Cemetery Brokers and Bayer Cemetery Brokers). Each brand has its own sender identity, audience, templates, and branded design. Sending, audience storage, and unsubscribe tracking are handled by **Resend** (via the Resend connector) so the marketing traffic is fully isolated from your existing transactional flow on `notify.texascemeterybrokers.com`.

## What you'll be able to do

1. Pick a brand (Texas or Bayer).
2. Upload a CSV of mortuary contacts (email, first name, last name, company, city — extra columns are stored as JSON metadata).
3. Browse / search / delete the audience for that brand. See who has unsubscribed.
4. Pick a template ("Intro to mortuaries" for v1), tweak subject + preheader + a couple of merge fields, and preview the exact rendered email in-panel.
5. Send a test to yourself, then send the campaign to the full active audience for that brand.
6. See past campaigns with sent / opened / bounced / unsubscribed counts.
7. Anyone who clicks the footer unsubscribe link lands on a branded page for that brand and is suppressed from future sends for that brand.

## What I'll build

### Connector + secrets
- Connect the **Resend** connector (workspace-level; you'll pick the account in a popup). This drops `RESEND_API_KEY` into the project.
- Nothing else to configure by hand.

### Database (Lovable Cloud)
- `marketing_brands` enum (`texas`, `bayer`) reused across the tables below.
- `marketing_contacts` — one row per email+brand. Fields: brand, email, first_name, last_name, company, city, phone, extra (jsonb), source (`csv_upload` / `manual`), csv_batch_id, unsubscribed_at, bounced_at, complained_at, created_at.
- `marketing_campaigns` — brand, template_key, subject, preheader, from_name, from_email, body_overrides (jsonb), status (`draft` / `sending` / `sent` / `failed`), sent_at, resend_broadcast_id, totals (sent/opened/clicked/bounced/unsubscribed), created_by.
- `marketing_sends` — one row per (campaign, contact). status, resend_email_id, error, sent_at. Powers the per-campaign reporting.
- `marketing_unsubscribe_tokens` — opaque token → (brand, email). One-click unsubscribe.
- Admin-only RLS on all of them (`has_role(auth.uid(), 'admin')`) with the standard `GRANT` block. Service-role full access for edge functions.

### Edge functions (server-side; nothing sensitive in the browser)
- `marketing-import-contacts` — accepts parsed CSV rows + brand, dedupes on (brand, lower(email)), upserts, returns import stats.
- `marketing-send-campaign` — renders the chosen React Email template server-side, iterates the active audience in batches, calls Resend `/emails` per recipient (so each has a unique unsubscribe token in the footer), records `marketing_sends` rows, updates campaign totals. Throttled to stay under Resend rate limits.
- `marketing-send-test` — same render, one recipient (you).
- `marketing-unsubscribe` — GET validates a token and returns brand + email; POST marks the contact unsubscribed.
- `resend-webhook` — receives `email.bounced`, `email.complained`, `email.opened`, `email.clicked` and updates the matching `marketing_sends` + `marketing_contacts` rows. You'll paste the webhook URL into Resend once.

### React Email templates
Located under `supabase/functions/_shared/marketing-email-templates/`:
- `texas-intro-to-mortuaries.tsx` — editorial Vogue palette matching your existing Texas transactional emails (Georgia, hibiscus coral accent, hairline dividers, masthead with your existing hibiscus logo).
- `bayer-intro-to-mortuaries.tsx` — modern, confident, blue + white. I'll art-direct: crisp sans-serif (Inter/Söhne-style stack that renders in email clients), deep navy `#1e3a8a` primary with a lighter cornflower accent, generous whitespace, white masthead with the Bayer roundel, a 3-column "Why partner with us" strip (Zero cost to families · Commission to your home · We handle everything), and a single strong CTA.

Content beat for both (final copy sent back for your approval before first real send):
> Families you serve often have unused or duplicate cemetery property they don't know what to do with. We list, market, and sell it for them at prices below the cemetery's retail — and pay your funeral home a referral commission on every closed sale. No inventory to hold. No paperwork on your end. We handle showings, contracts, and cemetery transfers.

Each template accepts merge fields (`{{firstName}}`, `{{company}}`, `{{city}}`) with graceful fallbacks.

### Admin UI (`src/components/admin/EmailMarketingPanel.tsx` + sub-components)
- Brand switcher at the top (Texas / Bayer pill toggle, brand color changes accordingly).
- Tabs inside: **Audience** · **Compose** · **Campaigns**.
- Audience: drag-drop CSV, column-mapping preview, import summary, searchable table, per-row unsubscribe toggle, bulk delete.
- Compose: template picker → live iframe preview of the rendered email → subject / preheader / from-name inputs → "Send test to me" → "Send to N active contacts" with a confirm dialog showing the exact recipient count.
- Campaigns: list of past sends with status pills and drill-in for per-recipient results.

### Bayer brand asset
- Upload the white Bayer roundel you provided to Lovable Assets so it can be embedded in emails (needs an absolute https URL). Save the pointer at `src/assets/bayer-logo-white.png.asset.json` and reuse it in the Bayer template (on a navy background inside the masthead) and the unsubscribe page.

### Unsubscribe page
- `src/pages/Unsubscribe.tsx` — reads `?token=…&brand=…`, calls `marketing-unsubscribe`, shows branded confirm / already-unsubscribed / invalid states. Bayer variant uses the blue/white palette; Texas variant uses the existing Vogue palette.

### Sample email
- After the infrastructure is in, I'll fire `marketing-send-test` with the Texas template so a live sample lands in your inbox for approval before you send anything to real contacts.

## What you'll need to do (one-time, outside the code)

1. **DNS at your registrar** — add SPF/DKIM records for `news.texascemeterybrokers.com` and `news.bayercemeterybrokers.com`. Resend will show the exact records after you add each domain in their dashboard. I'll surface the two domain names in the UI so you can copy/paste. (I can't add these records for you — they live at your DNS registrar.)
2. **Verify the domains in Resend.** Once green, marketing sends will start working.
3. **Paste the Resend webhook URL** (I'll show it in the panel) into Resend → Webhooks so bounces / opens / unsubscribes flow back in.

Until DNS is verified, sends will fail with a clear "domain not verified" message and nothing will go out — safe to build and preview templates in the meantime.

## What I'm explicitly NOT doing

- Not routing any marketing through `notify.texascemeterybrokers.com` or Lovable's built-in transactional queue — that stays reserved for your quotes and buyer replies so their deliverability isn't dragged down.
- Not building a drip / sequence engine in v1 (single broadcast per campaign). Easy to extend later.
- Not building automated list-warming — you'll want to start with your smallest, warmest list of mortuaries and scale up over a couple of weeks.

## Order of build

1. Connect Resend (opens a popup for you).
2. DB migration + GRANT + RLS.
3. Edge functions.
4. Bayer logo asset + React Email templates.
5. Admin panel UI + Unsubscribe page.
6. Send you a live Texas sample.

Reply "go" and I'll build straight through steps 1–5, then hand you the sample and the DNS records.
