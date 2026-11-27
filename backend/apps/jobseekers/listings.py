"""One view over every kind of job a job seeker can browse, save or get alerts for.

Three sources, each kept in its own app:
- 'job'     — StepsDoor job posts (apps.jobs.JobPost), posted by companies/contractors
- 'company' — openings read from companies' careers pages (apps.careers.CareerJob)
- 'govt'    — government job openings (apps.govtjobs.GovtJob)

Used by:
- `apps.alerts.views` — the jobs matching a job alert's keyword/city (`alert_match_querysets`, `collect_matches`)
- `apps.jobseekers.views.SeekerStatsView` — the dashboard's "New Jobs Today" (`new_today_counts`)
- `apps.jobseekers.serializers.SavedJobSerializer` — saved-job display fields (`describe`)

Every function here returns only jobs a seeker can still act on: active, not
expired, and (company jobs) from a switched-on careers source.
"""
from datetime import datetime, time

from django.db.models import Q
from django.utils import timezone

from zoneinfo import ZoneInfo

IST = ZoneInfo('Asia/Kolkata')

# The job kinds, in the order mixed lists and counts use. The clients mirror these ids.
KINDS = ('job', 'company', 'govt')


def open_querysets():
    """Return {kind: queryset} of every job a seeker can currently act on, newest first."""
    from apps.careers.models import CareerJob
    from apps.govtjobs.models import GovtJob
    from apps.jobs.models import JobPost

    now = timezone.now()
    return {
        'job': (JobPost.objects.filter(is_active=True)
                .filter(Q(expires_at__isnull=True) | Q(expires_at__gt=now))
                .select_related('company').order_by('-created_at')),
        'company': (CareerJob.objects.filter(is_active=True, source__is_active=True)
                    .select_related('source').order_by('-posted_at', '-first_seen_at')),
        'govt': (GovtJob.objects.filter(is_active=True)
                 .filter(Q(application_deadline__isnull=True) | Q(application_deadline__gt=now))
                 .order_by('-published_at')),
    }


def _keyword_q(words, fields):
    """Q requiring every word to appear (case-insensitively) in at least one of `fields`."""
    q = Q()
    for word in words:
        any_field = Q()
        for f in fields:
            any_field |= Q(**{f'{f}__icontains': word})
        q &= any_field
    return q


def alert_match_querysets(alert):
    """Return {kind: queryset} of open jobs matching a `JobAlert`.

    - `role_keyword`: every word must appear in the job's title or employer name
      ("react developer" matches "Senior React Developer" and "Developer - React").
    - `city`: StepsDoor posts match their `city` field; company jobs match the
      standard city names in `CareerJob.cities` (so "Bangalore" finds Bengaluru jobs).
      Government jobs have no city, so a city filter leaves them out.
    - `job_type` and `salary_min`: only StepsDoor posts carry these, so setting
      either limits the alert to StepsDoor posts.
    An alert with no filters matches every open job.
    """
    from apps.careers.cities import extract_cities

    qs = open_querysets()
    words = (alert.role_keyword or '').split()
    if words:
        qs['job'] = qs['job'].filter(_keyword_q(words, ['title', 'company__name']))
        qs['company'] = qs['company'].filter(_keyword_q(words, ['title', 'source__company_name']))
        qs['govt'] = qs['govt'].filter(_keyword_q(words, ['title', 'organisation']))

    city = (alert.city or '').strip()
    if city:
        canonical = extract_cities(city)
        job_city = Q(city__iexact=city)
        for c in canonical:
            job_city |= Q(city__iexact=c)
        qs['job'] = qs['job'].filter(job_city)
        if canonical:
            company_city = Q()
            for c in canonical:
                company_city |= Q(cities__contains=f'|{c}|')
            qs['company'] = qs['company'].filter(company_city)
        else:
            qs['company'] = qs['company'].filter(location__icontains=city)
        qs['govt'] = qs['govt'].none()

    if alert.job_type:
        qs['job'] = qs['job'].filter(job_type=alert.job_type)
    if alert.salary_min:
        # Same rule as the email digest (apps.alerts.tasks.match_job_alerts).
        qs['job'] = qs['job'].filter(Q(salary_max__gte=alert.salary_min)
                                     | Q(salary_max__isnull=True, salary_min__gte=alert.salary_min))
    if alert.job_type or alert.salary_min:
        qs['company'] = qs['company'].none()
        qs['govt'] = qs['govt'].none()
    return qs


