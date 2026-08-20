"""
Scrapy middlewares for the StepsDoor scraper.

Registered in scrapers/settings.py under DOWNLOADER_MIDDLEWARES. Downloader
middlewares sit between the Scrapy engine and the downloader, and can modify
every outgoing Request (process_request) and/or incoming Response
(process_response) for every spider in this project (generic_tender,
generic_govtjob, mahatenders, ...).
"""
import random


# Pool of realistic, current browser User-Agent strings (mix of Chrome/Firefox on
# Windows/Mac/Linux) used to rotate the outgoing User-Agent header per request, so
# government portals see varied, "human-looking" traffic instead of one static
# scraper signature — reduces the risk of the IP/UA being blocked or rate-limited.
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
]


class RandomUserAgentMiddleware:
    """
    Downloader middleware that assigns a random User-Agent header to every
    outgoing request, overriding the static USER_AGENT set in scrapers/settings.py.

    Applies to all spiders in this project since it's registered globally in
    ITEM_PIPELINES-adjacent DOWNLOADER_MIDDLEWARES (scrapers/settings.py), not
    per-spider. Runs automatically for every request Scrapy sends, whether
    triggered by `scrapy crawl <spider_name>` or by the Celery scrape_portal task.
    """

    def process_request(self, request, spider):
        """
        Downloader-middleware hook invoked by the Scrapy engine for every
        outgoing Request just before it reaches the downloader. Mutates the
        request's User-Agent header in place; returns None (per Scrapy's
        process_request contract) so the engine continues processing the
        request normally (no request/response short-circuit).
        """
        request.headers['User-Agent'] = random.choice(USER_AGENTS)
