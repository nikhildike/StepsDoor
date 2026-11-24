# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is StepsDoor

A job board SaaS for the Indian market with three content types:
1. **Private job listings** — companies pay a subscription to post; job seekers browse free and are redirected to the company's own careers page to apply
2. **Government tenders** — scraped from public portals (mahatenders.gov.in, eprocure.gov.in, etc.), free but **members only** (login required)
3. **Government jobs** — scraped/fetched from NCS API and recruitment portals, free but **members only** (login required)

Revenue comes from company subscriptions via Razorpay.

**Members-only scraped data**: `TenderViewSet` / `GovtJobViewSet` (incl. `/states/`) require a JWT and 401 anonymous requests. Clients must not call them for guests — the web `api.js` interceptor treats any 401 as an expired session and redirects to `/login`. Instead, show the `MembersOnly` prompt (`frontend/src/components/ui/MembersOnly.jsx`, `mobile/src/components/common/MembersOnly.tsx`) and fetch only when a token exists. Web: `/tenders/:id` and `/govt-jobs/:id` are wrapped in `ProtectedRoute`, which passes `state.from` so `useAuth` returns the user there after login; `/tenders` and `/govt-jobs` themselves are static portal-link directories and stay public. Mobile: Login/Register `goBack()` on success, so screens just re-render with a token and load.

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

**Run from `backend/` directory.** A virtualenv exists at `backend/linksvenv/` — activate it before running Django commands (`source linksvenv/Scripts/activate` on Windows bash). Django 6.0.

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
| `alerts` | Private job alerts (Celery task matches new jobs → email/push) |
| `notifications` | FCM token registration, email via SendGrid |
| `tenders` | Govt tender listings, TenderAlert, ScraperLog |
| `govtjobs` | Govt job listings, GovtJobAlert |
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

> Always check https://docs.expo.dev/versions/v54.0.0/ before writing Expo code — SDK 54 has significant API changes.

**Entry point**: `index.js` → `registerRootComponent(App)` → `src/App.tsx`

**Navigation** (React Navigation v6):
- `RootNavigator` — shows `SplashScreen` (loads token from AsyncStorage), then switches between `AuthNavigator` and `AppNavigator`
- `AuthNavigator` — stack: Login → Register
- `AppNavigator` — persistent `BurgerMenu` top bar (sign-in link + hamburger → Profile/Alerts/Settings) above a 5-tab bottom nav: **Home, Jobs, Tenders, Shopping, Services**
  - **Home tab** (`HomeTabScreen`) — branding header + keyword search bar (unified search across Jobs, Tenders, and static Shopping directory) + "What's New" feed; Search is no longer a separate tab
  - **Jobs tab** (`JobsStackNavigator`) — list → detail; Govt Jobs and Company directory are reachable from within this stack, not top-level tabs
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
  00:15 daily          → expire_stale_listings  (hides listings past deadline or unseen for LISTING_STALE_DAYS)
  07:30 / 07:40 daily  → match_tender_alerts / match_govtjob_alerts
      → listings created in the last 24h matched against alerts (daily, so nothing matches twice);
        notification dispatch still TODO
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
