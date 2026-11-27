/**
 * navigation/jobLinks.ts
 *
 * Opening a job of any kind from screens outside the Jobs tab (SavedJobsScreen,
 * the alert matches on AlertsScreen — both root-stack screens):
 * - 'job' (StepsDoor post) and 'govt' jobs have detail screens on the Jobs stack;
 * - 'company' jobs live on the company's own site, so they open in the browser.
 * Applying to a StepsDoor post records the click for the company's analytics first.
 */
import { Linking } from 'react-native';
import { jobService } from '@/services/jobService';
import { JobKind } from '@/services/seekerService';

/** Root-stack navigate target for a job's detail screen, or null for company jobs (no detail screen). */
export function jobDetailRoute(kind: JobKind, id: number) {
  if (kind === 'job') return { screen: 'Jobs', params: { screen: 'JobDetail', params: { jobId: id } } };
  if (kind === 'govt') return { screen: 'Jobs', params: { screen: 'GovtJobDetail', params: { jobId: id } } };
  return null;
}

/**
 * Open a job: its detail screen when it has one, otherwise `applyUrl` in the browser.
 * @param navigation - A root-stack navigation object (e.g. SavedJobsScreen's prop).
 */
export function openJob(navigation: { navigate: (name: string, params?: object) => void }, kind: JobKind, id: number, applyUrl: string) {
  const route = jobDetailRoute(kind, id);
  if (route) navigation.navigate('App', route);
  else Linking.openURL(applyUrl);
}

/**
 * Open where the seeker applies. StepsDoor posts go through click tracking
 * (falling back to the stored URL if that fails); other kinds open directly.
 */
export async function applyToJob(kind: JobKind, id: number, applyUrl: string) {
  if (kind !== 'job') {
    await Linking.openURL(applyUrl);
    return;
  }
  try {
    const { data } = await jobService.trackClick(id);
    await Linking.openURL(data.redirect_url || applyUrl);
  } catch {
    await Linking.openURL(applyUrl);
  }
}
