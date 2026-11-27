"""Keyword suggestions from listing titles, for alert forms' keyword autocomplete.

Shared by job alerts (`apps.jobseekers.listings.keyword_suggestions` — StepsDoor
posts, company careers jobs, govt jobs) and tender alerts
(`apps.tenders.listings.keyword_suggestions`). Suggests the 1–3 word phrases
inside open listings' titles that begin with what was typed, ranked by how many
titles contain them, so a user picks a keyword that actually finds listings.
"""
import re
from collections import Counter

# Title punctuation that separates ideas ("Key Account Manager - Operations",
# "Analyst, BI, Reporting"); suggested phrases never span one.
_SEGMENT_SPLIT = re.compile(r'[,\-–—()/\|:;_&@!?"\'\[\]{}·•]+|\s\.\s|\.(?=[A-Z])')
_TOKEN = re.compile(r'[A-Za-z0-9][A-Za-z0-9+#]*')  # words like "C++", "C#"; a lone "+" isn't a word
# Numbers and grade/band/lot codes some publishers append ("Data Engineer 4B", "... 2036").
_CODE = re.compile(r'^\d+[a-z]{0,2}$')
# Words a suggestion shouldn't start or end with.
_EDGE_STOPWORDS = {'and', 'or', 'of', 'the', 'for', 'in', 'on', 'at', 'to', 'with', 'a', 'an', 'by', 'from', 'i', 'ii', 'iii', 'iv'}
_MAX_PHRASE_WORDS = 3
_TITLES_PER_QUERYSET = 5000  # enough to rank phrases; keeps one keystroke's query cheap


def _phrases(title):
    """Yield (lowercase phrase, phrase as written) for every 1–3 word run inside one title segment."""
    for segment in _SEGMENT_SPLIT.split(title):
        tokens = _TOKEN.findall(segment)
        for i in range(len(tokens)):
            for n in range(1, _MAX_PHRASE_WORDS + 1):
                words = tokens[i:i + n]
                if len(words) < n:
                    break
                first, last = words[0].lower(), words[-1].lower()
                if first in _EDGE_STOPWORDS or last in _EDGE_STOPWORDS or _CODE.match(first) or _CODE.match(last):
                    continue
                if n > 1 and len(last) == 1:
                    continue  # "JAVA N", "Manager I"; a single "C" or "R" on its own is kept
                written = ' '.join(words)
                yield written.lower(), written


def phrase_suggestions(query, querysets, limit=8):
    """Phrases from the `title` of rows in `querysets` that start with `query`, most common first.

    `querysets` are querysets of open listings with a `title` field. Each phrase
    is shown the way it's most often written; `count` is how many titles contain
    it. Returns [{keyword, count}] (at most `limit`; [] for fewer than 2 characters).
    """
    q = ' '.join(query.lower().split())
    if len(q) < 2:
        return []
    first_word = q.split()[0]
    titles = []
    for qs in querysets:
        titles += qs.filter(title__icontains=first_word).values_list('title', flat=True)[:_TITLES_PER_QUERYSET]

    with_phrase = Counter()  # phrase -> number of titles containing it
    spellings = {}           # phrase -> Counter of how it's written
    for title in titles:
        seen = set()
        for lower, written in _phrases(title):
            if not lower.startswith(q) or lower in seen:
                continue
            seen.add(lower)
            with_phrase[lower] += 1
            spellings.setdefault(lower, Counter())[written] += 1

    ranked = sorted(with_phrase.items(), key=lambda kv: (-kv[1], len(kv[0]), kv[0]))[:limit]
    return [{'keyword': spellings[p].most_common(1)[0][0], 'count': n} for p, n in ranked]
