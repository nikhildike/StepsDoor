# StepsDoor — Optimization Backlog

Optimization suggestions to be developed one by one. Grouped by layer, roughly ordered by ROI.

---

## Backend

### 1. Add `select_related` / `prefetch_related` to list views
- **Problem:** Any view that serializes related objects (company logo, subscription status, etc.) without `select_related`/`prefetch_related` fires one extra query per row (N+1).
- **Fix:** Add `.select_related(...)` / `.prefetch_related(...)` to every `get_queryset()` that touches FK or M2M fields.
- **Files:** `backend/apps/jobs/views.py`, `backend/apps/stores/views.py`, `backend/apps/tenders/views.py`, `backend/apps/govtjobs/views.py`
- [ ] Done

---

### 2. Rate-limit Celery scraper fan-out
- **Problem:** `scrape_all_portals` fires `scrape_portal.delay()` for every active `ScraperSource` in a tight loop with no concurrency cap — can saturate the worker pool under load.
- **Fix:** Replace the loop with a Celery `group` + `chord`, or set `CELERY_WORKER_CONCURRENCY` explicitly and use `rate_limit` on the task.
- **Files:** `backend/apps/tenders/tasks.py`
- [ ] Done

---

### 3. Move SearchVectorField update off `save()`
- **Problem:** The GIN search vector is rebuilt on every model save, even for unrelated field changes — expensive on large tables.
- **Fix:** Use a PostgreSQL trigger or a periodic Celery task to refresh the vector instead of doing it inline in `save()`.
- **Files:** `backend/apps/tenders/models.py`, `backend/apps/govtjobs/models.py`
- [ ] Done

---

### 4. Cache public read-heavy API endpoints
- **Problem:** `/tenders/`, `/govtjobs/`, `/stores/` serve mostly static scraped data (refreshed every 6 hours) but hit the DB on every request.
- **Fix:** Add `cache_page(60 * 30)` (Django) backed by Redis to those views.
- **Files:** `backend/apps/tenders/views.py`, `backend/apps/govtjobs/views.py`, `backend/apps/stores/views.py`
- [ ] Done

---

### 5. Offload PDF invoice generation to Celery
- **Problem:** WeasyPrint runs in-process and takes 100–500 ms per render, blocking the request thread.
- **Fix:** Move rendering to a Celery task; return a job ID and poll for a download URL.
- **Files:** `backend/apps/payments/views.py`
- [ ] Done

---

### 6. Bulk-insert scraped items instead of one-by-one `update_or_create`
- **Problem:** Each scraped item hits the DB individually in `pipeline.process_item()` — portals with hundreds of items generate hundreds of round-trips.
- **Fix:** Buffer items and flush with `bulk_create(update_conflicts=True)` (Django 4.1+) in `close_spider()`.
- **Files:** `backend/scrapers/pipelines.py`
- [ ] Done

---

### 7. Add rate limiting to public API endpoints
- **Problem:** No rate limiting on listing/detail endpoints — vulnerable to scraping and abuse.
- **Fix:** Add `django-ratelimit` decorators or configure nginx `limit_req` zones.
- **Files:** `backend/apps/tenders/views.py`, `backend/apps/govtjobs/views.py`, `backend/apps/stores/views.py`, `backend/config/settings/production.py`
- [ ] Done

---

### 8. Add structured JSON logging
- **Problem:** Backend uses default Django logging — hard to filter/alert in DigitalOcean log aggregation.
- **Fix:** Add `python-json-logger`; emit structured logs with request duration, user id, and status code.
- **Files:** `backend/config/settings/base.py`
- [ ] Done

---

## Frontend (React + Vite)

### 9. Replace raw Axios calls with React Query
- **Problem:** Every page mount fires fresh requests with no deduplication or caching — identical requests on re-renders hit the network unnecessarily.
- **Fix:** Wrap service calls with `useQuery` / `useMutation` from `@tanstack/react-query`; get stale-while-revalidate, deduplication, and background refresh for free.
- **Files:** All files in `frontend/src/pages/` and `frontend/src/hooks/`
- [ ] Done

---

### 10. Lazy-load Shopping and RetailStores pages
- **Problem:** `SHOPPING_GROUPS` and `RETAIL_GROUPS` (large static arrays) are bundled eagerly, inflating first-load JS.
- **Fix:** Wrap both pages in `React.lazy()` + `<Suspense>` in `App.jsx`.
- **Files:** `frontend/src/App.jsx`
- [ ] Done

---

### 11. Debounce search inputs in Shopping and RetailStores
- **Problem:** `ALL_STORES.filter(...)` runs synchronously on every keystroke, causing redundant re-renders on fast typing.
- **Fix:** Add a 200–300 ms debounce on the search `onChange` handler (e.g. `use-debounce` or a simple `useRef` timer).
- **Files:** `frontend/src/pages/public/Shopping.jsx`, `frontend/src/pages/public/RetailStores.jsx`
- [ ] Done

---

