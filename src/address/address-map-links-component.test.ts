import type {
  CachedMetadata,
  MarkdownSubView,
  MarkdownView as MarkdownViewOriginal,
  TFile,
  WorkspaceLeaf
} from 'obsidian';
import type { Mock } from 'vitest';

import { noopAsync } from '@mnaoumov/typescript-lib/function';
import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { ViewType } from '@obsidian-typings/obsidian-public-latest/implementations';
import {
  App,
  MarkdownView
} from 'obsidian-test-mocks/obsidian';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { AddressMapLinksSettings } from './address-map-links-component.ts';

import { MapProvider } from '../map-provider.ts';
import {
  AddressMapLinksComponent,
  BLOCK_CLASS
} from './address-map-links-component.ts';

interface Fixture {
  readonly app: App;
  readonly caches: Map<string, CachedMetadata>;
  readonly component: AddressMapLinksComponent;
  readonly file: TFile;
  readonly markdownLeaves: WorkspaceLeaf[];
  readonly placeFile: TFile;
  // eslint-disable-next-line typescript-dev-toolkit/readonly-interface-members -- Tests switch the map provider between refreshes.
  settings: AddressMapLinksSettings;
}

interface TestView {
  readonly headerEl: HTMLElement;
  readonly propertiesEl: HTMLElement;
  readonly sizerEl: HTMLElement;
  readonly updateHeader: Mock<() => void>;
  readonly view: MarkdownViewOriginal;
}

interface WithCurrentMode {
  // eslint-disable-next-line typescript-dev-toolkit/readonly-interface-members -- The view stub switches its current mode.
  currentMode: MarkdownSubView;
}

const BLOCK_SELECTOR = `.${BLOCK_CLASS}`;
const REFRESH_DELAY_IN_MILLISECONDS = 50;

const WORK_CACHE: CachedMetadata = {
  frontmatter: {
    workAddress: { city: '[[London]]', country: 'United Kingdom', street: '10 Downing Street' }
  },
  frontmatterLinks: [{ key: 'workAddress.city', link: 'London', original: '[[London]]' }]
};

// Obsidian's own `MarkdownView.setMode`, which the test mocks do not model: a mode switch makes the mode
// Current, and moves the properties into that mode.
async function setModeStub(this: MarkdownViewOriginal, mode: MarkdownSubView): Promise<void> {
  await noopAsync();
  castTo<WithCurrentMode>(this).currentMode = mode;
  const { containerEl } = this.metadataEditor;
  if (mode === this.previewMode) {
    this.previewMode.renderer.header?.el.append(containerEl);
  } else {
    this.editMode.sizerEl.prepend(containerEl);
  }
}

