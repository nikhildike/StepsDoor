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
   * Lists public retail-chain storefront subscribers.
   * @param params - Optional filter/search/pagination query params.
   * @returns Axios response with a paginated list of retail stores.
   * @remarks Used by the Retail Stores screen's "Featured Stores" section.
   */
  listRetail: (params?: object) => api.get('/stores/retail/', { params }),

  /**
   * Records a click-through and returns the best affiliate redirect URL.
   * @param id - Store's numeric id.
   * @returns Axios response with `{ redirect_url }`.
   * @remarks Called before opening a subscribed store's website so analytics
   * stay accurate; falls back to the raw `website_url` on error.
   */
  click: (id: number) => api.post(`/stores/${id}/click/`),

  /**
   * Lists active admin-curated standalone featured links (not tied to any Store).
   * @param params - Optional filters: `page` ('shopping'|'retail'|'both'), `type` ('offer'|'shopping').
   * @returns Axios response with a list of FeaturedLink objects.
   * @remarks Used by Shopping and Retail screens to merge into the Special Offers modal.
   */
  listFeaturedLinks: (params?: object) => api.get('/stores/featured-links/', { params }),
};
