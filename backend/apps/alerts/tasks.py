"""
Celery tasks for the `alerts` app (private job alerts).

`match_job_alerts` runs daily via Celery Beat (`setup_scraper_schedule`) and emails
each job seeker a digest of new StepsDoor posts and company careers-page jobs
matching their JobAlerts,
using the same engine as the tender/govt-job alert emails
(`apps.notifications.alert_emails.send_alert_digests`).
"""
import logging

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task
def match_job_alerts():
    """
    Email (and push) each job seeker one daily digest of new jobs matching their active JobAlerts:
    StepsDoor job posts and openings from company careers pages (apps.careers).

    Matching is the same as the jobs listed under each alert on the site
    (`apps.jobseekers.listings.alert_match_querysets`): every keyword word in the
    title or employer; city by standard city name; job type / minimum salary only
    exist on StepsDoor posts, so setting either leaves company jobs out. "New" means
    posted on StepsDoor (`created_at`) or first seen on the company's feed
    (`first_seen_at`) since the alert was last checked. Government jobs are left
    out here: they have their own alerts and digest (`match_govtjob_alerts`), so a
    job is never emailed twice. Returns the digest counts dict.
    """
    from django.conf import settings
    from apps.alerts.models import JobAlert
    from apps.careers.cities import decode_cities
    from apps.careers.models import CareerJob
    from apps.jobs.models import JobPost
    from apps.jobseekers.listings import alert_match_querysets
    from apps.notifications.alert_emails import AlertKind, DigestItem, inr, send_alert_digests

    type_labels = dict(JobPost.TYPE_CHOICES)

    def match(alert, since):
        """New open StepsDoor posts, then new company careers jobs, matching the alert."""
        qs = alert_match_querysets(alert)
        return (list(qs['job'].filter(created_at__gt=since))
                + list(qs['company'].filter(first_seen_at__gt=since).order_by('-first_seen_at')))

    def key_of(listing):
        """JobPost and CareerJob ids can collide, so the dedup key includes the kind."""
        return ('company' if isinstance(listing, CareerJob) else 'job', listing.pk)

    def push_id_of(listing):
        """A tapped push opens a single StepsDoor post directly; company jobs have no app screen, so the app opens Alerts."""
        return None if isinstance(listing, CareerJob) else listing.pk

    def to_item(job):
        """Digest line. StepsDoor post: title, then company · city · type · salary range,
        linking to its StepsDoor page. Company job: company · cities, linking to the
        company's own posting."""
        if isinstance(job, CareerJob):
            cities = decode_cities(job.cities)
            details = [job.source.company_name, ', '.join(cities) if cities else job.location, 'company careers page']
            return DigestItem(title=job.title, url=job.apply_url, details=' · '.join(d for d in details if d))
        details = [job.company.name, job.city, type_labels.get(job.job_type, job.job_type)]
        if job.salary_min and job.salary_max:
            details.append(f'{inr(job.salary_min)}–{inr(job.salary_max)}')
        elif job.salary_min or job.salary_max:
            details.append(inr(job.salary_min or job.salary_max))
        return DigestItem(
            title=job.title,
            url=f'{settings.FRONTEND_URL}/jobs/{job.pk}',
            details=' · '.join(d for d in details if d),
        )

    counts = send_alert_digests(
        JobAlert.objects.filter(is_active=True).select_related('job_seeker__user'),
        AlertKind(noun='jobs', label='job', user_of=lambda a: a.job_seeker.user, match=match, to_item=to_item,
                  push_kind='job', key_of=key_of, push_id_of=push_id_of),
    )
    logger.info(f"match_job_alerts: {counts}")
    return counts
