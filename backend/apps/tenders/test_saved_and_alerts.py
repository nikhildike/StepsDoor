"""Tests for saving tenders, tenders matching an alert, keyword suggestions and contractor stats.

The tender counterparts of the job seeker features (`apps.jobseekers.tests`):
`/api/tenders/saved/`, `/api/tenders/alerts/{id}/matches/`, `/api/tenders/alerts/matches/`,
`/api/tenders/alerts/suggestions/` and `/api/tenders/stats/`.
"""
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.tenders.listings import start_of_today_ist
from apps.tenders.models import SavedTender, Tender, TenderAlert

User = get_user_model()


def make_tender(tender_id, title, **kw):
    """An open Haryana works tender closing in 5 days, unless overridden."""
    fields = dict(source_portal='etenders.hry.nic.in', tender_id=tender_id, title=title, organisation='PWD B&R Karnal',
                  state='Haryana', category='works', published_at=timezone.now(),
                  submission_deadline=timezone.now() + timedelta(days=5),
                  source_url='https://etenders.hry.nic.in/nicgep/app')
    fields.update(kw)
    return Tender.objects.create(**fields)


class TenderSeekerTestCase(TestCase):
    """A contractor, some open tenders and a closed one."""

    def setUp(self):
        self.road = make_tender('2026_HRY_1_1', 'Repair of roads, Ward 8', estimated_value=2500000)
        self.road2 = make_tender('2026_HRY_2_1', 'Road construction Sector 12', estimated_value=9000000,
                                 submission_deadline=timezone.now() + timedelta(days=2))
        self.drain = make_tender('2026_PB_3_1', 'Storm water drain cleaning', state='Punjab', category='services')
        self.closed = make_tender('2026_HRY_4_1', 'Road widening (closed)', submission_deadline=timezone.now() - timedelta(days=1))
        self.user = User.objects.create_user(username='firm', email='firm@example.com', password='x', is_contractor=True)
        self.api = APIClient()
        self.api.force_authenticate(self.user)

    def alert(self, **fields):
        """A tender alert for the signed-in contractor."""
        return TenderAlert.objects.create(user=self.user, **fields)


class SavedTenderTests(TenderSeekerTestCase):
    """Bookmarking tenders."""

    def test_save_list_and_unsave(self):
        """A save returns 201 with the tender's card fields; saving again is a 200 with the same id; delete removes it."""
        first = self.api.post('/api/tenders/saved/', {'tender': self.road.id}, format='json')
        again = self.api.post('/api/tenders/saved/', {'tender': self.road.id}, format='json')
        self.assertEqual((first.status_code, again.status_code), (201, 200))
        self.assertEqual(first.data['id'], again.data['id'])
        self.assertEqual(first.data['details']['title'], 'Repair of roads, Ward 8')
        self.assertTrue(first.data['is_open'])

        listed = self.api.get('/api/tenders/saved/').data
        self.assertEqual([s['tender'] for s in listed], [self.road.id])
        self.assertEqual(self.api.delete(f"/api/tenders/saved/{first.data['id']}/").status_code, 204)
        self.assertEqual(SavedTender.objects.count(), 0)

    def test_closed_tender_shows_closed_and_lists_are_private(self):
        """A closed tender stays saved with is_open False; other users see only their own."""
        self.api.post('/api/tenders/saved/', {'tender': self.closed.id}, format='json')
        self.assertFalse(self.api.get('/api/tenders/saved/').data[0]['is_open'])
        other = APIClient()
        other.force_authenticate(User.objects.create_user(username='b', email='b@example.com', password='x'))
        self.assertEqual(other.get('/api/tenders/saved/').data, [])
        self.assertEqual(APIClient().get('/api/tenders/saved/').status_code, 401)


class TenderAlertMatchTests(TenderSeekerTestCase):
    """Open tenders listed under an alert."""

    def titles(self, data):
        """Titles of a matches response, in order."""
        return [t['title'] for t in data['results']]

    def test_every_keyword_word_soonest_closing_first(self):
        """'road' matches both open road tenders (soonest deadline first), not the closed one."""
        data = self.api.get(f'/api/tenders/alerts/{self.alert(keyword="road").id}/matches/').data
        self.assertEqual(self.titles(data), ['Road construction Sector 12', 'Repair of roads, Ward 8'])
        self.assertEqual(data['count'], 2)
        data = self.api.get(f'/api/tenders/alerts/{self.alert(keyword="road repair").id}/matches/').data
        self.assertEqual(self.titles(data), ['Repair of roads, Ward 8'])

    def test_keyword_matches_organisation_and_filters_apply(self):
        """Words may match the organisation; state, category and minimum value narrow the list."""
        self.assertEqual(self.api.get(f'/api/tenders/alerts/{self.alert(keyword="pwd karnal").id}/matches/').data['count'], 3)
        punjab = self.alert(state='punjab')
        self.assertEqual(self.titles(self.api.get(f'/api/tenders/alerts/{punjab.id}/matches/').data),
                         ['Storm water drain cleaning'])
        big = self.alert(min_value=5000000)
        self.assertEqual(self.titles(self.api.get(f'/api/tenders/alerts/{big.id}/matches/').data),
                         ['Road construction Sector 12'])

    def test_all_matches_lists_each_tender_once(self):
        """Overlapping active alerts list a tender once; paused alerts don't count."""
        self.alert(keyword='road')
        self.alert(keyword='construction')
        self.alert(keyword='drain', is_active=False)
        data = self.api.get('/api/tenders/alerts/matches/').data
        self.assertEqual(data['count'], 2)
        self.assertEqual(len(data['results']), 2)

    def test_other_users_alert_is_404(self):
        """Matches are only for the alert's owner."""
        alert = self.alert(keyword='road')
        other = APIClient()
        other.force_authenticate(User.objects.create_user(username='b', email='b@example.com', password='x'))
        self.assertEqual(other.get(f'/api/tenders/alerts/{alert.id}/matches/').status_code, 404)


class TenderKeywordSuggestionTests(TenderSeekerTestCase):
    """Keyword autocomplete for tender alerts."""

    def test_phrases_from_open_tender_titles(self):
        """Phrases starting with the text, most common first; closed tenders don't count; 1 character gives nothing."""
        suggestions = self.api.get('/api/tenders/alerts/suggestions/', {'q': 'road'}).data
        self.assertEqual(suggestions[0], {'keyword': 'Road', 'count': 1})
        self.assertIn({'keyword': 'Road construction', 'count': 1}, suggestions)
        self.assertNotIn('Road widening', [s['keyword'] for s in suggestions])
        self.assertIn({'keyword': 'Storm water drain', 'count': 1},
                      self.api.get('/api/tenders/alerts/suggestions/', {'q': 'storm'}).data)
        self.assertEqual(self.api.get('/api/tenders/alerts/suggestions/', {'q': 'r'}).data, [])


class TenderStatsTests(TenderSeekerTestCase):
    """The contractor dashboard's stat cards."""

    def test_stats(self):
        """Saved, active alerts, unique matches, new today and open tenders."""
        self.api.post('/api/tenders/saved/', {'tender': self.road.id}, format='json')
        self.alert(keyword='road')
        self.alert(keyword='drain', is_active=False)
        Tender.objects.filter(id=self.drain.id).update(created_at=start_of_today_ist() - timedelta(minutes=5))
        self.assertEqual(self.api.get('/api/tenders/stats/').data, {
            'saved_tenders': 1, 'active_alerts': 1, 'alert_matches': 2, 'new_today': 2, 'open_tenders': 3,
        })
        self.assertEqual(APIClient().get('/api/tenders/stats/').status_code, 401)
