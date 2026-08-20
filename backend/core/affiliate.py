"""Affiliate URL utilities.

Priority for building the final redirect URL:
  1. Explicit affiliate_url stored on the Store model (set by admin — e.g. EarnKaro converted link)
  2. Amazon Associates tag injected for amazon.in / amzn.in URLs
  3. Plain website_url as fallback (Cuelinks JS auto-converts on the web front-end)

Used by `apps.stores.views` (the store "visit"/redirect endpoint) to decide
what URL a job seeker is actually sent to when they click through to a
store's website, so that StepsDoor earns affiliate commission where possible.
"""

from urllib.parse import urlparse, urlencode, urlunparse, parse_qs

from django.conf import settings

# Domains recognised as Amazon India storefronts. Only URLs whose netloc
# matches one of these get the Associates `tag` query param injected —
# other domains fall through to the plain `website_url` fallback.
_AMAZON_DOMAINS = frozenset({
    'www.amazon.in',
    'amazon.in',
    'amzn.in',
    'm.amazon.in',
})


def build_affiliate_url(plain_url: str, affiliate_url: str | None = None) -> str:
    """Return the best available affiliate URL for an outbound store link.

    Called by the store redirect view each time a user clicks through to a
    store's website, so the three-tier priority (explicit affiliate_url →
    Amazon tag injection → plain URL) is evaluated fresh per request rather
    than cached, since `affiliate_url` may change per Store record.
    """
    # Tier 1: admin has already supplied a ready-made affiliate link
    # (e.g. an EarnKaro-converted URL) — always prefer it verbatim.
    if affiliate_url:
        return affiliate_url

    tag = getattr(settings, 'AMAZON_AFFILIATE_TAG', '')
    if tag:
        try:
            parsed = urlparse(plain_url)
            if parsed.netloc in _AMAZON_DOMAINS:
                # Tier 2: rebuild the query string with our Associates tag
                # added (or overwriting any existing `tag` param), preserving
                # any other existing query params on the URL.
                params = parse_qs(parsed.query, keep_blank_values=True)
                params['tag'] = [tag]
                new_query = urlencode({k: v[0] for k, v in params.items()})
                return urlunparse(parsed._replace(query=new_query))
        except Exception:
            # Malformed URL, or anything else that goes wrong while parsing —
            # never let affiliate-link building break the redirect; just
            # fall through to the plain URL below.
            pass

    # Tier 3: no affiliate mechanism applies — return the URL unchanged.
    # (Cuelinks auto-converts eligible links client-side on the web front-end.)
    return plain_url
