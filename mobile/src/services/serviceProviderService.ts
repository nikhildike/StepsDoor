/**
 * services/serviceProviderService.ts
 *
 * Thin wrapper around the shared `api` Axios instance for the local
 * services directory endpoint (`backend/apps/services`) — lawyers,
 * plumbers, mechanics, etc. listed with an address/contact info, curated
 * via Django admin (no self-service owner flow yet). Consumed by the
 * Services tab's screen. Mirrors `backend/apps/services/urls.py`.
 */
import api from './api';

export const serviceProviderService = {
  /**
   * Lists public local service provider listings.
   * @param params - Optional query params: `category` (a `SERVICE_CATEGORIES`
   *   code), `city` (exact match), `search` (icontains across
   *   name/description/address/city).
   * @returns Axios response with a paginated list of service providers.
   * @remarks Used by the Services tab's list screen.
   */
  list: (params?: object) => api.get('/services/', { params }),
};
