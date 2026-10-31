import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import {
  describe,
  expect,
  it
} from 'vitest';

import {
  buildMapUrl,
  MapProvider
} from './map-provider.ts';

describe('buildMapUrl', () => {
  it('builds a Google Maps search URL with the address encoded', () => {
    expect(buildMapUrl(MapProvider.GoogleMaps, 'Ángel Urraza 1201 local 3, Mexico City')).toBe(
      'https://www.google.com/maps/search/?api=1&query=%C3%81ngel%20Urraza%201201%20local%203%2C%20Mexico%20City'
    );
  });

  it('builds an OpenStreetMap search URL with the address encoded', () => {
    expect(buildMapUrl(MapProvider.OpenStreetMap, '10 Downing Street, London & Co')).toBe(
      'https://www.openstreetmap.org/search?query=10%20Downing%20Street%2C%20London%20%26%20Co'
    );
  });

  // A `data.json` written by hand, or by a later version, can hold a provider this version does not know.
  it('throws on a provider it does not know', () => {
    expect(() => buildMapUrl(castTo<MapProvider>('bing'), 'London')).toThrow('Unknown map provider: bing.');
  });
});
