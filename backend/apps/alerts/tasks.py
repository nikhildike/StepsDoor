"""
Celery tasks for the `alerts` app (private job alerts).

`match_job_alerts` runs daily via Celery Beat (`setup_scraper_schedule`) and emails
each job seeker a digest of newly posted company jobs matching their JobAlerts,
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
    Email each job seeker a digest of new JobPosts matching their active JobAlerts.

    Matching per alert (every filter the alert leaves blank is ignored):
      - role_keyword: contained in the job title
      - city: the job's city, case-insensitive
      - job_type: exact (full_time / part_time / contract / internship)
      - salary_min: the job's top of range (salary_max, else salary_min) reaches it;
        jobs that don't state a salary are left out, since they can't be confirmed
    Only active jobs that haven't expired count. Returns the digest counts dict.
    """
    from django.conf import settings
    from django.db.models import Q
    from apps.alerts.models import JobAlert
    from apps.jobs.models import JobPost
    from apps.notifications.alert_emails import AlertKind, DigestItem, inr, send_alert_digests

    now = timezone.now()
    type_labels = dict(JobPost.TYPE_CHOICES)

    def match(alert, since):
        """Live jobs created after `since` that pass every filter the alert sets."""
        qs = (
            JobPost.objects.filter(is_active=True, created_at__gt=since)
            .filter(Q(expires_at__isnull=True) | Q(expires_at__gt=now))
            .select_related('company')
        )
        if alert.role_keyword:
            qs = qs.filter(title__icontains=alert.role_keyword)
        if alert.city:
            qs = qs.filter(city__iexact=alert.city)
        if alert.job_type:
            qs = qs.filter(job_type=alert.job_type)
        if alert.salary_min:
            qs = qs.filter(
                Q(salary_max__gte=alert.salary_min)
                | Q(salary_max__isnull=True, salary_min__gte=alert.salary_min)
            )
        return qs.order_by('-created_at')

    def to_item(job):
        """Digest line: title, then company · city · type · salary range."""
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
        AlertKind(noun='jobs', label='job', user_of=lambda a: a.job_seeker.user, match=match, to_item=to_item),
    )
    logger.info(f"match_job_alerts: {counts}")
    return counts
