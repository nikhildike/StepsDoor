# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is StepsDoor

A job board SaaS for the Indian market with three content types:
1. **Private job listings** — posted by companies (subscription) and contractors; job seekers browse free and are redirected to the poster's own careers page to apply. Posting is gated by `CanPostJobs` (`apps/jobs/views.py`): a contractor's first post creates a `Company` from their `ContractorProfile.firm_name` (they keep `is_contractor`, not `is_company`), and they manage jobs at `/seeker/post-job` / `/seeker/jobs` (same pages as `/dashboard/...`, base path via `useDashboardBase`). Update/delete only see the caller's own jobs (inactive included).
2. **Government tenders** — scraped from public portals (mahatenders.gov.in, eprocure.gov.in, etc.), free but **members only** (login required)
3. **Government jobs** — scraped/fetched from NCS API and recruitment portals, free but **members only** (login required)

Revenue comes from company subscriptions via Razorpay.

**Members-only scraped data**: `TenderViewSet` / `GovtJobViewSet` (incl. `/states/`) / `CareerJobViewSet` (private-company jobs on the Companies page) require a JWT and 401 anonymous requests. Clients must not call them for guests — the web `api.js` interceptor treats any 401 as an expired session and redirects to `/login`. Instead, show the `MembersOnly` prompt (`frontend/src/components/ui/MembersOnly.jsx`, `mobile/src/components/common/MembersOnly.tsx`) and fetch only when a token exists. Web: `/tenders/:id` and `/govt-jobs/:id` are wrapped in `ProtectedRoute`, which passes `state.from` so `useAuth` returns the user there after login; `/tenders` has two tabs: "Latest tenders" (scraped list, `components/tenders/LatestTenders.jsx`, members only — the default for signed-in users, so contractors land on it after login) and "Official portals" (static, public portal-link directory). `/govt-jobs` works the same way: "Latest openings" (`components/govtjobs/LatestGovtJobs.jsx` — deadline badges via `utils/deadline.js`, Notification PDF / Official site buttons) and "Official portals". Both pages are also mounted in the seeker layout (`/seeker/tenders`, `/seeker/govt-jobs`, plus their `/:id` detail pages); list links and detail "Back" links use `useListingPrefix()` so they stay in whichever layout they were opened from. The student dashboard's "Jobs" item is the same Jobs hub as the public site (`components/layout/JobsLayout.jsx` tabs: private jobs at `/seeker/browse-jobs` — not `/seeker/jobs`, the contractor's My Jobs — plus `/seeker/companies`, `/seeker/govt-jobs`, `/seeker/freelancers`); JobsLayout picks public vs dashboard tab paths from the URL, and `useJobsBase()` / `useListingPrefix()` keep job, listing and careers links inside whichever layout they're in. The job seeker Alerts page (`/seeker/alerts`) manages both private job alerts and government job alerts (`components/govtjobs/GovtJobAlertPanel.jsx`; state options use the exact `state_map.py` names, since matching compares state names). **Saved jobs, job alerts and the dashboard span every kind of job**: StepsDoor posts (`job`), company careers jobs (`company`, apps.careers) and govt jobs (`govt`). `apps/jobseekers/listings.py` is the shared view over the three (open querysets, alert matching, `describe()`, `new_today_counts()` since midnight IST). `SavedJob` has exactly one of `job_post` / `career_job` / `govt_job` (check constraint); POST is idempotent (an existing bookmark returns 200). `JobAlert` matching (`GET /api/alerts/{id}/matches/`, `GET /api/alerts/matches/` for all active alerts): every keyword word must be in the title or employer; city uses standard city names (govt jobs, having no city, drop out); job type / min salary exist only on StepsDoor posts, so they limit an alert to those. Role / Keyword autocomplete: `GET /api/alerts/suggestions/?q=` (`listings.keyword_suggestions`) suggests 1–3 word phrases from open job titles of all three kinds that start with the typed text, ranked by how many titles contain them (never crossing `-`, `,`, `(`; grade codes like `4B` and stray single letters dropped); web `components/alerts/KeywordAutocomplete.jsx`, mobile `components/alerts/KeywordInput.tsx`. The daily job alert digest (`match_job_alerts`, email + push) uses the same matching and covers StepsDoor posts (new since the alert's `last_checked_at` by `created_at`) and company careers jobs (by `first_seen_at`), not govt jobs (they have their own digest, so nothing is sent twice). It mixes two models, so `AlertKind` takes `key_of` (dedup key per kind — pks collide) and `push_id_of` (None for company jobs, which have no app screen; the app then opens Alerts). Web: bookmark via `components/jobs/SaveJobButton.jsx` + `useSavedJobs().toggleSave(id, kind)`; matches via `components/alerts/AlertMatches.jsx` (Alerts page, dashboard); dashboard stat cards from `GET /api/jobseekers/stats/`. Mobile: `services/seekerService.ts` (saved jobs, alerts, matches), app-wide `store/savedJobsStore.ts` + `hooks/useSavedJobs.ts` (keys `kind:id`, loaded once per token, so a bookmark shows on every tab), `components/jobs/SaveJobButton.tsx` on JobCard / govt cards / company openings / alert matches, `SavedJobsScreen` and `AlertsScreen` (job alerts with `components/alerts/AlertMatchesList.tsx`) in the BurgerMenu; `navigation/jobLinks.ts` opens a job of any kind from root-stack screens. Mobile's dashboard is `components/home/SeekerSummary.tsx` at the top of the Home tab (stat cards + newest alert matches; refetched on focus; hidden for guests, contractors and companies). The job seeker dashboard shows "Govt jobs closing soon", and the navbar search returns scraped tenders and govt jobs for members. Mobile: Login/Register `goBack()` on success, so screens just re-render with a token and load.

