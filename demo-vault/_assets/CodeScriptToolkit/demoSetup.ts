import type { App } from 'obsidian';

import { configureCommunityPlugin } from '@mnaoumov/obsidian-lib/community-plugins';
import { Notice } from 'obsidian';

// Shared code for every `code-button` in this vault, so each note's button stays a one-liner instead of a
// Block copy-pasted across notes.
//
// The plugin id has to match `manifest.json` exactly: commands are keyed by it, and so is `data.json`.
const PLUGIN_ID = 'address-map-links';

const SAMPLE_PERSON_PATH = 'Materials/01 Address links/Ada Example.md';
const SECOND_SAMPLE_PERSON_PATH = 'Materials/01 Address links/Bruno Example.md';

/**
 * Opens the sample person note, whose properties hold a work and a home address.
 *
 * Manual equivalent: open `Materials/01 Address links/Ada Example.md`.
 *
 * @param mode - `preview` for Reading view, `source` for Live Preview.
 */
export async function openSamplePerson(app: App, mode: 'preview' | 'source'): Promise<void> {
  await openNote(app, SAMPLE_PERSON_PATH, mode);
}

/**
 * Opens the second sample person note, whose properties hold an unresolved link, a custom address type, a
 * street-only address and a text `*Address` property that is not an address.
 *
 * Manual equivalent: open `Materials/01 Address links/Bruno Example.md`.
 *
 * @param mode - `preview` for Reading view, `source` for Live Preview.
 */
export async function openSecondSamplePerson(app: App, mode: 'preview' | 'source'): Promise<void> {
  await openNote(app, SECOND_SAMPLE_PERSON_PATH, mode);
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

async function openNote(app: App, path: string, mode: 'preview' | 'source'): Promise<void> {
  const file = app.vault.getFileByPath(path);
  if (!file) {
    new Notice(`Could not find ${path}.`);
    return;
  }
  await app.workspace.getLeaf(false).openFile(file, { state: { mode, source: false } });
}
