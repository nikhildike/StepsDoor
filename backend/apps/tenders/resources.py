from import_export import resources

from .models import Tender, ScraperSource


class TenderResource(resources.ModelResource):
    """
    CSV/Excel import resource for Tender.

    Required columns : source_portal, tender_id, title, organisation, state, published_at, source_url
    Optional columns : description, district, category, estimated_value, document_fee,
                       emd_amount, submission_deadline, opening_date, document_url, is_active

    category choices : civil | it | supply | transport | healthcare | education | defence | power | other
    Dates format     : YYYY-MM-DD  or  YYYY-MM-DD HH:MM:SS

    Duplicate rows (same source_portal + tender_id) are updated, not re-inserted.
    """

    class Meta:
        model = Tender
        import_id_fields = ('source_portal', 'tender_id')
        skip_unchanged = True
        report_skipped = True
        exclude = ('id', 'search_vector', 'created_at', 'updated_at')
        fields = (
            'source_portal', 'tender_id',
            'title', 'description', 'organisation',
            'state', 'district', 'category',
            'estimated_value', 'document_fee', 'emd_amount',
            'published_at', 'submission_deadline', 'opening_date',
            'source_url', 'document_url', 'is_active',
        )


class ScraperSourceResource(resources.ModelResource):
    """
    CSV/Excel import resource for ScraperSource.

    Only ONE column is required:
        url    ← the tender listing page URL

    Everything else is auto-derived:
        source_portal  ← extracted from URL domain
        name           ← set to domain if blank
        spider_name    ← defaults to 'generic_tender'

    Optional columns you can include:
        name, spider_name, state, is_active, notes

    Simplest possible CSV:
        url
        https://mahatenders.gov.in/nicgep/app
        https://eprocure.gov.in/eprocure/app
        https://tenderwizard.com/KERALA

    Duplicate URLs are updated, not re-inserted.
    """

    class Meta:
        model = ScraperSource
        import_id_fields = ('url',)
        skip_unchanged = True
        report_skipped = True
        exclude = ('id', 'source_portal', 'last_scraped_at', 'created_at')
        fields = ('url', 'source_type', 'name', 'spider_name', 'state', 'is_active', 'notes')
