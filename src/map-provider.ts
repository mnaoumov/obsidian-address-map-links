/**
 * Which map service an address link opens.
 */
export enum MapProvider {
  /**
   * Google Maps. On Android the system hands its URL to the Maps app.
   */
  GoogleMaps = 'googleMaps',

  /**
   * OpenStreetMap's search.
   */
  OpenStreetMap = 'openStreetMap'
}

/**
 * Builds the URL that searches a map service for an address.
 *
 * @param provider - The map service.
 * @param query - The address, as one line of text.
 * @returns The URL.
 */
export function buildMapUrl(provider: MapProvider, query: string): string {
  const encodedQuery = encodeURIComponent(query);
  switch (provider) {
    case MapProvider.GoogleMaps: {
      return `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;
    }
    case MapProvider.OpenStreetMap: {
      return `https://www.openstreetmap.org/search?query=${encodedQuery}`;
    }
    default: {
      throw new Error(`Unknown map provider: ${String(provider)}.`);
    }
  }
}
