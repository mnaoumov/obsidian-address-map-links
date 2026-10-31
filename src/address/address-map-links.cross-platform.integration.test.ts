import type { CommonArguments } from 'obsidian-integration-testing';

import {
  evalInObsidian,
  pollInObsidian
} from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  describe,
  expect,
  it
} from 'vitest';

// Isolation: `npx vitest run --project integration-tests:desktop src/address/address-map-links.cross-platform.integration.test.ts`,
// Or `--project integration-tests:android`.
//
// Each step is its own short closure, and every wait runs in Node through `pollInObsidian`, because a cold
// Android emulator can take seconds to render a note in Reading view.

interface LinkSnapshot {
  readonly href: string;
  readonly label: string;
  readonly text: string;
}

interface LinksState {
  readonly isAfterProperties: boolean;
  readonly links: LinkSnapshot[];
  readonly mode: string;
  readonly parentClass: string;
}

const FOLDER = 'aml';
const NOTE_PATH = `${FOLDER}/Someone.md`;
const POLL_TIMEOUT_IN_MILLISECONDS = 20_000;

describe('address map links', () => {
  it('shows one map link per address under the properties in Live Preview and Reading view, follows edits and the map provider, and opens the map', async () => {
    const vaultPath = getTemporaryVault().path;

    async function waitForState(step: string, isReady: (state: LinksState) => boolean): Promise<LinksState> {
      return pollInObsidian({
        poll: readState,
        timeoutInMilliseconds: POLL_TIMEOUT_IN_MILLISECONDS,
        timeoutMessage: step,
        until: isReady,
        vaultPath
      });
    }

    async function setMode(mode: string): Promise<void> {
      await evalInObsidian({
        async callback({ app, mode: modeName }): Promise<void> {
          const view = app.workspace.getMostRecentLeaf()?.view;
          if (!view) {
            throw new Error('No view.');
          }
          await view.setState({ ...view.getState(), mode: modeName, source: false }, { history: false });
        },
        input: { mode },
        vaultPath
      });
    }

    async function setMapProvider(label: string): Promise<void> {
      await evalInObsidian({
        async callback({ app, label: optionLabel, lib: { waitUntil } }): Promise<void> {
          const SETTING_NAME = 'Map provider';
          app.setting.open();
          app.setting.openTabById('address-map-links');
          function findSelect(): HTMLSelectElement | null {
            const item = [...app.setting.containerEl.querySelectorAll('.setting-item')]
              .find((el) => el.querySelector('.setting-item-name')?.textContent === SETTING_NAME);
            return item?.querySelector('select') ?? null;
          }
          await waitUntil({ predicate: () => findSelect() !== null, timeoutInMilliseconds: 5000 });
          const selectEl = findSelect();
          const option = [...selectEl?.options ?? []].find((el) => el.textContent === optionLabel);
          if (!selectEl || !option) {
            throw new Error(`No ${optionLabel} option in the ${SETTING_NAME} dropdown.`);
          }
          // A native `<select>` opens its list outside the page, where no trusted click reaches, so the
          // Choice is made the way the list makes it: set the value and fire the `change` it would fire.
          selectEl.value = option.value;
          selectEl.dispatchEvent(new Event('change'));
          app.setting.close();
        },
        input: { label },
        vaultPath
      });
    }

    await evalInObsidian({
      async callback({ app, folder, notePath }): Promise<void> {
        await app.vault.createFolder(folder);
        await app.vault.create(`${folder}/London.md`, '---\ntitle: Big Smoke\n---\nA place.\n');
        await app.vault.create(
          notePath,
          '---\nworkAddress:\n  street: 10 Downing Street\n  city: "[[London]]"\n  country: United Kingdom\nhomeAddress:\n  city: Paris\n  country: France\n---\nSomeone.\n'
        );
        const file = app.vault.getFileByPath(notePath);
        if (!file) {
          throw new Error(`No ${notePath}.`);
        }
        await app.workspace.getLeaf(false).openFile(file, { state: { mode: 'source', source: false } });
      },
      input: { folder: FOLDER, notePath: NOTE_PATH },
      vaultPath
    });

    try {
      const livePreview = await waitForState('the links in Live Preview', (state) => state.mode === 'source' && state.links.length === 2);
      expect(livePreview.parentClass).toBe('cm-sizer');
      expect(livePreview.isAfterProperties).toBe(true);
      expect(livePreview.links).toStrictEqual([
        {
          href: 'https://www.google.com/maps/search/?api=1&query=10%20Downing%20Street%2C%20Big%20Smoke%2C%20United%20Kingdom',
          label: 'Work',
          text: '10 Downing Street, Big Smoke, United Kingdom'
        },
        {
          href: 'https://www.google.com/maps/search/?api=1&query=Paris%2C%20France',
          label: 'Home',
          text: 'Paris, France'
        }
      ]);

      const openedUrls = await evalInObsidian({
        async callback({ app, lib: { clickElement, waitUntil } }): Promise<string[]> {
          const CLICK_TIMEOUT_IN_MILLISECONDS = 5000;
          const linkEl = app.workspace.getMostRecentLeaf()?.view.containerEl.querySelector(':scope .address-map-links-block a');
          if (!(linkEl instanceof HTMLElement)) {
            throw new TypeError('No map link.');
          }
          // A real open hands the URL to the browser or the Maps app, where the test cannot follow it, so the
          // Click is observed at the one call that leaves Obsidian.
          const urls: string[] = [];
          const originalOpen = window.open;
          Object.assign(window, {
            open(url?: string | URL): null {
              urls.push(String(url));
              return null;
            }
          });
          try {
            await clickElement({ element: linkEl });
            // The trusted click reaches the page after `clickElement` returns.
            await waitUntil({ predicate: () => urls.length > 0, timeoutInMilliseconds: CLICK_TIMEOUT_IN_MILLISECONDS });
          } finally {
            Object.assign(window, { open: originalOpen });
          }
          return urls;
        },
        vaultPath
      });
      expect(openedUrls).toStrictEqual([livePreview.links[0]?.href]);

      await evalInObsidian({
        async callback({ app, notePath }): Promise<void> {
          const file = app.vault.getFileByPath(notePath);
          if (!file) {
            throw new Error(`No ${notePath}.`);
          }
          await app.fileManager.processFrontMatter(file, (frontmatter: Record<string, Record<string, string>>) => {
            const workAddress = frontmatter['workAddress'];
            if (workAddress) {
              workAddress['street'] = '11 Downing Street';
            }
            delete frontmatter['homeAddress'];
          });
        },
        input: { notePath: NOTE_PATH },
        vaultPath
      });
      const edited = await waitForState('the links after a property edit', (state) => state.links.length === 1 && state.links[0]?.text.startsWith('11 ') === true);
      expect(edited.links[0]?.text).toBe('11 Downing Street, Big Smoke, United Kingdom');

      await setMode('preview');
      const reading = await waitForState('the links in Reading view', (state) => state.mode === 'preview' && state.links.length === 1);
      expect(reading.parentClass).toBe('mod-header');
      expect(reading.isAfterProperties).toBe(true);

      await setMapProvider('OpenStreetMap');
      const openStreetMap = await waitForState('the links after switching to OpenStreetMap', (state) => state.links[0]?.href.startsWith('https://www.openstreetmap.org/') === true);
      expect(openStreetMap.links[0]?.href).toBe('https://www.openstreetmap.org/search?query=11%20Downing%20Street%2C%20Big%20Smoke%2C%20United%20Kingdom');

      await setMode('source');
      const backInLivePreview = await waitForState('the links back in Live Preview', (state) => state.mode === 'source' && state.parentClass === 'cm-sizer');
      expect(backInLivePreview.isAfterProperties).toBe(true);
    } finally {
      await setMapProvider('Google Maps');
      await evalInObsidian({
        async callback({ app, folder }): Promise<void> {
          const folderFile = app.vault.getFolderByPath(folder);
          if (folderFile) {
            await app.fileManager.trashFile(folderFile);
          }
        },
        input: { folder: FOLDER },
        vaultPath
      });
    }
  });
});

/**
 * Reads the map links of the most recent note and where their block sits.
 *
 * @param params - The app and the obsidian module.
 * @returns The state.
 */
function readState({ app, obsidianModule }: CommonArguments): LinksState {
  const view = app.workspace.getMostRecentLeaf()?.view;
  if (!(view instanceof obsidianModule.MarkdownView)) {
    throw new TypeError('The most recent leaf shows no Markdown view.');
  }
  const blockEl = view.containerEl.querySelector<HTMLElement>('.address-map-links-block');
  const isShown = blockEl?.isShown() ?? false;
  return {
    isAfterProperties: blockEl?.previousElementSibling === view.metadataEditor.containerEl,
    links: isShown && blockEl
      ? Array.from(blockEl.querySelectorAll('.address-map-links-item'), (itemEl) => ({
        href: itemEl.querySelector('a')?.getAttribute('href') ?? '',
        label: itemEl.querySelector('.address-map-links-label')?.textContent ?? '',
        text: itemEl.querySelector('a')?.textContent ?? ''
      }))
      : [],
    mode: view.getMode(),
    parentClass: blockEl?.parentElement?.classList[0] ?? ''
  };
}
