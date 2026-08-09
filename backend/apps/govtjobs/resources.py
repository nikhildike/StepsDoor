from import_export import resources

from .models import GovtJob


class GovtJobResource(resources.ModelResource):
    """
    CSV/Excel import resource for GovtJob.

    Required columns : source_portal, job_id, title, organisation, published_at, source_url
    Optional columns : state, category, qualification, vacancy_count, age_limit, salary_range,
                       application_start, application_deadline, exam_date, notification_pdf_url, is_active

    category choices : civil_services | banking | railway | police | teaching |
                       healthcare | psu | state_govt | other
    state            : leave blank for central govt jobs
    Dates format     : YYYY-MM-DD  or  YYYY-MM-DD HH:MM:SS

    Duplicate rows (same source_portal + job_id) are updated, not re-inserted.
    """

    class Meta:
        model = GovtJob
        import_id_fields = ('source_portal', 'job_id')
        skip_unchanged = True
        report_skipped = True
        exclude = ('id', 'search_vector', 'created_at', 'updated_at')
        fields = (
            'source_portal', 'job_id',
            'title', 'organisation', 'state', 'category',
            'qualification', 'vacancy_count', 'age_limit', 'salary_range',
            'application_start', 'application_deadline', 'exam_date',
            'source_url', 'notification_pdf_url', 'is_active', 'published_at',
        )
