# StepsDoor Pre-Launch Checklist

I made this list on **21 Nov 2026** by reading the codebase and running two commands:

- `python manage.py check --deploy --settings=config.settings.production`
- the test suites (`python manage.py test` and `npm test`)

Tick each item off as it's done.

---

## 🔴 Blockers: the live site won't work until these are fixed

### Backend (`backend/config/settings/`)

- [ ] **Database is hardcoded to SQLite.** `base.py` (the `DATABASES` dict) ignores `DATABASE_URL`, so production would use a local file instead of PostgreSQL. DigitalOcean App Platform also wipes local files on every deploy, so all data would be lost. Read `DATABASE_URL` from the environment instead, for example with `dj-database-url`.
- [ ] **Sign-up emails will fail.** OTP codes are sent by email (`apps/authentication/views.py`, `send_mail`), but production has no email setup and `django-anymail` isn't in `requirements.txt`, so registration will break. Add the SendGrid backend and `DEFAULT_FROM_EMAIL`.
- [ ] **`CORS_ALLOWED_ORIGINS = []`** in `production.py`. The website can't call the API until you add your frontend domain here.
- [ ] **Set `ALLOWED_HOSTS`** to your real domain. The default is `localhost` only.
- [ ] **Generate a real `SECRET_KEY`** (50+ random characters). Django flagged the current one as weak. Login tokens are signed with this key too.
- [ ] **Add a production web server.** `requirements.txt` doesn't include `gunicorn`, and the repo has no Procfile, Dockerfile or App Platform spec (`.do/app.yaml`).
- [ ] **Static files.** Add `whitenoise` (or use Spaces) and run `collectstatic`. With `DEBUG=False`, Django stops serving the admin's CSS and JS itself.
- [ ] **Uploaded files (logos, etc.).** `django-storages` and `boto3` are installed but not configured. As with the database, uploads saved to the server's disk disappear on each deploy. Point them at DigitalOcean Spaces.

### Mobile (`mobile/src/services/api.ts`)

- [ ] **The app's server address is hardcoded** to `http://<host>:8000`, so a release build can't reach the live server. Change it to the production `https://` API URL before running `eas build`.

---

## 🟠 Security: before going public

- [ ] **HTTPS settings** in `production.py`. These are the remaining warnings from `check --deploy`:
  - `SECURE_SSL_REDIRECT = True`
  - `SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')`, because App Platform sits behind a proxy
  - `SESSION_COOKIE_SECURE = True` and `CSRF_COOKIE_SECURE = True`
  - `SECURE_HSTS_SECONDS`, starting small (e.g. 3600) and raising it once HTTPS is confirmed working
  - `CSRF_TRUSTED_ORIGINS` set to the frontend and admin domains
- [ ] **Rate limiting.** There is no DRF throttling set up, so login, OTP and register can be spammed. Add `DEFAULT_THROTTLE_CLASSES` and `DEFAULT_THROTTLE_RATES`, and a stricter limit on the OTP endpoint, since every request sends an email.
- [ ] **Admin URL.** Consider moving `/admin/` to a less obvious path, and use a strong superuser password.
- [ ] **API docs.** `/api/docs/`, `/api/redoc/` and `/api/schema/` are public. Decide whether to keep them public or restrict them to admins.
- [ ] **Payments.** `WebhookLogViewSet` allows full create/edit/delete over the API, and there is no Razorpay webhook signature check. Pricing is "coming soon", so you could disable the payments routes until payments are built.
- [ ] **Keep secrets out of git.** `.env` files and `db.sqlite3` are git-ignored, and nothing sensitive is tracked today. Keep it that way.

---

## 🟡 Background work: scrapers and alerts

- [ ] **Set up Redis** (DigitalOcean Managed Redis) and set `CELERY_BROKER_URL`.
- [ ] **Run Celery as separate App Platform components:**
  - a worker: `celery -A config worker -l info`
  - a beat scheduler: `celery -A config beat -l info`
- [ ] **Turn the scrapers on.** All `ScraperSource` rows are currently inactive in the local database. Switch on the ones you want in production.
- [ ] **Create the periodic tasks** in Django admin (Periodic Tasks): `scrape_all_portals` and `match_tender_alerts`.
- [ ] **Finish the alert TODOs** in `apps/tenders/tasks.py` and `apps/govtjobs/tasks.py`. Alert notifications are not implemented yet.
- [ ] **Push notifications (optional at launch).** Alerts are pushed through Expo's push service, so the server needs no Firebase file. One-time setup: run `eas init` in `mobile/` (adds the project ID), upload the Firebase FCM V1 service-account key to the Expo project (`eas credentials`), and add `google-services.json` to the app — see CLAUDE.md "Push notifications".

---

## 🟢 Frontend and launch

- [ ] **Set `VITE_API_URL`** to the production API URL, then run `npm run build`.
- [ ] **Affiliate IDs.** Fill in `VITE_AMAZON_AFFILIATE_TAG` and `VITE_CUELINKS_PUBLISHER_ID` (and the backend equivalents) after signing up. See `SHOPPING_AFFILIATE_PROGRAMS.md`.
- [ ] **Missing favicon.** `index.html` points to `/favicon.svg`, but `public/` only has `favicon.ico`.
- [ ] **Search engines.** Add a meta description, Open Graph tags and a `sitemap.xml`. `robots.txt` currently allows everything.
- [ ] **Single-page app routing.** Set up the hosting so that refreshing a page like `/tenders` serves `index.html` instead of a 404.
- [ ] **Legal pages.** India's DPDP Act requires a Privacy Policy and Terms of Service.
- [ ] **Aadhaar numbers.** Store registration collects them. Check whether storing them is necessary at all; if it is, protect them.
- [ ] **Fix linting.** ESLint 9 has no `eslint.config.js`, so `npm run lint` fails.

---

## 🔵 Data and operations

- [ ] **Set up the new database.** Run `python manage.py migrate`, then `createsuperuser`.
- [ ] **Load the data the site needs.** That means subscription plans, service categories and the scraper sources.
- [ ] **Backups.** Turn on automatic backups for the managed PostgreSQL database.
- [ ] **Logging and error tracking.** There's no `LOGGING` configuration and no Sentry (or similar) yet.
- [ ] **Domain and DNS.** Point the domain at the host and confirm SSL is active.
- [ ] **Staging test.** The backend has **0 tests**, and the frontend has 1 file with 4 tests, which pass. Before launch, click through these flows on a staging deploy:
  - register (email OTP)
  - login
  - post a job
  - search tenders and govt jobs
  - the Shopping and Services pages
  - the mobile app against the staging API
