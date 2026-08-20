"""Django admin registration for the `companies` app's `Company` model."""
from django.contrib import admin

from .models import Company


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    """Admin configuration for `Company`.

    Lets staff browse/manage company profiles at
    `/admin/companies/company/` — e.g. to look up a company by name/email
    or verification ID during support or manual account verification.
    """
    # Columns shown in the admin change-list — surfaces contact info without opening each record.
    list_display = ['name', 'contact_email', 'contact_phone', 'created_at']
    # Enables the admin search box to match on company name, contact email, or GSTIN
    # (useful for support staff verifying a company's identity by GST number).
    search_fields = ['name', 'contact_email', 'gst_number']
    # Sidebar filter by creation date (Django's date-hierarchy-style drilldown).
    list_filter = ['created_at']
