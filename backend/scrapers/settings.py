"""
Scrapy settings for the StepsDoor tender scraper project.

Run spiders from backend/ directory:
    scrapy crawl mahatenders -s SCRAPY_SETTINGS_MODULE=scrapers.settings

Docs: https://docs.scrapy.org/en/latest/topics/settings.html
"""

import django
import os

# --- Django bootstrap ---------------------------------------------------- #
# Scrapy's pipelines (scrapers/pipelines.py) need the Django ORM (Tender,
# GovtJob, ScraperLog, ScraperSource models) to persist scraped items and look
# up portal configuration. Django must be fully configured (apps registry
# populated) BEFORE any Scrapy component that imports Django models is loaded
# (e.g. spiders/*.py import `apps.tenders.models.ScraperSource` at parse time),
# so this block runs at import time of this settings module — before Scrapy's
# own settings loading proceeds to SPIDER_MODULES discovery below.
# setdefault(): only sets DJANGO_SETTINGS_MODULE if not already set in the
# environment, so a Celery worker (which already has it set) isn't overridden.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()  # populates Django's app registry so `from apps.x.models import Y` works

BOT_NAME = 'stepsdoor-scraper'

# Package(s) Scrapy scans for spider classes (`scrapy crawl <name>` looks here)
SPIDER_MODULES = ['scrapers.spiders']
# Package used by `scrapy genspider` when creating new spiders via the CLI
NEWSPIDER_MODULE = 'scrapers.spiders'

# Honest User-Agent so portals know who we are.
# Note: RandomUserAgentMiddleware (scrapers/middlewares.py) overrides this
# per-request with a rotating browser UA — this value is effectively just the
# fallback/default Scrapy would use if that middleware were ever disabled.
USER_AGENT = (
    'StepsDoor Tender Aggregator '
    '(+https://stepsdoor.in; contact@stepsdoor.in)'
)

# Government portals publish public procurement data — robots.txt compliance disabled
# so we can access publicly-available tender and job listing pages.
ROBOTSTXT_OBEY = False

# Rate limiting — be polite to government servers
DOWNLOAD_DELAY = 3                  # base delay (seconds) between requests to the same domain
RANDOMIZE_DOWNLOAD_DELAY = True     # jitter DOWNLOAD_DELAY by 0.5x-1.5x to avoid a robotic fixed cadence
CONCURRENT_REQUESTS = 4             # max concurrent requests across all domains
CONCURRENT_REQUESTS_PER_DOMAIN = 2  # max concurrent requests to any single portal

# Disable cookies (most portals don't need them for public listing pages)
COOKIES_ENABLED = False

# Retry failed requests — transient server/network errors get retried automatically
RETRY_ENABLED = True
RETRY_TIMES = 3  # retry up to 3 times before giving up on a request
# HTTP status codes worth retrying: 5xx server errors, 408 request timeout, and
# 429 too many requests (common when a portal starts throttling us)
RETRY_HTTP_CODES = [500, 502, 503, 504, 408, 429]

# Pipelines — both run for every spider; each checks the item's shape (a
# 'tender_id' or 'job_id' key) to decide whether it's the right handler,
# passing items it doesn't own through unchanged. Numbers are execution order
# (lower runs first): TenderPipeline (300) before GovtJobPipeline (301).
ITEM_PIPELINES = {
    'scrapers.pipelines.TenderPipeline':  300,
    'scrapers.pipelines.GovtJobPipeline': 301,
}

# Downloader middlewares — applied to every outgoing request/incoming response
# for every spider. 400 is the priority (position in the middleware chain);
# RandomUserAgentMiddleware rotates the User-Agent header per request.
DOWNLOADER_MIDDLEWARES = {
    'scrapers.middlewares.RandomUserAgentMiddleware': 400,
}

# Feed exports (optional — for debugging)
# FEEDS = { 'tenders.jsonl': { 'format': 'jsonlines' } }

# Pin the request fingerprinting algorithm version (Scrapy 2.7+) so dedup/cache
# fingerprints stay stable across Scrapy upgrades
REQUEST_FINGERPRINTER_IMPLEMENTATION = '2.7'
# Use asyncio's reactor so Scrapy can coexist with other asyncio-based code in the process
TWISTED_REACTOR = 'twisted.internet.asyncioreactor.AsyncioSelectorReactor'
# Ensure scraped text (Devanagari/regional-language content on some portals) round-trips correctly
FEED_EXPORT_ENCODING = 'utf-8'