---

## Architecture

Three layers sharing the same Django REST API:

```
backend/    ← Django REST API
frontend/   ← React + Vite web app
mobile/     ← Expo React Native app (job seekers only)
```

**Shared code strategy**: `services/`, `store/`, and `utils/` are written once in `frontend/src/` and mirrored in `mobile/src/`. Same Axios config, same Zustand stores, same validation — different UI only.

---

## Backend (Django)

**Run from `backend/` directory.** A virtualenv exists at `backend/linksvenv/` (gitignored) — activate it before running Django commands (`source linksvenv/Scripts/activate` on Windows bash). Django 6.0. A virtualenv is tied to the machine it was created on; if activation leaves `which python` pointing outside `linksvenv/`, recreate it: `python -m venv linksvenv && linksvenv/Scripts/python -m pip install -r requirements.txt`. `requirements.txt` must list every third-party import — the venv doesn't see globally installed packages.

```bash
python manage.py runserver
python manage.py runserver 0.0.0.0:8000  # bind all interfaces — needed so a phone on the same LAN (e.g. testing the mobile app via Expo Go) can reach it; plain `runserver` only binds 127.0.0.1
python manage.py makemigrations <app>
python manage.py migrate
python manage.py test
python manage.py test apps.jobs          # single app
celery -A config worker -l info          # Celery worker (on Windows add `-P solo` — prefork isn't supported there)
celery -A config beat -l info            # Celery Beat scheduler (DatabaseScheduler — reads the schedule from the DB)
python manage.py setup_scraper_schedule  # create the Beat schedule once per environment (--list to view, --reset to restore defaults)
```

The Celery app is `config/celery.py` (imported by `config/__init__.py` so `@shared_task`s bind to it); all settings are `CELERY_*` in `base.py`. Both worker and beat need Redis (`CELERY_BROKER_URL`).

Run scrapers manually:
```bash
scrapy crawl mahatenders -s SCRAPY_SETTINGS_MODULE=scrapers.settings
```

**Settings**: `config/settings/base.py` (common), `development.py`, `production.py`. Entry point: `DJANGO_SETTINGS_MODULE=config.settings.development`. Copy `backend/.env.example` → `backend/.env` and `frontend/.env.example` → `frontend/.env` for local setup.

**Apps** (`backend/apps/`):

| App | Purpose |
|---|---|
| `authentication` | Custom `User` model (extends AbstractUser), JWT login/register |
| `companies` | Company profiles, logos |
| `jobs` | Private job listings (company-paid), click tracking |
| `jobseekers` | Job seeker profiles, saved jobs |
| `subscriptions` | Plans, active subscription status |
| `payments` | Razorpay webhooks, invoice PDFs (WeasyPrint) |
| `analytics` | Click events per job post |
| `alerts` | Private job alerts (`match_job_alerts` emails daily digests of new matching jobs; push not built) |
| `notifications` | FCM token registration, email via SendGrid |
| `tenders` | Govt tender listings, TenderAlert, ScraperLog |
| `govtjobs` | Govt job listings, GovtJobAlert |
| `careers` | Private-company jobs read from companies' own ATS feeds (`CareerSource`, `CareerJob`) — kept separate from `govtjobs`; members-only on the Companies page (see below) |
| `freelancers` | Freelancer profiles (early-stage) |
| `stores` | Company storefront/catalogue listings |
| `services` | Local service-provider directory (lawyers, plumbers, mechanics, etc.) |

