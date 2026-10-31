import type { DataHandler } from '@mnaoumov/obsidian-lib/data-handler';
import type { PluginEventMap } from '@mnaoumov/obsidian-lib/plugin/plugin-event-source';
import type { SettingGroup } from 'obsidian';

import { SettingEx } from '@mnaoumov/obsidian-lib/setting-ex';
import { AsyncEvents } from '@mnaoumov/typescript-lib/async-events';
import { noopAsync } from '@mnaoumov/typescript-lib/function';
import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { strictProxy } from '@mnaoumov/typescript-test-toolkit/strict-proxy';
import { App } from 'obsidian-test-mocks/obsidian';
import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { Plugin } from './plugin.ts';

import { MapProvider } from './map-provider.ts';
import { PluginSettingsComponent } from './plugin-settings-component.ts';
import { PluginSettingsTab } from './plugin-settings-tab.ts';

async function createTab(): Promise<PluginSettingsTab> {
  const dataHandler: DataHandler = {
    loadData(): Promise<unknown> {
      return Promise.resolve({});
    },
    saveData(): Promise<void> {
      return noopAsync();
    }
  };
  const pluginSettingsComponent = new PluginSettingsComponent({
    dataHandler,
    pluginEventSource: new AsyncEvents<PluginEventMap>()
  });
  await pluginSettingsComponent.loadWithPromises();
  const plugin = strictProxy<Plugin>({ app: App.createConfigured__().asOriginalType__() });
  return new PluginSettingsTab({ plugin, pluginSettingsComponent });
}

describe('PluginSettingsTab', () => {
  it('declares the map provider as a dropdown, Google Maps first, each option explained in the description', async () => {
    const tab = await createTab();
    const definitions = tab.getSettingDefinitions().flatMap((definition) => 'items' in definition ? definition.items ?? [] : [definition]);
    expect(definitions.map((definition) => 'name' in definition ? definition.name : '')).toStrictEqual(['Map provider']);

    const bindSpy = vi.spyOn(tab, 'bind');
    for (const definition of definitions) {
      if ('render' in definition) {
        definition.render(new SettingEx(tab.containerEl), castTo<SettingGroup>(null));
      }
    }
    expect(bindSpy.mock.calls.map(([params]) => params.propertyName)).toStrictEqual(['mapProvider']);
    expect([...tab.containerEl.querySelectorAll(':scope select option')].map((option) => [option.getAttribute('value'), option.textContent])).toStrictEqual([
      [MapProvider.GoogleMaps, 'Google Maps'],
      [MapProvider.OpenStreetMap, 'OpenStreetMap']
    ]);

    const [definition] = definitions;
    const desc = definition && 'desc' in definition ? definition.desc : null;
    expect(desc).toBeInstanceOf(DocumentFragment);
    expect([...castTo<DocumentFragment>(desc).querySelectorAll('code')].map((code) => code.textContent)).toStrictEqual(['Google Maps', 'OpenStreetMap']);
  });
});
