/**
 * services/storeService.ts
 *
 * Thin wrapper around the shared `api` Axios instance for the store/shopping
 * endpoints (`backend/apps/stores`): public storefront listings (general and
 * retail-specific) and click-tracking. Consumed by the Shopping screen.
 * Mirrors `frontend/src/services/storeService.js`.
 */
import api from './api';

export const storeService = {
  /**
   * Lists public storefront subscribers (online shopping stores).
   * @param params - Optional filter/search/pagination query params.
   * @returns Axios response with a paginated list of stores.
   * @remarks Used by the Shopping screen's "Featured Stores" section.
   */
  list: (params?: object) => api.get('/stores/', { params }),

  /**
   * Records a click-through and returns the best affiliate redirect URL.
   * @param id - Store's numeric id.
   * @returns Axios response with `{ redirect_url }`.
   * @remarks Called before opening a subscribed store's website so analytics
   * stay accurate; falls back to the raw `website_url` on error.
   */
  click: (id: number) => api.post(`/stores/${id}/click/`),
};