describe('AddressMapLinksComponent', () => {
  let fixture: Fixture;
  const markdownViewPrototype = castTo<Record<string, unknown>>(MarkdownView.prototype);

  beforeEach(() => {
    vi.useFakeTimers();
    markdownViewPrototype['setMode'] = setModeStub;
    fixture = createFixture();
  });

  afterEach(() => {
    fixture.component.unload();
    delete markdownViewPrototype['setMode'];
    vi.useRealTimers();
  });

  function openView(file: null | TFile = fixture.file): TestView {
    const view = MarkdownView.create2__(fixture.app.workspace.getLeaf(true)).asOriginalType7__();
    view.file = file;

    const sizerEl = createDiv({ cls: 'cm-sizer' });
    const propertiesEl = sizerEl.createDiv({ cls: 'metadata-container' });
    sizerEl.createDiv({ cls: 'cm-contentContainer' });
    Object.assign(view.editMode, { sizerEl });
    Object.assign(view, { metadataEditor: { containerEl: propertiesEl } });

    const headerEl = createDiv({ cls: 'mod-header' });
    headerEl.createDiv({ cls: 'inline-title' });
    const updateHeader = vi.fn<() => void>();
    Object.assign(view.previewMode, { renderer: { header: { el: headerEl }, updateHeader } });

    fixture.markdownLeaves.push(castTo<WorkspaceLeaf>({ view }));
    return { headerEl, propertiesEl, sizerEl, updateHeader, view };
  }

  function loadAndRefresh(): void {
    fixture.component.load();
    fixture.app.workspace.setLayoutReady__();
  }

  function getBlock(root: HTMLElement): HTMLElement | null {
    return root.querySelector<HTMLElement>(BLOCK_SELECTOR);
  }

  function getLinks(root: HTMLElement): string[][] {
    return [...root.querySelectorAll<HTMLElement>(`${BLOCK_SELECTOR} .address-map-links-item`)].map((itemEl) => [
      itemEl.dataset['addressKey'] ?? '',
      itemEl.querySelector('.address-map-links-label')?.textContent ?? '',
      itemEl.querySelector('a')?.textContent ?? '',
      itemEl.querySelector('a')?.getAttribute('href') ?? ''
    ]);
  }

  async function switchMode(testView: TestView, mode: MarkdownSubView): Promise<void> {
    await testView.view.setMode(mode);
  }

  it('puts one labelled map link per address right after the properties once the layout is ready', () => {
    const { propertiesEl, sizerEl } = openView();
    fixture.component.load();
    expect(getBlock(sizerEl)).toBeNull();

    fixture.app.workspace.setLayoutReady__();

    expect(propertiesEl.nextElementSibling?.matches(BLOCK_SELECTOR)).toBe(true);
    // The linked city reads as its place note's title.
    expect(getLinks(sizerEl)).toStrictEqual([[
      'workAddress',
      'Work',
      '10 Downing Street, Big Smoke, United Kingdom',
      'https://www.google.com/maps/search/?api=1&query=10%20Downing%20Street%2C%20Big%20Smoke%2C%20United%20Kingdom'
    ]]);
  });

  it('reads a linked place as its note\'s base name when it has no title', () => {
    fixture.caches.set(fixture.placeFile.path, {});
    const { sizerEl } = openView();
    loadAndRefresh();
    expect(getLinks(sizerEl)[0]?.[2]).toBe('10 Downing Street, London, United Kingdom');
  });

  it('reads a linked place as its link text when it resolves to no note', () => {
    fixture.caches.set(fixture.file.path, {
      frontmatter: { workAddress: { city: '[[Nowhere]]' } },
      frontmatterLinks: [{ key: 'workAddress.city', link: 'Nowhere', original: '[[Nowhere]]' }]
    });
    const { sizerEl } = openView();
    loadAndRefresh();
    expect(getLinks(sizerEl)[0]?.[2]).toBe('Nowhere');
  });

  it('opens the map outside Obsidian on a click', () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
    const { sizerEl } = openView();
    loadAndRefresh();
    const linkEl = sizerEl.querySelector<HTMLAnchorElement>(`${BLOCK_SELECTOR} a`);
    const event_ = new MouseEvent('click', { bubbles: true, cancelable: true });
    linkEl?.dispatchEvent(event_);
    expect(event_.defaultPrevented).toBe(true);
    expect(openSpy).toHaveBeenCalledWith(linkEl?.getAttribute('href'), '_blank');
  });

  it('builds the links for the map provider in the settings', () => {
    fixture.settings = { mapProvider: MapProvider.OpenStreetMap };
    const { sizerEl } = openView();
    loadAndRefresh();
    expect(getLinks(sizerEl)[0]?.[3]).toBe('https://www.openstreetmap.org/search?query=10%20Downing%20Street%2C%20Big%20Smoke%2C%20United%20Kingdom');
  });

  it('shows nothing for a note without addresses, or a view without a file', () => {
    fixture.caches.set(fixture.file.path, { frontmatter: { title: 'No address' } });
    const withoutAddresses = openView();
    const withoutFile = openView(null);
    loadAndRefresh();
    expect(getBlock(withoutAddresses.sizerEl)).toBeNull();
    expect(getBlock(withoutFile.sizerEl)).toBeNull();
  });

  it('follows the properties into Reading view and back, re-measuring the Reading view header', async () => {
    const testView = openView();
    loadAndRefresh();

    await switchMode(testView, testView.view.previewMode);
    expect(testView.propertiesEl.parentElement).toBe(testView.headerEl);
    expect(testView.propertiesEl.nextElementSibling?.matches(BLOCK_SELECTOR)).toBe(true);
    expect(getBlock(testView.sizerEl)).toBeNull();
    expect(testView.updateHeader).toHaveBeenCalledTimes(1);

    // Nothing moved or changed, so the header is not re-measured again.
    fixture.component.refresh();
    expect(testView.updateHeader).toHaveBeenCalledTimes(1);

    await switchMode(testView, testView.view.editMode);
    expect(testView.propertiesEl.nextElementSibling?.matches(BLOCK_SELECTOR)).toBe(true);
    expect(getBlock(testView.headerEl)).toBeNull();
    expect(testView.updateHeader).toHaveBeenCalledTimes(1);
  });

  it('keeps one block per note across refreshes, and re-renders it only when the links change', () => {
    const { sizerEl } = openView();
    loadAndRefresh();
    const blockEl = getBlock(sizerEl);
    const linkEl = blockEl?.querySelector('a');

    fixture.component.refresh();
    expect(getBlock(sizerEl)).toBe(blockEl);
    expect(blockEl?.querySelector('a')).toBe(linkEl);

    fixture.caches.set(fixture.file.path, { frontmatter: { homeAddress: { city: 'Paris' }, workAddress: { country: 'France' } } });
    fixture.component.refresh();
    expect(getBlock(sizerEl)).toBe(blockEl);
    expect(getLinks(sizerEl).map(([key, label, query]) => [key, label, query])).toStrictEqual([
      ['homeAddress', 'Home', 'Paris'],
      ['workAddress', 'Work', 'France']
    ]);
  });

  it('re-renders on a metadata change, a resolve, a layout change or a file open, after a short debounce', () => {
    const { sizerEl } = openView();
    loadAndRefresh();

    const events = [
      (): void => {
        fixture.app.metadataCache.trigger('changed', fixture.file, '', fixture.caches.get(fixture.file.path));
      },
      (): void => {
        fixture.app.metadataCache.trigger('resolved');
      },
      (): void => {
        fixture.app.workspace.trigger('layout-change');
      },
      (): void => {
        fixture.app.workspace.trigger('file-open', fixture.file);
      }
    ];
    for (const [index, triggerEvent] of events.entries()) {
      const city = `City ${String(index)}`;
      fixture.caches.set(fixture.file.path, { frontmatter: { homeAddress: { city } } });
      triggerEvent();
      expect(getLinks(sizerEl)[0]?.[2]).not.toBe(city);
      vi.advanceTimersByTime(REFRESH_DELAY_IN_MILLISECONDS);
      expect(getLinks(sizerEl)[0]?.[2]).toBe(city);
    }
  });

  it('removes the block when the note loses its addresses, re-measuring the header only in Reading view', async () => {
    const testView = openView();
    loadAndRefresh();
    fixture.caches.set(fixture.file.path, {});
    fixture.component.refresh();
    expect(getBlock(testView.sizerEl)).toBeNull();
    expect(testView.updateHeader).not.toHaveBeenCalled();

    fixture.caches.set(fixture.file.path, WORK_CACHE);
    await switchMode(testView, testView.view.previewMode);
    testView.updateHeader.mockClear();
    fixture.caches.set(fixture.file.path, {});
    fixture.component.refresh();
    expect(getBlock(testView.headerEl)).toBeNull();
    expect(testView.updateHeader).toHaveBeenCalledTimes(1);
  });

  it('drops the block of a note that was closed', () => {
    const { sizerEl } = openView();
    loadAndRefresh();
    fixture.markdownLeaves.length = 0;
    fixture.markdownLeaves.push(castTo<WorkspaceLeaf>({ view: {} }));
    fixture.component.refresh();
    expect(getBlock(sizerEl)).toBeNull();
  });

  it('takes every block out and stops listening when it unloads', () => {
    const { sizerEl } = openView();
    loadAndRefresh();
    fixture.component.unload();
    expect(getBlock(sizerEl)).toBeNull();

    fixture.app.workspace.trigger('layout-change');
    vi.advanceTimersByTime(REFRESH_DELAY_IN_MILLISECONDS);
    expect(getBlock(sizerEl)).toBeNull();
  });

  function createFixture(): Fixture {
    const app = App.createConfigured__();
    const tFile = app.vault.createSync__('People/Someone.md', '');
    const tPlaceFile = app.vault.createSync__('Places/London.md', '');
    const originalApp = app.asOriginalType__();
    const file = castTo<TFile>(originalApp.vault.getFileByPath(tFile.path));
    const placeFile = castTo<TFile>(originalApp.vault.getFileByPath(tPlaceFile.path));

    const caches = new Map<string, CachedMetadata>([
      [file.path, WORK_CACHE],
      [placeFile.path, { frontmatter: { title: 'Big Smoke' } }]
    ]);
    vi.spyOn(originalApp.metadataCache, 'getFileCache').mockImplementation((target) => caches.get(target.path) ?? null);
    vi.spyOn(originalApp.metadataCache, 'getFirstLinkpathDest').mockImplementation((linkpath) => linkpath === 'London' ? placeFile : null);

    const markdownLeaves: WorkspaceLeaf[] = [];
    vi.spyOn(originalApp.workspace, 'getLeavesOfType').mockImplementation((viewType) => viewType === ViewType.Markdown ? markdownLeaves : []);

    const partialFixture = {
      app,
      caches,
      file,
      markdownLeaves,
      placeFile,
      settings: { mapProvider: MapProvider.GoogleMaps }
    };
    const component = new AddressMapLinksComponent({
      app: originalApp,
      getSettings: (): AddressMapLinksSettings => partialFixture.settings
    });
    return Object.assign(partialFixture, { component });
  }
});
