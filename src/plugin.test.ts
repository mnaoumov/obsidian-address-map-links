import type {
  App as AppOriginal,
  PluginManifest
} from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { ensureNonNullable } from '@mnaoumov/typescript-lib/type-guards';
import { Plugin as ObsidianPlugin } from 'obsidian';
import { App } from 'obsidian-test-mocks/obsidian';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { AddressMapLinksSettings } from './address/address-map-links-component.ts';

import { AddressMapLinksComponent } from './address/address-map-links-component.ts';
import { MapProvider } from './map-provider.ts';
import { PluginSettingsComponent } from './plugin-settings-component.ts';
import { Plugin } from './plugin.ts';

interface AddressMapLinksComponentInternals {
  readonly getSettings: () => AddressMapLinksSettings;
}

interface AppGlobal {
  // eslint-disable-next-line typescript-dev-toolkit/readonly-interface-members -- Tests replace the global app before constructing the plugin.
  app: AppOriginal;
}

interface PluginWithSettings {
  readonly pluginSettingsComponent: PluginSettingsComponent;
}

const manifest = castTo<PluginManifest>({
  author: 'test',
  description: 'test',
  id: 'address-map-links',
  minAppVersion: '1.0.0',
  name: 'Address Map Links',
  version: '1.0.0'
});

let app: AppOriginal;

function getSettingsComponent(plugin: Plugin): PluginSettingsComponent {
  return castTo<PluginWithSettings>(plugin).pluginSettingsComponent;
}

describe('Plugin', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    app = App.createConfigured__().asOriginalType__();
    // Expose the app as the global instance so library helpers that resolve the app without an explicit argument read this one.
    castTo<AppGlobal>(window).app = app;
  });

  it('extends the Obsidian Plugin class', () => {
    expect(Plugin.prototype).toBeInstanceOf(ObsidianPlugin);
  });

  it('registers the report bug command and the open demo vault command', async () => {
    const plugin = new Plugin(app, manifest);
    const addCommandSpy = vi.spyOn(plugin, 'addCommand');
    await plugin.onload();
    const ids = addCommandSpy.mock.calls.map(([command]) => command.id);
    expect(ids.slice(ids.indexOf('report-bug'))).toStrictEqual(['report-bug', 'open-demo-vault']);
  });

  it('builds the map links with the current map provider', async () => {
    const plugin = new Plugin(app, manifest);
    const addChildSpy = vi.spyOn(plugin, 'addChild');
    await plugin.onload();
    const component = addChildSpy.mock.results.map((result) => result.value as unknown).find((child) => child instanceof AddressMapLinksComponent);
    const settingsComponent = getSettingsComponent(plugin);
    await settingsComponent.editAndSave((settings) => {
      settings.mapProvider = MapProvider.OpenStreetMap;
    });
    expect(castTo<AddressMapLinksComponentInternals>(component).getSettings()).toMatchObject({ mapProvider: MapProvider.OpenStreetMap });
  });

  it('refreshes the map links whenever the settings are loaded or saved, until it unloads', async () => {
    const refreshSpy = vi.spyOn(AddressMapLinksComponent.prototype, 'refresh');
    const onSpy = vi.spyOn(PluginSettingsComponent.prototype, 'on');
    const offrefSpy = vi.spyOn(PluginSettingsComponent.prototype, 'offref');
    const componentOnloadSpy = vi.spyOn(AddressMapLinksComponent.prototype, 'onload');
    const plugin = new Plugin(app, manifest);
    const addCommandSpy = vi.spyOn(plugin, 'addCommand');
    plugin.load();
    await vi.waitFor(() => {
      expect(addCommandSpy).toHaveBeenCalledWith(expect.objectContaining({ id: 'open-demo-vault' }));
    });
    const settingsComponent = getSettingsComponent(plugin);

    refreshSpy.mockClear();
    await settingsComponent.editAndSave((settings) => {
      settings.mapProvider = MapProvider.OpenStreetMap;
    });
    expect(refreshSpy).toHaveBeenCalledTimes(1);

    refreshSpy.mockClear();
    await settingsComponent.loadFromFile(false);
    expect(refreshSpy).toHaveBeenCalledTimes(1);

    // The settings component's own listeners, added when it loads, before the links component exists, are its
    // Own business.
    const componentLoadOrder = ensureNonNullable(componentOnloadSpy.mock.invocationCallOrder[0]);
    const listenerIndices = onSpy.mock.invocationCallOrder
      .map((order, index) => ({ index, order }))
      .filter(({ order }) => order > componentLoadOrder)
      .map(({ index }) => index);
    expect(listenerIndices.map((index) => onSpy.mock.calls[index]?.[0])).toStrictEqual(['loadSettings', 'saveSettings']);
    const settingsEventRefs = listenerIndices.map((index): unknown => onSpy.mock.results[index]?.value);
    expect(offrefSpy).not.toHaveBeenCalled();
    plugin.unload();
    const removedEventRefs = offrefSpy.mock.calls.map(([eventRef]) => eventRef);
    expect(removedEventRefs).toHaveLength(settingsEventRefs.length);
    expect(removedEventRefs).toEqual(expect.arrayContaining(settingsEventRefs));
  });
});