**Shared utilities** (`backend/core/`): `permissions.py` (IsCompanyUser, IsJobSeeker, IsOwner), `pagination.py` (20/page), `exceptions.py` (custom JSON error handler).

**Scraper** (`backend/scrapers/`): Scrapy project. `pipelines.py` uses `Tender.objects.update_or_create` / `GovtJob.objects.update_or_create` so re-runs are idempotent (`TenderPipeline` and `GovtJobPipeline` each key off a distinguishing item field — `tender_id` vs `job_id`). `scrapers/settings.py` bootstraps Django before any import. Portals are a DB registry (`ScraperSource` model), not hardcoded — see Data Pipeline section below.

**Key model notes**:
- `AUTH_USER_MODEL = 'authentication.User'`
- `Tender` and `GovtJob` both have a `SearchVectorField` with GIN index — populated in `save()` only when using PostgreSQL. On SQLite (dev), search falls back to DRF's `SearchFilter`.
- Deduplication keys: `(source_portal, tender_id)` for Tender, `(source_portal, job_id)` for GovtJob.
- **Database selection**: `DATABASES` is built from the `DATABASE_URL` env var via `dj-database-url` (default `sqlite:///db.sqlite3`, anchored to `backend/`). Set a `postgres://…?sslmode=require` URL to use PostgreSQL; the Postgres-only search paths check `DATABASES['default']['ENGINE']`.

**API docs**: `http://localhost:8000/api/docs/` (Swagger), `http://localhost:8000/api/redoc/`

---

## Web Frontend (React + Vite)

**Run from `frontend/` directory.**

```bash
npm run dev      # dev server on port 3000
npm run build    # production build
npm run lint     # ESLint
```

Dev server proxies `/api/*` to `http://localhost:8000` (configured in `vite.config.js`).

**Path alias**: `@/` → `src/`

**Three sections**:
- `pages/public/` — Home, Jobs, JobDetail, Tenders, TenderDetail, GovtJobs, GovtJobDetail, Companies, Pricing, Login, Register
- `pages/company/` — Dashboard, PostJob, ManageJobs, Analytics, Subscription, Invoices, Profile (all behind `ProtectedRoute requireCompany`)
- `pages/seeker/` — SavedJobs, Alerts, Profile

**Services** (`src/services/`): one file per domain — `api.js` is the shared Axios instance with JWT interceptor and auto-refresh on 401. All other service files import from `api.js`.

**State** (`src/store/`): Zustand. `authStore.js` persists to localStorage. `jobStore.js` holds filter state. `subscriptionStore.js` caches the active plan.

**Forms**: React Hook Form + Zod for validation across all forms.

**Rich text**: TipTap editor used for job description input in company pages.

**Charts**: Recharts used in the company analytics dashboard.

**Styling**: Tailwind CSS v3 with shadcn/ui CSS variable colour system. `src/utils/cn.js` exports the `cn()` helper (clsx + tailwind-merge).

---

## Mobile App (Expo / React Native)

**Run from `mobile/` directory.**

```bash
npm start               # Expo dev server (scan QR with Expo Go)
npm start -- --tunnel   # if phone and PC are on different networks
npm run android         # requires Android Studio + emulator
npm run lint             # expo lint
eas build --platform android  # cloud APK build (no Android Studio needed)
```

> Always check https://docs.expo.dev/versions/v57.0.0/ before writing Expo code — the app is on **Expo SDK 57** (`expo 57.0.x`; check `mobile/package.json` after upgrades), and Expo APIs change between SDKs.

**Entry point**: `index.js` → `registerRootComponent(App)` → `src/App.tsx`

**Navigation** (React Navigation v6):
- `RootNavigator` — shows `SplashScreen` (loads token from AsyncStorage), then switches between `AuthNavigator` and `AppNavigator`
- `AuthNavigator` — stack: Login → Register
- `AppNavigator` — persistent `BurgerMenu` top bar (sign-in link + hamburger → Profile/Alerts/Settings) above a 5-tab bottom nav: **Home, Jobs, Tenders, Shopping, Services**
  - **Home tab** (`HomeTabScreen`) — branding header + keyword search bar (unified search across Jobs, Tenders, and static Shopping directory) + "What's New" feed; Search is no longer a separate tab
  - **Jobs tab** (`JobsStackNavigator`) — `HomeScreen` segments: Jobs (job list with the "Hiring on StepsDoor" companies row as its header), Govt Jobs, Companies (company careers openings + directory); list → detail screens on the same stack
  - **Tenders tab** (`TendersStackNavigator`) — list → detail
  - **Shopping tab** (`ShoppingScreen`) — merged Online Stores + Retail Chains as a segmented toggle; Retail is no longer a separate tab
  - **Services tab** (`ServicesScreen`) — DB-backed local service-provider directory (`backend/apps/services`)
  - Profile, Alerts, and Settings are accessed via `BurgerMenu` (root-stack screens), not tab bar items

