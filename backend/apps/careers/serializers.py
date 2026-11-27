"""Serializers for the members-only careers jobs API (`/api/careers/`)."""
from rest_framework import serializers

from .cities import decode_cities
from .models import CareerJob, CareerSource


class CareerJobSerializer(serializers.ModelSerializer):
    """One active private-company job, as listed on the Companies page's "Latest openings" section."""
    company_name = serializers.CharField(source='source.company_name', read_only=True)  # Employer name
    company_id = serializers.IntegerField(source='source.id', read_only=True)  # CareerSource id, for the company filter
    sector = serializers.CharField(source='source.sector', read_only=True)  # Employer's directory sector
    cities = serializers.SerializerMethodField()  # Standard city names found in `location` (may be empty)

    class Meta:
        model = CareerJob
        fields = ['id', 'title', 'company_name', 'company_id', 'sector', 'location', 'cities', 'department',
                  'employment_type', 'apply_url', 'posted_at', 'first_seen_at']

    def get_cities(self, job):
        """Decode the stored '|Bengaluru|Pune|' value into a list."""
        return decode_cities(job.cities)


class CareerCompanySerializer(serializers.ModelSerializer):
    """A company with open jobs, for the company filter dropdown (`/api/careers/jobs/companies/`)."""
    job_count = serializers.IntegerField(read_only=True)  # Active jobs (annotated in the view)

    class Meta:
        model = CareerSource
        fields = ['id', 'company_name', 'sector', 'careers_url', 'job_count']
