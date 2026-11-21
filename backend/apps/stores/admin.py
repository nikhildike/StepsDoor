# Django admin registration for the `stores` app.
import io

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment
from django.contrib import admin
from django.http import HttpResponse
from django.shortcuts import render
from django.urls import path
from .models import Store, FeaturedLink, FEATURED_LINK_TYPE_CHOICES, FEATURED_LINK_PAGE_CHOICES


@admin.register(Store)
class StoreAdmin(admin.ModelAdmin):
    """Admin config for Store — lets staff review, moderate, and set affiliate links on storefronts."""
    # Columns shown in the admin change list; surfaces the key identifying/moderation fields at a glance.
    list_display = ['name', 'category', 'website_url', 'contact_email', 'is_active', 'created_at']
    # Sidebar filters — category to browse by vertical, is_active to find hidden/moderated stores.
    list_filter = ['category', 'is_active']
    # Fields searched by the admin search box — covers name, contact, and site URL lookups.
    search_fields = ['name', 'contact_email', 'website_url']
    # Server-derived fields shown but not editable — slug is auto-generated in Store.save(),
    # created_at/updated_at are auto-managed timestamps.
    readonly_fields = ['slug', 'created_at', 'updated_at']
    # Group fields into logical sections; "Links" holds the new bulk-link fields so
    # admins can paste shopping/offer URLs without scrolling through the whole form.
    fieldsets = [
        (None, {
            'fields': ['user', 'name', 'slug', 'logo', 'store_type', 'category', 'is_active'],
        }),
        ('URLs & Affiliate', {
            'fields': ['website_url', 'store_locator_url', 'affiliate_url', 'affiliate_network'],
        }),
        ('Shopping & Offer Links', {
            'description': 'Paste one URL per line in each box. Shopping links appear on the store card; Offers links appear in the Special Offers strip on the Shopping page.',
            'fields': ['shopping_links', 'offers_links'],
        }),
        ('Details', {
            'fields': ['description', 'tagline', 'contact_email', 'contact_phone'],
        }),
        ('Verification', {
            'fields': ['gst_number', 'pan_number', 'aadhar_number'],
        }),
        ('Timestamps', {
            'fields': ['created_at', 'updated_at'],
            'classes': ['collapse'],
        }),
    ]