**Source layout** (`mobile/src/`):

| Directory | Purpose |
|---|---|
| `screens/` | auth/, home/, jobs/, tenders/, govtjobs/, shopping/, services/, settings/, seeker/ |
| `navigation/` | RootNavigator, AuthNavigator, AppNavigator, per-tab stack navigators, BurgerMenu |
| `components/common/` | Button, Input, Spinner, Badge, EmptyState, ScreenWrapper, FilterPickerButton |
| `components/companies/` | CareerLinkCard, CompanyDirectorySection (used within Jobs stack) |
| `components/navigation/` | BurgerMenu (persistent top bar with sign-in + hamburger) |
| `data/` | Static data files, e.g. `companyDirectory.ts` (company listings not yet in DB) |
| `store/` | authStore.ts (AsyncStorage), jobStore.ts, themeStore.ts (light/dark theme) |
| `services/` | Same logic as web. `api.ts` resolves the API host per platform: web → `window.location.hostname`; physical device via Expo Go → the LAN IP from Metro's `hostUri` (so Django must run on `0.0.0.0:8000`); Android emulator/fallback → `10.0.2.2` |
| `theme/` | colors.ts exports `useThemeColors()` hook (light/dark aware); typography.ts, spacing.ts — import from here, never hardcode values |

**Path alias**: `@/` → `src/` (via `babel-plugin-module-resolver` in `babel.config.js`)

---

## Testing

**Backend**: `python manage.py test` (all apps) or `python manage.py test apps.jobs` (single app) — see Backend section above.

**Frontend** (`frontend/`): Vitest + React Testing Library.
```bash
npm test         # run once (CI mode)
npm run test:watch
```
Config lives in `vite.config.js`'s `test` block (`jsdom` environment, `globals: true`); `src/setupTests.js` registers jest-dom matchers. Test files live next to the code they cover as `*.test.js`/`*.test.jsx`.

**Mobile** (`mobile/`): Jest via the `jest-expo` preset + React Native Testing Library.
```bash
npm test         # run once
npm run test:watch
```
Config lives in `package.json`'s `jest` key; `jest.setup.js` swaps in the official AsyncStorage mock so Zustand stores that persist to `AsyncStorage` (e.g. `themeStore.ts`) can be unit-tested without a device/emulator. Test files live next to the code they cover as `*.test.ts`/`*.test.tsx`.

---

## Data Pipeline (Tenders & Govt Jobs)

Portals are registered in the DB via the `ScraperSource` model (`apps/tenders/models.py`), not hardcoded — admin only supplies a URL and `source_type` (`tender` / `govt_job`); `source_portal`, `name`, and `spider_name` are auto-derived on save (`spider_name` defaults to `generic_tender` or `generic_govtjob`).

```
Celery Beat (schedule from `setup_scraper_schedule`, all times IST)
  hourly at :05        → scrape_all_portals            (tenders; NIC shows only the 10 newest)
  00:20/06:20/12:20/18:20 → scrape_all_govtjob_portals (govt jobs)
      → one scrape_portal / scrape_govtjob_portal per active source, queued with `expires`
        just under the interval so a worker outage doesn't pile up duplicate runs
  → scrape_portal(portal_name) task
      → apps.tenders.scraping.run_source(): creates ScraperLog, runs `scrapy crawl` as a CHILD PROCESS
      → TenderPipeline / GovtJobPipeline → update_or_create() on Tender/GovtJob
      → ScraperLogPipeline → final status + counts on ScraperLog, stamps ScraperSource.last_scraped_at
  05:40 / 17:40        → fetch_all_career_sources (private-company ATS feeds, apps/careers — not Scrapy)
  00:15 daily          → expire_stale_listings  (hides listings past deadline or unseen for LISTING_STALE_DAYS)
  07:30 / 07:40 / 07:50 daily → match_tender_alerts / match_govtjob_alerts / match_job_alerts
      → each alert matched against listings created since its last_checked_at; one digest
        email per user (apps.notifications.alert_emails); push (FCM) not built yet
  09:00 daily          → alert_failing_scrapers (emails SCRAPER_ALERT_EMAILS; see runbook below)
```