### 12. Block render until Zustand auth store is hydrated
- **Problem:** `authStore` reads from localStorage but the tree renders before hydration completes, causing a flash of unauthenticated UI.
- **Fix:** Use Zustand `persist` middleware's `onRehydrateStorage` callback to set a `hasHydrated` flag; render a splash/spinner until it's `true`.
- **Files:** `frontend/src/store/authStore.js`, `frontend/src/main.jsx`
- [ ] Done

---

### 13. Add image lazy-loading and size hints
- **Problem:** Company logos and store logos are loaded eagerly with no size constraints, blocking render and causing layout shift.
- **Fix:** Add `width`, `height`, and `loading="lazy"` to all `<img>` tags for below-the-fold content; serve WebP via DigitalOcean Spaces image transforms.
- **Files:** `frontend/src/pages/public/Shopping.jsx`, `frontend/src/pages/public/RetailStores.jsx`, `frontend/src/pages/public/Companies.jsx`
- [ ] Done

---

### 14. Add structured request logging in Axios interceptor
- **Problem:** No visibility into slow API calls or client-side errors from the frontend.
- **Fix:** Log request duration and error codes in the Axios response interceptor.
- **Files:** `frontend/src/services/api.js`
- [ ] Done

---

## Mobile (Expo / React Native)

### 15. Consolidate Shopping + Retail into a single "Stores" tab
- **Problem:** The bottom tab bar now has 8 items — too many for comfortable thumb reach; iOS guidelines recommend ≤5.
- **Fix:** Merge Shopping and Retail under a single "Stores" stack navigator with an in-screen toggle/segmented control.
- **Files:** `mobile/src/navigation/AppNavigator.tsx`, new `mobile/src/screens/stores/StoresScreen.tsx`
- [ ] Done

---

### 16. Paginate subscribed store lists on mobile
- **Problem:** `ShoppingScreen` and `RetailStoresScreen` fetch all subscribed stores in one request — will degrade as the list grows.
- **Fix:** Pass `page_size` param and implement `FlatList`/`SectionList` `onEndReached` + `onEndReachedThreshold` pagination.
- **Files:** `mobile/src/screens/shopping/ShoppingScreen.tsx`, `mobile/src/screens/retail/RetailStoresScreen.tsx`
- [ ] Done

---

### 17. Add offline banner using NetInfo
- **Problem:** Every screen shows a blank/spinner on network failure with no user feedback.
- **Fix:** Install `@react-native-community/netinfo`; show a persistent top banner when the device is offline.
- **Files:** `mobile/src/components/common/ScreenWrapper.tsx` (or a new `OfflineBanner` component)
- [ ] Done

---

### 18. Remove `Linking.canOpenURL()` checks for https:// URLs
- **Problem:** `canOpenURL` is async, adds a round-trip before every external link, and requires special entitlements on iOS for non-http schemes — none of which apply here since all URLs are `https://`.
- **Fix:** Call `Linking.openURL(url)` directly; wrap in a try/catch for safety.
- **Files:** `mobile/src/screens/shopping/ShoppingScreen.tsx`, `mobile/src/screens/retail/RetailStoresScreen.tsx`
- [ ] Done

---

### 19. Cache last successful API responses in AsyncStorage
- **Problem:** No stale data shown on network failure — screens are completely blank if the fetch errors.
- **Fix:** After every successful list fetch, write the result to AsyncStorage; read it as initial state on the next mount before the network response arrives.
- **Files:** `mobile/src/screens/jobs/HomeScreen.tsx`, `mobile/src/screens/tenders/TendersScreen.tsx`, `mobile/src/screens/govtjobs/GovtJobsScreen.tsx`
- [ ] Done

---

## Priority Order (suggested)

| # | Item | Layer | Effort | ROI |
|---|------|-------|--------|-----|
| 9 | React Query | Frontend | Medium | High |
| 4 | Cache public endpoints | Backend | Low | High |
| 15 | Consolidate Stores tab | Mobile | Low | High |
| 6 | Bulk scraper inserts | Backend | Low | High |
| 1 | Fix N+1 queries | Backend | Low | High |
| 11 | Debounce search | Frontend | Low | Medium |
| 17 | Offline banner | Mobile | Low | Medium |
| 5 | Async PDF generation | Backend | Medium | Medium |
| 10 | Lazy-load pages | Frontend | Low | Medium |
| 2 | Celery fan-out limit | Backend | Medium | Medium |
| 3 | SearchVector off save() | Backend | Medium | Medium |
| 12 | Zustand hydration fix | Frontend | Low | Medium |
| 16 | Mobile store pagination | Mobile | Medium | Medium |
| 7 | API rate limiting | Backend | Low | Medium |
| 18 | Remove canOpenURL | Mobile | Low | Low |
| 8 | Structured logging | Backend | Low | Low |
| 13 | Image lazy-loading | Frontend | Low | Low |
| 14 | Axios request logging | Frontend | Low | Low |
| 19 | AsyncStorage cache | Mobile | High | Medium |