@admin.register(FeaturedLink)
class FeaturedLinkAdmin(admin.ModelAdmin):
    """Admin config for FeaturedLink — lets staff paste standalone offer/shopping links without a Store.

    Includes a custom bulk-upload view reachable via the "Bulk Upload CSV" button
    in the changelist, allowing many links to be created at once from a CSV file.
    """
    # Columns shown in the admin list; surfaces label, type, target page, and active status at a glance.
    list_display = ['label', 'link_type', 'page', 'is_active', 'created_at']
    # Sidebar filters — quickly find offer vs shopping links or filter by page target.
    list_filter = ['link_type', 'page', 'is_active']
    # Search by label or URL.
    search_fields = ['label', 'url']
    # Timestamps are auto-managed — not directly editable.
    readonly_fields = ['created_at', 'updated_at']
    # Bulk actions for quick activate/deactivate without opening each record.
    actions = ['activate_links', 'deactivate_links']

    # --- changelist: inject "Bulk Upload CSV" button into the page context ---

    def changelist_view(self, request, extra_context=None):
        """Inject the bulk-upload URL into the changelist context so the template can render a button."""
        extra_context = extra_context or {}
        extra_context['bulk_upload_url'] = 'bulk-upload/'
        return super().changelist_view(request, extra_context=extra_context)

    # --- custom URL wiring ---------------------------------------------------

    def get_urls(self):
        """Prepend the bulk-upload and example-download URLs before the standard admin URLs."""
        custom = [
            path('bulk-upload/', self.admin_site.admin_view(self.bulk_upload_view),
                 name='stores_featuredlink_bulk_upload'),
            path('bulk-upload/example/', self.admin_site.admin_view(self.download_example_view),
                 name='stores_featuredlink_example'),
        ]
        return custom + super().get_urls()

    # --- valid choice sets (used in both views) ------------------------------

    _VALID_LINK_TYPES = {v for v, _ in FEATURED_LINK_TYPE_CHOICES}
    _VALID_PAGES      = {v for v, _ in FEATURED_LINK_PAGE_CHOICES}

    # --- example XLSX download -----------------------------------------------

    def download_example_view(self, request):
        """Return a pre-filled example XLSX file showing the expected column layout.

        The file has a styled header row plus two sample data rows so admins
        can see exactly what to fill in before doing a real bulk upload.
        """
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = 'Featured Links'

        # Column definitions: (header label, example value 1, example value 2, column width)
        columns = [
            ('url',         'https://bitli.in/example1', 'https://example.com/sale',  40),
            ('label',       'Amazon Great Indian Sale',  'Myntra EORS',               30),
            ('description', 'Flat 40% off on electronics (use code SAVE40)',
                            'End of Reason Sale — up to 80% off fashion', 50),
            ('link_type',   'offer',                     'offer',                      14),
            ('page',        'both',                      'shopping',                   14),
        ]

        header_fill  = PatternFill('solid', fgColor='417690')
        header_font  = Font(color='FFFFFF', bold=True)
        center_align = Alignment(horizontal='center')

        # Write styled header row
        for col_idx, (header, _, _, width) in enumerate(columns, start=1):
            cell = ws.cell(row=1, column=col_idx, value=header)
            cell.fill   = header_fill
            cell.font   = header_font
            cell.alignment = center_align
            ws.column_dimensions[cell.column_letter].width = width

        # Write two example data rows
        for row_idx, val_idx in [(2, 1), (3, 2)]:
            for col_idx, (_, ex1, ex2, _) in enumerate(columns, start=1):
                ws.cell(row=row_idx, column=col_idx, value=ex1 if val_idx == 1 else ex2)

        # Add a notes sheet explaining allowed values
        notes = wb.create_sheet('Notes')
        notes['A1'] = 'Column'
        notes['B1'] = 'Required?'
        notes['C1'] = 'Allowed values'
        notes_data = [
            ('url',         'Yes', 'Any valid URL'),
            ('label',       'Yes', 'Short display title (max 120 chars)'),
            ('description', 'No',  'Optional subtitle/deal detail (max 255 chars)'),
            ('link_type',   'No',  '"offer" or "shopping"  (defaults to form selection if blank)'),
            ('page',        'No',  '"shopping", "retail", or "both"  (defaults to form selection if blank)'),
        ]
        for r, row in enumerate(notes_data, start=2):
            for c, val in enumerate(row, start=1):
                notes.cell(row=r, column=c, value=val)
        for col in ('A', 'B', 'C'):
            notes.column_dimensions[col].width = 55 if col == 'C' else 16

        buffer = io.BytesIO()
        wb.save(buffer)
        buffer.seek(0)

        response = HttpResponse(
            buffer.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = 'attachment; filename="featured_links_example.xlsx"'
        return response

    # --- bulk upload view ----------------------------------------------------

    def bulk_upload_view(self, request):
        """Custom admin view: POST an XLSX file to create multiple FeaturedLink records at once.

        GET  → renders the upload form (bulk_upload.html).
        POST → parses the uploaded XLSX (first sheet), creates FeaturedLink objects
               for valid rows, and re-renders the form with a results summary.
               Skips rows missing required fields rather than aborting the whole upload.

        Expected XLSX columns (first row = header):
          url (required), label (required), description (optional),
          link_type (optional — falls back to form default),
          page (optional — falls back to form default).
        """
        results = None

        if request.method == 'POST':
            xlsx_file        = request.FILES.get('xlsx_file')
            default_type     = request.POST.get('default_link_type', 'offer')
            default_page_val = request.POST.get('default_page', 'both')
            results = {'created': 0, 'skipped': 0, 'errors': []}

            if not xlsx_file:
                results['errors'].append('No file uploaded.')
            else:
                try:
                    wb = openpyxl.load_workbook(xlsx_file, read_only=True, data_only=True)
                    ws = wb.active
                    rows = list(ws.iter_rows(values_only=True))

                    if not rows:
                        results['errors'].append('The file is empty.')
                    else:
                        # First row is always treated as a header row.
                        # Normalise to lowercase stripped strings; None cells become empty string.
                        header = [str(h).strip().lower() if h is not None else '' for h in rows[0]]

                        for row_num, row in enumerate(rows[1:], start=2):
                            # Convert every cell to string, treating None as ''
                            cells = [str(v).strip() if v is not None else '' for v in row]

                            # Skip fully blank rows
                            if not any(cells):
                                continue

                            row_dict = {header[i]: cells[i] if i < len(cells) else ''
                                        for i in range(len(header))}

                            url   = row_dict.get('url', '').strip()
                            label = row_dict.get('label', '').strip()

                            if not url or not label:
                                results['errors'].append(
                                    f'Row {row_num}: missing url or label — skipped.'
                                )
                                results['skipped'] += 1
                                continue

                            link_type = row_dict.get('link_type', '').strip()
                            if link_type not in self._VALID_LINK_TYPES:
                                link_type = default_type

                            page_val = row_dict.get('page', '').strip()
                            if page_val not in self._VALID_PAGES:
                                page_val = default_page_val

                            FeaturedLink.objects.create(
                                url         = url,
                                label       = label[:120],
                                description = row_dict.get('description', '').strip()[:255],
                                link_type   = link_type,
                                page        = page_val,
                                is_active   = True,
                            )
                            results['created'] += 1

                    wb.close()

                except Exception as exc:
                    results['errors'].append(f'Could not parse file: {exc}')

        context = self.admin_site.each_context(request)
        context['results'] = results
        context['title']   = 'Bulk Upload Featured Links'
        return render(request, 'admin/stores/featuredlink/bulk_upload.html', context)

    # --- actions -------------------------------------------------------------

    @admin.action(description='Activate selected featured links')
    def activate_links(self, request, queryset):
        """Set is_active=True on all selected FeaturedLink records."""
        updated = queryset.update(is_active=True)
        self.message_user(request, f'{updated} link(s) activated.')

    @admin.action(description='Deactivate selected featured links')
    def deactivate_links(self, request, queryset):
        """Set is_active=False on all selected FeaturedLink records."""
        updated = queryset.update(is_active=False)
        self.message_user(request, f'{updated} link(s) deactivated.')