- **Never run `CrawlerProcess` inside a Celery task.** Twisted's reactor can't restart in a long-lived worker (`ReactorNotRestartable` from the second task on), which is why `run_source()` uses a subprocess. `run_scrapers` runs in-process only because the CLI exits afterwards.
- **ScraperLog status**: SUCCESS = items saved, no errors; PARTIAL = items saved but errors logged or time limit hit; FAILED = crash/timeout/abnormal finish *or zero items* (usually means the portal's layout changed). Only non-FAILED runs set `last_scraped_at`, and `expire_stale_listings` only hides "unseen" listings on portals with a recent non-FAILED run, so a broken spider can't wipe a portal's listings.
- Scraped dates are naive IST; `_parse_dt` pins them to `Asia/Kolkata` (project `TIME_ZONE` is UTC).
- Tunables in `base.py`: `SCRAPER_RUN_TIMEOUT` (default 1800s per crawl), `LISTING_STALE_DAYS` (default 14).
- Test one portal through the real path from the Django shell: `run_source(ScraperSource.objects.get(...))` (works on inactive sources). Tests: `python manage.py test apps.tenders`.

**Tenders — `generic_tender_spider.py` handles NIC eProcurement portals only** (~27 state/central/PSU portals: `<domain>/nicgep/app`, or `/eprocure/app` on eprocure.gov.in). Without login NIC exposes just the 10-row "Latest Tenders" box (`table#activeTenders`); the full list is behind a captcha. Each row's detail page has the real data (`td.td_caption`/`td.td_field` pairs) but only within the same server session, so this spider turns cookies ON (the project default is off). Tenders are keyed by NIC Tender ID (`2026_HRY_562238_1`); `source_url` is the portal home because detail URLs expire with the session. Non-NIC sites log "No NIC 'Latest Tenders' table" and save nothing (FAILED) — there is no generic table fallback, by design (it produced only junk). Parsing tests use real saved pages in `apps/tenders/test_fixtures/`.

**Govt jobs — `generic_govtjob_spider.py` is not used**: on real sites it mostly saved results, admit cards and menu links. Each recruiter gets a dedicated spider instead; generic govt-job sources stay switched off. Current spiders (`scrapers/spiders/`):
- `upsc` — HTML tables: /active-examinations/ (rows with a last date only) and /advertisements/ (PDF URL matched by file name).
- `ssc` — ssc.gov.in is a JS SPA; reads its public JSON API `/api/admin/5.1/liveExams`. Skips Limited Departmental (LDCE) exams.
- `ibps` — /recruitment/ list (exams IBPS runs for SBI, BPCL, banks…) plus "Notification for Common Recruitment Process" entries from /crp-updates/ younger than 30 days.
- `rrb` — rrbapply.gov.in is an Angular app; the open-CEN ticker (`initializeNotices`) is a literal in a JS chunk whose name changes per deploy, so the spider walks portal page → `main-*.js` → chunks. Only public static files are fetched, never the application API.

Spiders for recruiters that can legitimately have nothing open set `empty_ok = True` (zero items + no errors = SUCCESS) and must `logger.error()` when the structure they parse is missing, so a redesign still ends FAILED. Parsing tests use saved pages in `apps/govtjobs/test_fixtures/`.

Deadlines go through `_parse_deadline`: a date without a time means 23:59:59 IST that day. ISO strings are parsed strictly first (dateutil's `dayfirst=True` would turn `2026-12-08` into 12 Aug).

`python manage.py clean_scraper_sources [--dry-run] [--no-probe]` tidies the registry: moves notes typed after URLs in spreadsheet imports into `notes`, probes tender sources for NIC and switches off non-NIC ones, and flags generic govt-job sources. It never deletes rows or switches anything on.

`python manage.py purge_legacy_listings [--dry-run]` deletes listings saved by the retired generic spiders — any Tender whose `tender_id` isn't an NIC Tender ID and any GovtJob whose `job_id` lacks a dedicated-spider prefix (`exam:`, `advt:`, `rec:`, `crp:`, `cen:`). Run once per environment after deploying the new spiders. **New govt-job spiders must use a prefixed `job_id`** (and add the prefix to `CURRENT_JOB_ID_PREFIXES`) or this command would treat their rows as legacy.

To add a new portal:
1. If it's an NIC eProcurement portal, add a `ScraperSource` row via Django admin (`/admin/tenders/scrapersource/`) — set `url` and `source_type`, leave the rest blank. Add its domain → state to `scrapers/state_map.py`.
2. Otherwise create `backend/scrapers/spiders/<name>_spider.py` and set `spider_name` on the `ScraperSource` row to match.
3. Nothing to schedule per portal — the fan-out tasks pick up every active source. In a new environment run `python manage.py setup_scraper_schedule` once.

### Private-company careers pages (`apps/careers`)

Private jobs read from companies' own careers pages live in `apps/careers`, **never** in `govtjobs`. They're members-only like tenders/govt jobs (`/api/careers/jobs/` 401s guests) and appear as "Latest openings from company careers pages" on the Companies page (`/companies`, and `/seeker/companies` in the student dashboard) via `components/companies/LatestCompanyJobs.jsx`; guests see `MembersOnly`. Mobile: the Jobs tab's Companies segment shows the same list (`mobile/src/components/companies/CompanyOpeningsSection.tsx`, above the directory; tap opens the apply page). "Companies Hiring on StepsDoor" (subscriber companies) is not on the Companies page: it's a compact row inside the Jobs listing (web `components/companies/HiringCompanies.jsx` on `pages/public/Jobs.jsx`; mobile `HiringCompaniesRow.tsx` as the Jobs segment's list header), narrowed by the job search text and hidden when empty. We store facts only (title, location, team, dates, apply link) and send seekers to the company's ATS page to apply — never copy job descriptions.

Unlike the govt scrapers, everything here **obeys robots.txt**, sends an identifiable `StepsDoorBot` UA (no rotating browser UA) and waits ~1s between requests to a host (`apps/careers/ats.py` `PoliteFetcher`). Sites that refuse it are skipped, never worked around. No Scrapy: the feeds are JSON, read with `requests`.

1. **Classify** — `python manage.py classify_careers_ats [--input companies.csv] [--output careers_ats.csv] [--limit N] [--no-api]` reads the web `COMPANY_DIRECTORY` (`frontend/src/pages/public/Companies.jsx`, mirrored in `mobile/src/data/companyDirectory.ts`) and writes a CSV with each page's ATS (Greenhouse, Lever, Workday, Oracle, SuccessFactors, Darwinbox, …), JSON-LD `JobPosting` count, or `custom`/`js_shell`, plus fetch status (`blocked` = 401/403 bot wall, `robots_disallowed`, `http_404` = the directory URL is wrong — fix it in both directory files).
2. **Import** — `python manage.py import_career_sources careers_ats.csv [--dry-run]` creates `CareerSource` rows for ATSs with an adapter. Re-imports keep `is_active`.
3. **Fetch** — `fetch_all_career_sources` (Celery Beat, 05:40 and 17:40 IST; added by `setup_scraper_schedule`) or `python manage.py fetch_career_jobs [--source ID ...] [--ats workday]`, or admin → Career sources → "Fetch now". `apps/careers/sync.py` upserts by `(source, external_id)` and deactivates jobs the feed no longer lists; a failed fetch changes no jobs and bumps `consecutive_failures` (ERROR log at `CAREER_ALERT_AFTER_FAILURES`, default 3).

Adapters (`apps/careers/adapters.py`) keep **India jobs only** and at most `CAREER_JOBS_MAX_PER_SOURCE` (default 300) per company:

| ATS | `ats_slug` | Reads |
|---|---|---|
| Greenhouse | board slug | `boards-api.greenhouse.io/v1/boards/<slug>/jobs` (public API) |
| Lever | company slug | `api.lever.co/v0/postings/<slug>?mode=json` (public API) |
| Workday | `host/site` | POST `https://<host>/wday/cxs/<tenant>/<site>/jobs` with the site's `locationCountry=India` facet (unofficial; `posted_at` is approximate from "Posted 3 Days Ago", set once) |
| Oracle Recruiting Cloud | `host/siteNumber` | `/hcmRestApi/resources/latest/recruitingCEJobRequisitions` filtered to `PrimaryLocationCountry == 'IN'` (unofficial; importer defaults the site to `CX_1` — fix `ats_slug` in admin if the fetch fails) |

**City filter**: free-text ATS locations are mapped to standard city names (`apps/careers/cities.py` `CITY_ALIASES`, e.g. Bangalore/Gurgaon/Calicut -> Bengaluru/Gurugram/Kozhikode) and stored in `CareerJob.cities` as `'|Bengaluru|Pune|'`; `?city=` matches whole names and `/api/careers/jobs/cities/` lists cities with counts. Jobs whose location names only a state or "India" (~1 in 5) have no city. When a common city shows up unmatched, add it or its spelling to `CITY_ALIASES` (the next fetch updates jobs). Workday's bare "2 Locations" is replaced by the primary site from the job path.

Darwinbox, SuccessFactors and Phenom have no adapter yet (Darwinbox is a JS app with no public feed found). **Removal requests**: switch the source off in admin the same day — its jobs disappear from the API immediately. Tests: `python manage.py test apps.careers`.

### When a portal changes its website (runbook)

**1. Notice.** `alert_failing_scrapers` (daily, 09:00 IST) emails `SCRAPER_ALERT_EMAILS` — and always logs at ERROR in the worker — listing active sources whose last `SCRAPER_ALERT_AFTER_FAILURES` (default 3) runs all FAILED. One failure is usually the portal being down; a streak usually means a redesign. Details: admin → Scraper Logs, filter Status = Failed. Typical messages: "no items were saved — the page layout may have changed", or the spider's own error ("No NIC 'Latest Tenders' table…", "No chunk contains the open-CEN ticker…"). The email only sends once production email is configured (`EMAIL_BACKEND`); until then read the worker log.

**2. Diagnose** (from `backend/`, venv active):
```bash
scrapy crawl <spider> -a start_url=<url> -a source_portal=<domain>   # full crawl log
scrapy shell "<listing url>"                                          # try selectors: response.css('...')
```
For JS sites (SSC, RRB) use the browser's DevTools → Network (Fetch/XHR) to find the JSON endpoint or script the page now loads.

**3. Fix** the spider in `scrapers/spiders/` — usually a selector, a detail-page label, or a URL. What each depends on:

| Spider | Depends on |
|---|---|
| `generic_tender` | `table#activeTenders` rows; detail page `td.td_caption`/`td.td_field` labels ("Tender ID", "Bid Submission End Date", …) |
| `upsc` | `table.exam-table tr.exam-table-row`; `table.dbim-table` + `button.view-doc-btn` (PDF URL matched by file name) |
| `ssc` | JSON at `/api/admin/5.1/liveExams` and its field names |
| `ibps` | `div.detail-section` blocks on /recruitment/ and /crp-updates/ |
| `rrb` | portal page → `main-*.js` → chunk containing `initializeNotices(){this.notices=[…]}` |

**Never change the id format** (NIC Tender ID; `exam:`/`advt:`/`rec:`/`crp:`/`cen:` job ids) — the same listing would be saved twice and `purge_legacy_listings` would treat the new rows as legacy.

**4. Update the test.** Save the new page over its fixture (`apps/tenders/test_fixtures/`, `apps/govtjobs/test_fixtures/`; for big JS keep only the excerpt the spider reads), adjust expectations in `apps/*/tests.py`, run `python manage.py test apps.tenders apps.govtjobs`.

**5. Verify live**, then deploy: in `python manage.py shell`, `run_source(ScraperSource.objects.get(source_portal='<domain>', source_type='<type>')).status` should be `'success'`. The next scheduled run picks it up.

No code needed when a portal only **moved** (edit the source's `url` in admin) or for a **new NIC portal** (add a source + a `state_map.py` line). If a fix will take a while, switch the source off in admin; its saved listings stay until their deadlines pass.

---

## Code Comments (required convention)

This codebase is documented with thorough, explanatory comments so it can be understood by re-reading it cold, without needing to reconstruct intent from git history or Slack threads. **Every new or changed class, function/method, and non-obvious property/field must be commented — this is not optional.**

- **Backend (Python/Django)**: every module gets a top-of-file docstring describing its role; every class (models, serializers, views, permissions, admin, Celery tasks, spiders, pipelines) gets a docstring covering what it represents and when it's used; every model/serializer field gets an inline comment explaining what it stores; every method/function gets a docstring covering parameters, return value, and the use-case that calls it.
- **Frontend/mobile (JS/JSX/TS/TSX)**: every file gets a top-of-file comment describing its role; every component gets a JSDoc block above it describing what it renders, its props, and which parent/route uses it; every hook, handler, and exported function gets a comment on purpose; every non-obvious prop, store field, or constant gets a short inline comment.
- Inline `//`/`#` comments belong on any branch, loop, or transformation whose *why* isn't obvious from naming alone.
- Comments must never restate what the code already says (e.g. don't write `# increment counter` above `count += 1`) — they explain intent, constraints, and use-cases. Wherever the identifier names already make that clear, prefer a short one-liner over a paragraph.
- Comments-only changes must not alter behavior, logic, or formatting.

When making future changes to this repo — new files, new functions, edits to existing ones — apply this same standard: add or update the relevant docstrings/comments as part of the change, don't leave new code uncommented.

---

## Other Docs in Repo Root

- `OPTIMIZATIONS.md` — prioritised optimisation backlog with per-item checkboxes; tick items off as they're done.
- `PRE_LAUNCH_CHECKLIST.md` — launch-readiness checklist.
- `SHOPPING_AFFILIATE_PROGRAMS.md` — affiliate network setup (Cuelinks, Amazon Associates, EarnKaro) for the Shopping/Stores section.
- `stepsdoor-tender-module-documentation.md` — detailed tender module write-up.
- `STEPS.md` is a pasted terminal transcript, not maintained documentation.

---

## Infrastructure

| Concern | Service |
|---|---|
| Hosting | DigitalOcean App Platform |
| Database | DigitalOcean Managed PostgreSQL 16 (SQLite in dev) |
| Cache + Queue | DigitalOcean Managed Redis + Celery |
| File Storage | DigitalOcean Spaces (S3-compatible, django-storages) |
| Payments | Razorpay Subscriptions |
| Push Notifications | Firebase FCM via expo-notifications |
| Email | SendGrid (django-anymail) |
| PDF Invoices | WeasyPrint |
| App Build | EAS Build (cloud) |

### Email

Sent with Django's `send_mail` through django-anymail's SendGrid backend in production (`production.py`); development prints mail to the console unless `.env` sets `EMAIL_BACKEND=anymail.backends.sendgrid.EmailBackend`. Production needs `SENDGRID_API_KEY` and a SendGrid-verified sender in `DEFAULT_FROM_EMAIL` (default `StepsDoor <noreply@stepsdoor.in>` — verify that address or authenticate the stepsdoor.in domain in SendGrid, or SendGrid rejects the mail). An empty or wrong key isn't caught up front: SendGrid answers 401 and the task fails with `AnymailAPIError` in the worker log. Tests that touch the SendGrid backend must patch `requests.Session.request` — anymail will make a real HTTP call even with an empty key. `anymail.W003` is silenced in production; see the comment there.

**Alert digest emails** (`apps/notifications/alert_emails.py`, templates `templates/emails/alert_digest.{txt,html}`): `send_alert_digests(alerts, AlertKind(...))` is the shared engine for tender, govt job and private job alerts — each task only supplies the alert queryset, a `match(alert, since)` filter and a `to_item(listing)` formatter. Each alert stores `last_checked_at`; a run matches listings created after it (or after the alert's own creation, so new alerts don't get a backlog), sends one email per user with each listing once, then advances `last_checked_at` to the run's start. A failed send leaves it unchanged, so the next run retries — missed or doubled runs neither lose nor repeat mail. Links use `FRONTEND_URL`; at most `ALERT_EMAIL_MAX_ITEMS` listings per email. Amounts use `inr()` (Indian grouping, ₹12,28,141). Management command output must stay ASCII — Windows consoles (cp1252) crash on characters like `→`/`₹`.

### Push notifications

Alert digests also go out as push notifications, through **Expo's push service** (`backend/apps/notifications/push.py` → `POST https://exp.host/--/api/v2/push/send`, which forwards to FCM/APNs). The server holds no Firebase credentials.

- **Mobile** (`mobile/src/services/notificationService.ts`, `hooks/useNotifications.ts`): after sign-in the app creates the Android `default` channel (must precede the token request), asks permission, gets an Expo push token with the EAS `projectId`, and POSTs it to `/api/notifications/push-token/` (`PushTokenView`; idempotent, a token moves to whoever signs in on that device). Sign-out DELETEs it. Tapping a push opens the listing (one match) or its list (several) via `notificationRouting.ts` + `navigation/navigationRef.ts`, including when the tap launches the app from closed.
- **Backend**: `send_alert_digests` emails first, then pushes `{type: 'alert_digest', kind, count, id}`. A user with no email but a registered device gets push only. If the email fails, push is skipped so the retry sends both once. Expo tickets with `DeviceNotRegistered` delete the token; delivery receipts aren't checked. `PUSH_NOTIFICATIONS_ENABLED` turns it off; `EXPO_PUSH_ACCESS_TOKEN` is only needed with Expo "enhanced push security". Tests that register a device must patch `apps.notifications.push.requests.post`.
- **`FCMToken`** keeps its historical name but stores Expo push tokens (`ExponentPushToken[...]`); raw FCM tokens are rejected.
- **One-time setup** (until done, the app logs a warning and skips registration): in `mobile/`, run `eas init` (writes `extra.eas.projectId` to app config); create a Firebase project, generate an FCM V1 service-account key and upload it with `eas credentials` (Android → Google Service Account → FCM V1); add `google-services.json` and `"android": {"googleServicesFile": "./google-services.json"}` to `app.json`. Remote push does **not** work in Expo Go on Android (SDK 53+) — test with a development build (`eas build --profile development`).
