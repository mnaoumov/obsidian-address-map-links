import { MapProvider } from './map-provider.ts';

export class PluginSettings {
  /**
   * Which map service an address link opens.
   */
  public mapProvider = MapProvider.GoogleMaps;
}
