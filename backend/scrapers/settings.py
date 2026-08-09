"""
Scrapy settings for the Linksdoor tender scraper project.

Run spiders from backend/ directory:
    scrapy crawl mahatenders -s SCRAPY_SETTINGS_MODULE=scrapers.settings

Docs: https://docs.scrapy.org/en/latest/topics/settings.html
"""

import django
import os

# Bootstrap Django so pipelines can use the ORM
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

BOT_NAME = 'linksdoor-scraper'

SPIDER_MODULES = ['scrapers.spiders']
NEWSPIDER_MODULE = 'scrapers.spiders'

# Honest User-Agent so portals know who we are
USER_AGENT = (
    'Linksdoor Tender Aggregator '
    '(+https://linksdoor.in; contact@linksdoor.in)'
)

# Government portals publish public procurement data — robots.txt compliance disabled
# so we can access publicly-available tender and job listing pages.
ROBOTSTXT_OBEY = False

# Rate limiting — be polite to government servers
DOWNLOAD_DELAY = 3
RANDOMIZE_DOWNLOAD_DELAY = True
CONCURRENT_REQUESTS = 4
CONCURRENT_REQUESTS_PER_DOMAIN = 2

# Disable cookies (most portals don't need them for public listing pages)
COOKIES_ENABLED = False

# Retry failed requests
RETRY_ENABLED = True
RETRY_TIMES = 3
RETRY_HTTP_CODES = [500, 502, 503, 504, 408, 429]

# Pipelines — both run; each checks spider name to decide whether to process
ITEM_PIPELINES = {
    'scrapers.pipelines.TenderPipeline':  300,
    'scrapers.pipelines.GovtJobPipeline': 301,
}

# Middlewares
DOWNLOADER_MIDDLEWARES = {
    'scrapers.middlewares.RandomUserAgentMiddleware': 400,
}

# Feed exports (optional — for debugging)
# FEEDS = { 'tenders.jsonl': { 'format': 'jsonlines' } }

REQUEST_FINGERPRINTER_IMPLEMENTATION = '2.7'
TWISTED_REACTOR = 'twisted.internet.asyncioreactor.AsyncioSelectorReactor'
FEED_EXPORT_ENCODING = 'utf-8'