def _sort_date(kind, obj):
    """The date a job is ordered by in mixed lists (posted/published, else first seen)."""
    if kind == 'job':
        return obj.created_at
    if kind == 'company':
        return obj.posted_at or obj.first_seen_at
    return obj.published_at


def describe(kind, obj):
    """Display fields for one job of any kind, as the clients render it.

    Returns {kind, id, title, company, location, apply_url, posted_at, deadline}.
    `apply_url` is where the seeker goes to apply: the company's page for
    StepsDoor posts and company jobs, the official notice for govt jobs.
    """
    if kind == 'job':
        return {'kind': kind, 'id': obj.id, 'title': obj.title, 'company': obj.company.name,
                'location': obj.city, 'apply_url': obj.redirect_url, 'posted_at': obj.created_at, 'deadline': obj.expires_at}
    if kind == 'company':
        from apps.careers.cities import decode_cities
        cities = decode_cities(obj.cities)
        return {'kind': kind, 'id': obj.id, 'title': obj.title, 'company': obj.source.company_name,
                'location': ', '.join(cities) if cities else obj.location, 'apply_url': obj.apply_url,
                'posted_at': obj.posted_at or obj.first_seen_at, 'deadline': None}
    return {'kind': kind, 'id': obj.id, 'title': obj.title, 'company': obj.organisation,
            'location': obj.state or 'Central Govt', 'apply_url': obj.notification_pdf_url or obj.source_url,
            'posted_at': obj.published_at, 'deadline': obj.application_deadline}


def collect_matches(querysets_list, limit):
    """Merge several {kind: queryset} matches into one newest-first list.

    `querysets_list` is one dict per alert (from `alert_match_querysets`); a job
    matching several alerts is counted and listed once. Returns
    {count, counts: {kind: n}, results: [describe(...)] (at most `limit`)}.
    """
    ids = {k: set() for k in KINDS}
    for querysets in querysets_list:
        for kind, qs in querysets.items():
            ids[kind].update(qs.values_list('id', flat=True))
    # The newest `limit` jobs of each alert and kind are enough to fill the merged
    # list; querying them per alert avoids one huge `id IN (...)`.
    seen, candidates = set(), []
    if limit > 0:
        for querysets in querysets_list:
            for kind, qs in querysets.items():
                for obj in qs[:limit]:
                    if (kind, obj.id) not in seen:
                        seen.add((kind, obj.id))
                        candidates.append((kind, obj))
    candidates.sort(key=lambda pair: _sort_date(*pair) or timezone.now(), reverse=True)
    return {
        'count': sum(len(v) for v in ids.values()),
        'counts': {k: len(v) for k, v in ids.items()},
        'results': [describe(kind, obj) for kind, obj in candidates[:limit]],
    }


def start_of_today_ist(now=None):
    """Midnight today in India time (as an aware datetime), the start of "today" for seekers."""
    local = (now or timezone.now()).astimezone(IST)
    return datetime.combine(local.date(), time.min, tzinfo=IST)


def new_today_counts(now=None):
    """Open jobs that appeared on StepsDoor since midnight IST, per kind and in total.

    StepsDoor posts count from creation, company jobs from when StepsDoor first
    saw them, govt jobs from when they were first scraped.
    """
    since = start_of_today_ist(now)
    qs = open_querysets()
    counts = {
        'job': qs['job'].filter(created_at__gte=since).count(),
        'company': qs['company'].filter(first_seen_at__gte=since).count(),
        'govt': qs['govt'].filter(created_at__gte=since).count(),
    }
    counts['total'] = sum(counts.values())
    return counts


# ─── Keyword suggestions for the job alert "Role / Keyword" box ───────────────

def keyword_suggestions(query, limit=8):
    """Role keywords that start with `query`, taken from the titles of open jobs of all three kinds.

    "data" -> "Data Engineer", "Data Analyst", "Data"…, ranked by how many open
    jobs' titles contain them; the phrase rules live in `core.suggestions`.
    Returns [{keyword, count}]. Used by `JobAlertViewSet.suggestions`.
    """
    from core.suggestions import phrase_suggestions
    return phrase_suggestions(query, list(open_querysets().values()), limit)
