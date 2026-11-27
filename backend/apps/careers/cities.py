"""Standard Indian city names pulled out of free-text job locations.

ATS location text varies wildly ("Bangalore, Karnataka, India", "IND Thane -
11th Floor", "1401-G-India: Floor 1 to 12, Hafeezpet Phoenix, Hyderabad"), so
`sync_source` stores each job's cities in `CareerJob.cities` using
`extract_cities`, and the API's `city` filter and `/cities/` list use that.
Locations that name only a state or "India" get no city.
"""
import re

# Canonical city -> other spellings seen in ATS feeds (lower-case). The
# canonical name itself always matches too.
CITY_ALIASES = {
    'Ahmedabad': ['amdavad'],
    'Bengaluru': ['bangalore', 'bengalore', 'bangaluru'],
    'Bhopal': [],
    'Bhubaneswar': ['bhubaneshwar'],
    'Chandigarh': ['mohali', 'panchkula'],
    'Chennai': ['madras'],
    'Coimbatore': [],
    'Delhi': ['new delhi', 'delhi ncr'],
    'Faridabad': [],
    'Ghaziabad': [],
    'Goa': ['panaji', 'margao', 'vasco da gama'],
    'Gurugram': ['gurgaon'],
    'Guwahati': [],
    'Hyderabad': ['secunderabad', 'hitec city', 'gachibowli'],
    'Indore': [],
    'Jabalpur': [],
    'Jaipur': [],
    'Jamshedpur': [],
    'Kochi': ['cochin', 'ernakulam'],
    'Kolkata': ['calcutta'],
    'Kozhikode': ['calicut'],
    'Lucknow': [],
    'Ludhiana': [],
    'Madurai': [],
    'Mangaluru': ['mangalore'],
    'Mumbai': ['bombay', 'andheri', 'powai', 'goregaon', 'malad', 'vikhroli', 'bkc'],
    'Mysuru': ['mysore'],
    'Nagpur': [],
    'Nashik': ['nasik'],
    'Navi Mumbai': ['airoli', 'vashi', 'ghansoli', 'belapur', 'rabale', 'mahape'],
    'Noida': ['greater noida'],
    'Patna': [],
    'Pune': ['hinjewadi', 'hinjawadi', 'kharadi', 'magarpatta', 'pimpri', 'chinchwad'],
    'Raipur': [],
    'Rajkot': [],
    'Ranchi': [],
    'Surat': [],
    'Thane': [],
    'Thiruvananthapuram': ['trivandrum', 'technopark'],
    'Tiruchirappalli': ['trichy', 'tiruchirapalli'],
    'Vadodara': ['baroda'],
    'Vijayawada': [],
    'Visakhapatnam': ['vizag', 'vishakhapatnam'],
    'Gandhinagar': ['gift city'],
    'Dehradun': [],
    'Kanpur': [],
    'Aurangabad': ['chhatrapati sambhajinagar'],
    'Varanasi': ['banaras'],
    'Aligarh': [],
    'Sonipat': ['sonepat'],
    'Panipat': [],
}

# (spelling, canonical) pairs, longest spelling first so "navi mumbai" and
# "greater noida" win over "mumbai" / "noida" at the same position.
_SPELLINGS = sorted(
    [(c.lower(), c) for c in CITY_ALIASES] + [(a, c) for c, aliases in CITY_ALIASES.items() for a in aliases],
    key=lambda pair: -len(pair[0]),
)
_CITY_RE = re.compile(r'\b(' + '|'.join(re.escape(s) for s, _ in _SPELLINGS) + r')\b', re.I)
_CANONICAL = {s: c for s, c in _SPELLINGS}

# The canonical names, alphabetical — e.g. for documentation or a static picker.
CITIES = sorted(CITY_ALIASES)


def extract_cities(location):
    """Return the canonical cities named in `location`, in order of appearance, without duplicates.

    >>> extract_cities('INDIA - DELHI - New Delhi')
    ['Delhi']
    >>> extract_cities('Navi Mumbai, Maharashtra')
    ['Navi Mumbai']
    """
    found = []
    for m in _CITY_RE.finditer(location or ''):
        city = _CANONICAL[m.group(1).lower()]
        if city not in found:
            found.append(city)
    return found


def encode_cities(cities):
    """Store a city list as '|Bengaluru|Pune|' so `cities__contains='|Pune|'` matches whole names on any database."""
    return '|' + '|'.join(cities) + '|' if cities else ''


def decode_cities(value):
    """Inverse of `encode_cities`: '|Bengaluru|Pune|' -> ['Bengaluru', 'Pune']."""
    return [c for c in (value or '').split('|') if c]
