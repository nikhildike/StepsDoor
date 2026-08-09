# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Linksdoor

A job board SaaS for the Indian market with three content types:
1. **Private job listings** — companies pay a subscription to post; job seekers browse free and are redirected to the company's own careers page to apply
2. **Government tenders** — scraped from public portals (mahatenders.gov.in, eprocure.gov.in, etc.), free to browse
3. **Government jobs** — scraped/fetched from NCS API and recruitment portals, free to browse

Revenue comes from company subscriptions via Razorpay.

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

**Run from `backend/` directory.** Python is system Python (Python 3.13) — no venv activation needed.

```bash
python manage.py runserver
python manage.py makemigrations <app>
python manage.py migrate
python manage.py test
python manage.py test apps.jobs          # single app
celery -A config worker -l info          # Celery worker
celery -A config beat -l info            # Celery Beat scheduler
```

Run scrapers manually:
```bash
scrapy crawl mahatenders -s SCRAPY_SETTINGS_MODULE=scrapers.settings
```

**Settings**: `config/settings/base.py` (common), `development.py`, `production.py`. Entry point: `DJANGO_SETTINGS_MODULE=config.settings.development`.

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

**Shared utilities** (`backend/core/`): `permissions.py` (IsCompanyUser, IsJobSeeker, IsOwner), `pagination.py` (20/page), `exceptions.py` (custom JSON error handler).

**Scraper** (`backend/scrapers/`): Scrapy project. `pipelines.py` uses `Tender.objects.update_or_create` so re-runs are idempotent. `scrapers/settings.py` bootstraps Django before any import. Add new portal spiders to `scrapers/spiders/` and register in `apps/tenders/tasks.py::PORTAL_SPIDER_MAP`.

**Key model notes**:
- `AUTH_USER_MODEL = 'authentication.User'`
- `Tender` and `GovtJob` both have a `SearchVectorField` with GIN index — populated in `save()` only when using PostgreSQL. On SQLite (dev), search falls back to DRF's `SearchFilter`.
- Deduplication keys: `(source_portal, tender_id)` for Tender, `(source_portal, job_id)` for GovtJob.

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

**State** (`src/store/`): Zustand. `authStore.js` persists to localStorage. `jobStore.js` holds filter state.

**Styling**: Tailwind CSS v3 with shadcn/ui CSS variable colour system. `src/utils/cn.js` exports the `cn()` helper (clsx + tailwind-merge).

---

## Mobile App (Expo / React Native)

**Run from `mobile/` directory.**

```bash
npm start               # Expo dev server (scan QR with Expo Go)
npm start -- --tunnel   # if phone and PC are on different networks
npm run android         # requires Android Studio + emulator
eas build --platform android  # cloud APK build (no Android Studio needed)
```

> Always check https://docs.expo.dev/versions/v57.0.0/ before writing Expo code — SDK 57 has significant API changes.

**Entry point**: `index.js` → `registerRootComponent(App)` → `src/App.tsx`

**Navigation** (React Navigation v6):
- `RootNavigator` — shows `SplashScreen` (loads token from AsyncStorage), then switches between `AuthNavigator` and `AppNavigator`
- `AuthNavigator` — stack: Login → Register
- `AppNavigator` — 6-tab bottom nav: Jobs, Search, Tenders, Govt Jobs, Alerts, Profile
- Each content tab has its own stack navigator for list → detail screens

**Source layout** (`mobile/src/`):

| Directory | Purpose |
|---|---|
| `screens/` | auth/, jobs/, tenders/, govtjobs/, seeker/ |
| `navigation/` | RootNavigator, AuthNavigator, AppNavigator, per-tab stack navigators |
| `components/common/` | Button, Input, Spinner, Badge, EmptyState, ScreenWrapper |
| `store/` | authStore.ts (AsyncStorage), jobStore.ts |
| `services/` | Same logic as web — api.ts uses `10.0.2.2:8000` for Android emulator |
| `theme/` | colors.ts, typography.ts, spacing.ts — import from here, never hardcode values |

**Path alias**: `@/` → `src/` (via `babel-plugin-module-resolver` in `babel.config.js`)

---

## Data Pipeline (Tenders & Govt Jobs)

```
Celery Beat (every 6 hours)
  → scrape_all_portals task
      → Scrapy spider per portal
      → TenderPipeline.process_item() → Tender.update_or_create()
      → ScraperLog updated
  → match_tender_alerts task
      → new tenders (last 24h) matched against TenderAlert records
      → notification dispatch (TODO: Week 10)
```

To add a new portal:
1. Create `backend/scrapers/spiders/<name>_spider.py`
2. Add entry to `PORTAL_SPIDER_MAP` in `backend/apps/tenders/tasks.py`
3. Schedule via Django admin → Periodic Tasks

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
