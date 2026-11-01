/**
 * @file
 *
 * The staging closures the desktop and the Android capture suites share. Each frame is staged by `startStage`,
 * which sets it up and returns at once, and is read by `pollStage` until it shows what the frame needs, both
 * through `pollInObsidian`, so every wait happens in Node and no closure comes near the transport's per-eval cap.
 *
 * Both functions are serialized into Obsidian, so neither may reach anything outside its own body: every constant
 * and helper they use is declared inside them.
 */

import type { FileExplorerView } from '@obsidian-typings/obsidian-public-latest';
import type { CommonArguments } from 'obsidian-integration-testing';

/**
 * What {@link reserveCaptionBand} is given.
 */
export interface ReserveCaptionBandInput {
  /**
   * The height of the caption band `labelScreenshot` draws over the bottom of the frame.
   */
  readonly bandHeightInPixels: number;
}

/**
 * A frame the capture suites can stage.
 */
export type ScreenshotStage = 'live-preview' | 'reading' | 'settings';

/**
 * The part of the plugin's settings component the stages change settings through.
 */
export interface SettingsEditor {
  readonly editAndSave: (edit: (value: Record<string, unknown>) => void) => Promise<void>;
}

/**
 * What a stage closure is given.
 */
export interface StageInput {
  /**
   * The frame to stage.
   */
  readonly stage: ScreenshotStage;
}

/**
 * Reads whether the metadata cache has resolved the links of every note.
 *
 * Until it has, a place link still reads as its link text rather than its place note's title.
 *
 * @param params - The closure arguments.
 * @returns Whether every note's links are resolved.
 */
export function areAllLinksResolved({ app }: CommonArguments): boolean {
  return app.vault.getMarkdownFiles().every((file) => Object.hasOwn(app.metadataCache.resolvedLinks, file.path));
}

/**
 * Reads whether the staged frame is ready, and what it shows.
 *
 * @param params - The closure arguments.
 * @returns What the frame shows, or an empty string while it is not ready.
 */
export function pollStage({ app, stage }: CommonArguments & StageInput): string {
  const PLUGIN_ID = 'address-map-links';
  // Ada Example has two addresses and Bruno Example three. Every frame opens its note in the one root leaf, and the
  // Explorer reveal may take the focus, so the links are counted in the root split rather than the active leaf.
  const LINK_COUNTS: Record<'live-preview' | 'reading', number> = { 'live-preview': 2, 'reading': 3 };

  if (stage === 'settings') {
    return app.setting.activeTab?.id === PLUGIN_ID && app.setting.activeTab.containerEl.querySelector('.setting-item-name') ? 'settings' : '';
  }
  /*
   * The sample notes' `obsidian-dev-toolkit` property tells the demo vault's authoring checks why the note holds
   * wikilinks. It says nothing about the plugin and would sit in every frame as a long line of raw JSON, so it is
   * hidden here, on every poll, because the Properties panel re-renders its rows whenever the note does.
   */
  for (const el of activeDocument.querySelectorAll<HTMLElement>(':scope .metadata-property[data-property-key="obsidian-dev-toolkit"]')) {
    el.hide();
  }
  const links = activeDocument.querySelectorAll(':scope .workspace-split.mod-root .address-map-links-block .address-map-links-link');
  return links.length === LINK_COUNTS[stage] ? stage : '';
}

/**
 * Lays the app out above the caption band rather than under it.
 *
 * `labelScreenshot` draws its band over the bottom of the frame, on the grounds that the bottom is chrome. Here the
 * band is kept clear of everything the app draws, so no frame loses its status bar or a phone its navigation bar.
 *
 * @param params - The closure arguments.
 */
export function reserveCaptionBand({ bandHeightInPixels, obsidianModule }: CommonArguments & ReserveCaptionBandInput): void {
  /*
   * The band is measured in the frame's pixels. A desktop frame is shot at one CSS pixel per pixel, but a phone's is
   * its framebuffer, at the device's pixel ratio.
   */
  const pixelRatio = obsidianModule.Platform.isMobile ? activeWindow.devicePixelRatio : 1;
  const band = `${String(bandHeightInPixels / pixelRatio)}px`;
  activeDocument.querySelector<HTMLElement>(':scope .app-container')?.setCssStyles({ height: `calc(100% - ${band})` });
  // The status bar and a phone's navigation bar are fixed to the viewport rather than laid out in the app, so they are
  // Lifted on their own.
  for (const el of activeDocument.querySelectorAll<HTMLElement>(':scope :is(.status-bar, .mobile-navbar)')) {
    el.setCssStyles({ bottom: band });
  }
}

/**
 * Stages a frame: dismisses whatever the last frame left open, then opens what the frame is about.
 *
 * @param params - The closure arguments.
 */
export async function startStage({ app, lib, obsidianModule, stage }: CommonArguments & StageInput): Promise<void> {
  const PLUGIN_ID = 'address-map-links';
  const MATERIALS_FOLDER = 'Materials/01 Address links';
  const WAIT_TIMEOUT_IN_MILLISECONDS = 10_000;
  const { isMobile } = obsidianModule.Platform;

  await dismissLeftovers();

  switch (stage) {
    case 'live-preview': {
      await openNote(`${MATERIALS_FOLDER}/Ada Example.md`, 'source');
      break;
    }
    case 'reading': {
      await openNote(`${MATERIALS_FOLDER}/Bruno Example.md`, 'preview');
      break;
    }
    case 'settings': {
      // On mobile the settings modal is not in the document until something attaches it.
      const { containerEl } = app.setting;
      if (!activeDocument.body.contains(containerEl)) {
        activeDocument.body.append(containerEl);
      }
      app.setting.open();
      app.setting.openTabById(PLUGIN_ID);
      // The tab keeps the scroll it had when it was last open, which differs between runs.
      app.setting.activeTab?.containerEl.scrollTo({ top: 0 });
      break;
    }
    default: {
      break;
    }
  }

  async function dismissLeftovers(): Promise<void> {
    if (activeDocument.body.contains(app.setting.containerEl)) {
      app.setting.close();
    }
    await lib.waitUntil({
      message: 'the last frame\'s modal to close',
      predicate: () => activeDocument.querySelector(':scope .modal-container') === null,
      timeoutInMilliseconds: WAIT_TIMEOUT_IN_MILLISECONDS
    });
    for (const el of activeDocument.querySelectorAll(':scope .menu, :scope .notice, :scope .tooltip')) {
      el.detach();
    }
  }

  /**
   * Opens a note and reveals it in the File explorer. A phone's explorer is a drawer that would cover the note, so
   * there it stays closed.
   */
  async function openNote(path: string, mode: 'preview' | 'source'): Promise<void> {
    await app.workspace.getLeaf(false).setViewState({ active: true, state: { file: path, mode, source: false }, type: 'markdown' });
    if (isMobile) {
      app.workspace.leftSplit.collapse();
      return;
    }
    const file = app.vault.getFileByPath(path);
    const leaf = app.workspace.getLeavesOfType('file-explorer')[0];
    if (!file || !leaf) {
      throw new Error(`No ${path} or no File explorer leaf.`);
    }
    await leaf.loadIfDeferred();
    app.workspace.leftSplit.expand();
    (leaf.view as FileExplorerView).revealInFolder(file);
  }
}
