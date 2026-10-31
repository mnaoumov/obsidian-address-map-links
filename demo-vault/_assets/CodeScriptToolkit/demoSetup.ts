import type { App } from 'obsidian';

import { configureCommunityPlugin } from '@mnaoumov/obsidian-lib/community-plugins';
import { Notice } from 'obsidian';

// Shared code for every `code-button` in this vault, so each note's button stays a one-liner instead of a
// Block copy-pasted across notes.
//
// The plugin id has to match `manifest.json` exactly: commands are keyed by it, and so is `data.json`.
const PLUGIN_ID = 'address-map-links';

const SAMPLE_PERSON_PATH = 'Materials/01 Address links/Ada Example.md';

/**
 * Opens the sample person note, whose properties hold a work and a home address.
 *
 * Manual equivalent: open `Materials/01 Address links/Ada Example.md`.
 *
 * @param mode - `preview` for Reading view, `source` for Live Preview.
 */
export async function openSamplePerson(app: App, mode: 'preview' | 'source'): Promise<void> {
  const file = app.vault.getFileByPath(SAMPLE_PERSON_PATH);
  if (!file) {
    new Notice(`Could not find ${SAMPLE_PERSON_PATH}.`);
    return;
  }
  await app.workspace.getLeaf(false).openFile(file, { state: { mode, source: false } });
}

/**
 * Sets the map service the address links open.
 *
 * `configureCommunityPlugin` routes through the plugin's own settings component while it is loaded, so the
 * change applies live -- no window reload, and no writing `data.json` behind a running plugin's back, which
 * it would overwrite from memory as it unloads.
 *
 * Manual equivalent: pick the provider in **Settings -> Community plugins -> Address Map Links**.
 *
 * @param mapProvider - `googleMaps` or `openStreetMap`.
 */
export async function setMapProvider(app: App, mapProvider: 'googleMaps' | 'openStreetMap'): Promise<void> {
  await configureCommunityPlugin({ app, pluginId: PLUGIN_ID, settings: { mapProvider } });
  new Notice(`mapProvider is now "${mapProvider}". It is live -- no reload needed.`);
}
