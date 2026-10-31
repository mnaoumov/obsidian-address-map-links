import type { SettingDefinitionItem } from 'obsidian';

import { appendCodeBlock } from '@mnaoumov/obsidian-lib/html-element';
import { PluginSettingsTabBase } from '@mnaoumov/obsidian-lib/plugin/plugin-settings-tab';

import type { PluginSettings } from './plugin-settings.ts';

import { MapProvider } from './map-provider.ts';

/**
 * The settings tab is declarative: return one definition per row from `getSettingDefinitionItems()` and
 * Obsidian renders them. `bind` wires a component to a settings property in both directions, so there is
 * no read/write plumbing to maintain.
 */
export class PluginSettingsTab extends PluginSettingsTabBase<PluginSettings> {
  protected override getSettingDefinitionItems(): SettingDefinitionItem[] {
    return [
      this.settingEx({
        desc: createFragment((f) => {
          f.appendText('Which map service an address link opens.');
          f.createEl('br');
          appendCodeBlock(f, 'Google Maps');
          f.appendText(' - Google Maps search. On Android it opens in the Maps app.');
          f.createEl('br');
          appendCodeBlock(f, 'OpenStreetMap');
          f.appendText(' - OpenStreetMap search, in the browser.');
        }),
        name: 'Map provider',
        render: (setting) => {
          setting.addDropdown((dropdown) => {
            dropdown.addOptions({
              [MapProvider.GoogleMaps]: 'Google Maps',
              [MapProvider.OpenStreetMap]: 'OpenStreetMap'
            });
            this.bind({ propertyName: 'mapProvider', valueComponent: dropdown });
          });
        }
      })
    ];
  }
}
