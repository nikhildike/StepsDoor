"""Per-ATS readers that turn a company's careers feed into `JobData` records.

One function per ATS, registered in `ADAPTERS` and called by
`apps.careers.sync.sync_source`. All requests go through `PoliteFetcher`
(robots.txt, honest StepsDoorBot UA, ~1 request/second per host).

- Greenhouse and Lever: documented public JSON APIs.
- Workday and Oracle Recruiting Cloud: the JSON endpoints the company's own
  careers page calls. Unofficial, so they may change; a change shows up as
  failed fetches on the source (`last_status`, `consecutive_failures`).

Only jobs located in India are kept, and at most `max_jobs` per company
(newest first where the ATS sorts by date), because large employers list
thousands of jobs worldwide.
"""
import re
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone as dt_timezone

from django.utils import timezone

# Indian place names used to decide whether a free-text location is in India
# (Greenhouse/Lever give only text). Lower-case; matched as whole words.
_INDIA_PLACES = (
    'india ahmedabad bangalore bengaluru bhopal bhubaneswar chandigarh chennai coimbatore delhi '
    'faridabad gandhinagar ghaziabad goa gurgaon gurugram guwahati hyderabad indore jaipur kochi '
    'cochin kolkata lucknow madurai mangalore mumbai mysore mysuru nagpur nashik navi noida patna pune '
    'surat thane thiruvananthapuram trivandrum vadodara visakhapatnam vizag kerala karnataka '
    'maharashtra telangana tamil nadu gujarat rajasthan haryana punjab odisha'
).split()
_INDIA_RE = re.compile(r'\b(' + '|'.join(_INDIA_PLACES) + r')\b', re.I)


class AdapterError(Exception):
    """A feed couldn't be read (HTTP error, robots.txt disallow, unexpected JSON). The fetch is recorded as failed."""


@dataclass
class JobData:
    """One job as read from an ATS, before it's saved as a `CareerJob`."""
    external_id: str  # The ATS's id for the job (unique within the source)
    title: str  # Job title
    apply_url: str  # The job's page on the ATS
    location: str = ''  # Location text
    department: str = ''  # Team / department / job family
    employment_type: str = ''  # Full-time, Intern, ...
    posted_at: datetime | None = None  # Publication time, if the ATS gives one
    posted_is_approx: bool = False  # True when posted_at is derived from relative text ("Posted 3 Days Ago")


def is_india(location):
    """True if free-text `location` names India or an Indian city/state."""
    return bool(_INDIA_RE.search(location or ''))


def _json(resp, what):
    """Return `resp`'s JSON body, raising `AdapterError` for robots disallow, HTTP errors or invalid JSON."""
    if resp is None:
        raise AdapterError(f'{what}: robots.txt disallows StepsDoorBot')
    if resp.status_code != 200:
        raise AdapterError(f'{what}: HTTP {resp.status_code}')
    try:
        return resp.json()
    except ValueError as exc:
        raise AdapterError(f'{what}: response is not JSON') from exc


def _parse_iso(value):
    """Parse an ISO-8601 date/datetime string to an aware datetime (dates become midnight UTC); None if unparseable."""
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(str(value).replace('Z', '+00:00'))
    except ValueError:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=dt_timezone.utc)


def fetch_greenhouse(fetcher, slug, max_jobs):
    """Read a Greenhouse job board (`boards-api.greenhouse.io/v1/boards/<slug>/jobs`)."""
    data = _json(fetcher.get(f'https://boards-api.greenhouse.io/v1/boards/{slug}/jobs'), 'Greenhouse')
    jobs = []
    for j in data.get('jobs', []):
        location = (j.get('location') or {}).get('name', '')
        if not is_india(location):
            continue
        jobs.append(JobData(
            external_id=str(j['id']), title=j.get('title', '').strip(), apply_url=j.get('absolute_url', ''),
            location=location, posted_at=_parse_iso(j.get('first_published') or j.get('updated_at')),
        ))
    jobs.sort(key=lambda x: x.posted_at or timezone.now(), reverse=True)
    return jobs[:max_jobs]


def fetch_lever(fetcher, slug, max_jobs):
    """Read a Lever postings feed (`api.lever.co/v0/postings/<slug>?mode=json`)."""
    data = _json(fetcher.get(f'https://api.lever.co/v0/postings/{slug}?mode=json'), 'Lever')
    if not isinstance(data, list):
        raise AdapterError('Lever: expected a list of postings')
    jobs = []
    for j in data:
        cats = j.get('categories') or {}
        location = cats.get('location') or ', '.join(cats.get('allLocations') or [])
        if j.get('country') != 'IN' and not is_india(location):
            continue
        created = j.get('createdAt')  # milliseconds since the epoch
        jobs.append(JobData(
            external_id=str(j['id']), title=(j.get('text') or '').strip(), apply_url=j.get('hostedUrl', ''),
            location=location, department=cats.get('team', '') or '', employment_type=cats.get('commitment', '') or '',
            posted_at=datetime.fromtimestamp(created / 1000, dt_timezone.utc) if created else None,
        ))
    jobs.sort(key=lambda x: x.posted_at or timezone.now(), reverse=True)
    return jobs[:max_jobs]


_POSTED_DAYS_RE = re.compile(r'(\d+)\+?\s+days?\s+ago', re.I)
_MULTI_LOCATION_RE = re.compile(r'^\s*(\d+)\s+Locations\s*$', re.I)


