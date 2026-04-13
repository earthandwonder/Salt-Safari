# Implementation Questions — Answers Needed

> **What this is:** Questions that came up while writing the implementation prompt. Some block specific sessions; others are non-blocking but should be answered before launch. Answer each question below and Claude Code will incorporate your answers when working on the relevant session.
>
> **How to use:** Answer each question in the "Answer" section. When starting a session that references this file, tell Claude Code to read it first. Claude should use your answers to make the right implementation decisions.

---

## Blocking — Answer Before Session 1

### Q1: Supabase project credentials
**Session:** 1
**Question:** Once you've created your Supabase project, paste the following values here (or put them directly in `.env.local`):
- `NEXT_PUBLIC_SUPABASE_URL` =
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` =
- `SUPABASE_SECRET_KEY` =

**Answer:**

---

### Q2: Mapbox access token
**Session:** 1 (env setup), 8 (first map usage)
**Question:** Paste your Mapbox public access token:
- `NEXT_PUBLIC_MAPBOX_TOKEN` =

**Answer:**

---

### Q3: Resend API key
**Session:** 1 (env setup), 14 (first email usage)
**Question:** Paste your Resend API key:
- `RESEND_API_KEY` =

**Answer:**

---

### Q4: Google OAuth credentials
**Session:** 1 (auth setup)
**Question:** Have you set up Google OAuth credentials in the Google Cloud Console? If yes, paste the Client ID and Client Secret here (these go in the Supabase Dashboard under Authentication → Providers → Google, not in `.env.local`):
- Google Client ID =
- Google Client Secret =

If not done yet, write "skip" — email/password auth is enough to proceed. Google OAuth can be added later.

**Answer:**

---

## Blocking — Answer Before Session 5

### Q5: Flickr API key
**Session:** 5 (photo pipeline)
**Question:** Do you have a Flickr Pro account + commercial API key? If yes, paste it:
- `FLICKR_API_KEY` =

If not, write "skip" — the photo pipeline will work with Wikimedia + iNaturalist only (~60-70% coverage instead of ~75-85%).

**Answer:**

---

## Blocking — Answer Before Session 17

### Q6: Vercel project
**Session:** 17 (deploy)
**Question:** Have you connected this repo to a Vercel project? If yes, what's the project name/URL? If not, create one at [vercel.com](https://vercel.com) before starting Session 17.

**Answer:**

---

### Q7: Google Analytics tag
**Session:** 17 (deploy)
**Question:** Paste your Google Analytics measurement ID (e.g., `G-XXXXXXXXXX`):
- GA Measurement ID =

If not set up yet, write "skip" — can be added post-launch.

**Answer:**

---

## Blocking — Answer Before Session 25

### Q8: Stripe credentials
**Session:** 25 (Stripe integration)
**Question:** Once you've created your Stripe account and a Product/Price for the A$9.99 purchase, paste:
- `STRIPE_SECRET_KEY` =
- `STRIPE_WEBHOOK_SECRET` =
- `NEXT_PUBLIC_STRIPE_PRICE_ID` =

Use **test mode keys** first. Switch to live keys before launch.

**Answer:**

---

## Non-Blocking — Answer When You Can

### Q9: Existing prototype — keep or rebuild?
**Session:** 8, 11, 15
**Question:** The homepage (`src/app/page.tsx`), Species ID wizard (`src/app/id/page.tsx`), and Header (`src/components/Header.tsx`) are prototypes with hardcoded data. The implementation prompt instructs Claude to **adapt them** (preserve the visual design and structure, replace mock data with real queries). If you'd prefer Claude to **start fresh** on any of these, list them here.

**Answer:**

---

### Q10: Username format for profiles
**Session:** 13 (user profiles)
**Question:** User profile URLs will be `/u/[username]`. Should usernames be:
- **(A)** Chosen by the user during signup (like Twitter/GitHub — requires uniqueness validation)
- **(B)** Auto-generated from display name (e.g., "Ben Smith" → "ben-smith", with number suffix if taken)
- **(C)** Auto-generated from email prefix (e.g., "ben@gmail.com" → "ben", with suffix if taken)

Recommendation: **(A)** gives users ownership of their identity, which matters for the "dive CV" concept. But it adds signup friction.

**Answer:**

---

### Q11: Admin user setup
**Session:** 6 (first publish), 23 (admin dashboard)
**Question:** After you create your account on the site, you'll need to mark yourself as admin. You can do this via the Supabase SQL editor:
```sql
UPDATE users SET is_admin = TRUE WHERE id = 'your-user-uuid-here';
```
No question here — just a heads-up. You'll need your user UUID from the Supabase Auth dashboard.

**Acknowledged:**

---

### Q12: Domain DNS
**Session:** 17 (deploy)
**Question:** The plan mentions DNS via Cloudflare, domain via Name.com. When deploying, you'll need to:
1. Get the DNS records from Vercel (after connecting the domain in Vercel Dashboard)
2. Add them in Cloudflare
3. Set Cloudflare SSL mode to "Full (strict)" if proxying through Cloudflare, or "DNS only" if letting Vercel handle SSL

Do you want Claude to provide specific Cloudflare configuration guidance during Session 17, or will you handle DNS yourself?

**Answer:**

---

### Q13: Resend sender domain
**Session:** 14 (email alerts)
**Question:** Resend requires a verified sender domain for production emails. Which email address/domain should alerts come from?
- e.g., `alerts@saltsafari.app` or `hello@saltsafari.app`

You'll need to add DNS records (SPF, DKIM) in Cloudflare for this domain. Resend's dashboard walks you through it.

**Answer:**

---

### Q14: FishBase license concern
**Session:** 20 (FishBase enrichment)
**Question:** FishBase data is CC-BY-NC (non-commercial). The plan uses it for species enrichment (depth ranges, habitat types, size data) — not displaying raw FishBase content. This is likely fine, but the plan notes "consult lawyer." Have you taken legal advice on this? If not, do you want to:
- **(A)** Proceed with FishBase enrichment (likely fine for derived facts)
- **(B)** Skip FishBase and rely on other sources / manual enrichment
- **(C)** Defer until legal advice obtained

**Answer:**

---

## Instructions for Claude Code

When the user has answered these questions, incorporate the answers as follows:

1. **Credentials (Q1-Q8):** Use them to populate `.env.local`. Never commit credentials to git. If a credential is "skip", defer that integration and note it in a comment.

2. **Q9 (prototype approach):** If the user lists specific files to rebuild from scratch, do so. Otherwise, adapt the existing code (read it first, preserve what works, replace mock data).

3. **Q10 (username format):** Implement the chosen option. If (A), add a username field to signup with uniqueness validation. If (B) or (C), auto-generate during the signup trigger and add a "change username" option in profile settings.

4. **Q12 (DNS):** If the user wants guidance, provide step-by-step Cloudflare configuration during Session 17. If they'll handle it, just verify the domain resolves after they've configured it.

5. **Q13 (sender domain):** Use the specified email address in Resend configuration and email templates.

6. **Q14 (FishBase):** If (A), proceed with Session 20. If (B), skip Session 20 and note that species enrichment will need alternative sources. If (C), skip Session 20 and add a TODO comment in the code.
