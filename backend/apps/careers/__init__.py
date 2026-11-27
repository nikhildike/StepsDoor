"""Private-company careers pages (scraped private jobs).

Kept apart from `apps.govtjobs` on purpose: government jobs are members-only
scraped data keyed by recruiter spiders, while this app will hold jobs read
from private companies' own careers pages / ATS feeds. For now it only
contains the ATS classifier (`ats.py` + `classify_careers_ats` command) used
to decide which adapters are worth building.
"""