def workday_location(locations_text, external_path):
    """Return a readable location for a Workday posting.

    Workday writes just "2 Locations" for multi-site jobs; the posting's path
    (`/job/Gurugram-DDC1A/Title_R123`) still names the primary one, so that
    becomes "Gurugram DDC1A (+1 more)" — enough for the city filter.
    """
    m = _MULTI_LOCATION_RE.match(locations_text or '')
    if not m:
        return locations_text or ''
    parts = (external_path or '').split('/')
    primary = parts[2].replace('-', ' ') if len(parts) > 2 and parts[1] == 'job' else ''
    return f'{primary} (+{int(m.group(1)) - 1} more)' if primary else locations_text


def parse_workday_posted(text, now=None):
    """Turn Workday's relative "Posted 3 Days Ago" / "Posted Today" / "Posted 30+ Days Ago" into a datetime (None if unknown)."""
    now = now or timezone.now()
    text = (text or '').lower()
    if 'today' in text:
        return now
    if 'yesterday' in text:
        return now - timedelta(days=1)
    m = _POSTED_DAYS_RE.search(text)
    return now - timedelta(days=int(m.group(1))) if m else None


def _workday_india_facet(facets):
    """Find Workday's India filter in the search facets; returns `(facetParameter, id)` or None.

    Tenants nest country under `locationMainGroup` or expose `locationCountry`
    at the top level, so both levels are searched.
    """
    stack = list(facets or [])
    while stack:
        facet = stack.pop()
        for value in facet.get('values') or []:
            if 'facetParameter' in value:  # a nested facet group
                stack.append(value)
            elif value.get('descriptor') == 'India' and 'country' in facet.get('facetParameter', '').lower():
                return facet['facetParameter'], value['id']
    return None


def fetch_workday(fetcher, slug, max_jobs):
    """Read a Workday careers site via its `/wday/cxs/<tenant>/<site>/jobs` search (slug = 'host/site').

    Uses the site's own country facet to request India jobs only; tenants
    without one fall back to filtering on location text.
    """
    host, site = slug.split('/', 1)
    tenant = host.split('.')[0]
    url = f'https://{host}/wday/cxs/{tenant}/{site}/jobs'
    first = _json(fetcher.post_json(url, {'appliedFacets': {}, 'limit': 1, 'offset': 0, 'searchText': ''}), 'Workday')
    india = _workday_india_facet(first.get('facets'))
    applied = {india[0]: [india[1]]} if india else {}

    jobs, offset, page = [], 0, 20  # Workday serves at most 20 postings per request
    while len(jobs) < max_jobs:
        data = _json(fetcher.post_json(url, {'appliedFacets': applied, 'limit': page, 'offset': offset, 'searchText': ''}),
                     'Workday')
        postings = data.get('jobPostings') or []
        for j in postings:
            path = j.get('externalPath') or ''
            location = workday_location(j.get('locationsText') or (j.get('bulletFields') or ['', ''])[-1], path)
            if not path or (not india and not is_india(location)):
                continue
            jobs.append(JobData(
                external_id=path.rsplit('_', 1)[-1],  # requisition id, e.g. R00374588 (stable across title/location edits)
                title=(j.get('title') or '').strip(), apply_url=f'https://{host}/{site}{path}', location=location,
                posted_at=parse_workday_posted(j.get('postedOn')), posted_is_approx=True,
            ))
        offset += page
        if len(postings) < page:
            break  # last page
    return jobs[:max_jobs]


def fetch_oracle_hcm(fetcher, slug, max_jobs):
    """Read an Oracle Recruiting Cloud site via `recruitingCEJobRequisitions` (slug = 'host/siteNumber').

    Results are sorted newest first and filtered to `PrimaryLocationCountry == 'IN'`.
    Stops after `max_jobs` India jobs or 40 pages, whichever comes first.
    """
    host, site = slug.split('/', 1)
    jobs, offset, page = [], 0, 25
    for _ in range(40):
        url = (f'https://{host}/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true'
               f'&expand=requisitionList.secondaryLocations'
               f'&finder=findReqs;siteNumber={site},limit={page},offset={offset},sortBy=POSTING_DATES_DESC')
        data = _json(fetcher.get(url, headers={'Accept': 'application/json'}), 'Oracle')
        items = data.get('items') or []
        reqs = (items[0].get('requisitionList') if items else None) or []
        for j in reqs:
            if j.get('PrimaryLocationCountry') != 'IN':
                continue
            jobs.append(JobData(
                external_id=str(j['Id']), title=(j.get('Title') or '').strip(),
                apply_url=f'https://{host}/hcmUI/CandidateExperience/en/sites/{site}/job/{j["Id"]}',
                location=j.get('PrimaryLocation') or '', department=j.get('JobFamily') or '',
                employment_type=j.get('JobSchedule') or j.get('WorkerType') or '',
                posted_at=_parse_iso(j.get('PostedDate')),
            ))
        offset += page
        if len(jobs) >= max_jobs or len(reqs) < page:
            break
    return jobs[:max_jobs]


# ats id (CareerSource.Ats value) -> adapter(fetcher, ats_slug, max_jobs) -> list[JobData]
ADAPTERS = {
    'greenhouse': fetch_greenhouse,
    'lever': fetch_lever,
    'workday': fetch_workday,
    'oracle_hcm': fetch_oracle_hcm,
}
