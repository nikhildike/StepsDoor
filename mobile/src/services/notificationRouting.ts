/**
 * notificationRouting.ts
 *
 * Maps a tapped push notification's `data` payload to the screen it should
 * open. Pure (no navigation or Expo imports) so it's unit-testable; applied by
 * `hooks/useNotifications.ts` through `navigationRef`.
 *
 * The backend (apps.notifications.alert_emails._push_digest) sends alert
 * digests as `{ type: 'alert_digest', kind, count, id }` where `kind` is
 * 'tender' | 'govt_job' | 'job' and `id` is set only when exactly one listing
 * matched — then the listing opens directly, otherwise its list does. A job
 * digest mixes StepsDoor posts and company careers jobs, so its list is the
 * Alerts screen (every alert's matching jobs); `id` is only sent for a single
 * StepsDoor post, since company jobs have no screen in the app.
 */

/** A root-navigator target: `navigationRef.navigate(route.name, route.params)`. */
export interface NotificationRoute {
  name: string;
  params?: Record<string, unknown>;
}

/**
 * Returns the route for a notification's data, or null for payloads this app
 * version doesn't recognise (tapping just opens the app where it was).
 * Routes go through the root stack → `App` tabs → the tab's stack screen.
 */
export function routeForNotification(data: Record<string, unknown> | null | undefined): NotificationRoute | null {
  if (!data || data.type !== 'alert_digest') return null;
  const id = typeof data.id === 'number' ? data.id : null;

  switch (data.kind) {
    case 'tender':
      return {
        name: 'App',
        params: id
          ? { screen: 'Tenders', params: { screen: 'TenderDetail', params: { tenderId: id } } }
          : { screen: 'Tenders', params: { screen: 'TendersList' } },
      };
    case 'govt_job':
      return {
        name: 'App',
        params: id
          ? { screen: 'Jobs', params: { screen: 'GovtJobDetail', params: { jobId: id } } }
          : { screen: 'Jobs', params: { screen: 'Home', params: { segment: 'govtJobs' } } },
      };
    case 'job':
      return id
        ? { name: 'App', params: { screen: 'Jobs', params: { screen: 'JobDetail', params: { jobId: id } } } }
        : { name: 'Alerts' }; // root-stack screen listing each alert's matches
    default:
      return null;
  }
}
