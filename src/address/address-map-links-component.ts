import type {
  App,
  TFile
} from 'obsidian';

import { MonkeyAroundComponent } from '@mnaoumov/obsidian-lib/components/monkey-around-component';
import { ViewType } from '@obsidian-typings/obsidian-public-latest/implementations';
import {
  Component,
  debounce,
  MarkdownView,
  parseLinktext
} from 'obsidian';

import type { MapProvider } from '../map-provider.ts';
import type { Address } from './address.ts';

import { buildMapUrl } from '../map-provider.ts';
import { getAddresses } from './address.ts';

/**
 * What the component reads from the plugin's settings.
 */
export interface AddressMapLinksSettings {
  readonly mapProvider: MapProvider;
}

interface AddressMapLinksComponentConstructorParams {
  readonly app: App;
  readonly getSettings: () => AddressMapLinksSettings;
}

interface RenderedLink {
  readonly key: string;
  readonly label: string;
  readonly query: string;
  readonly url: string;
}

/**
 * The class of the block that holds a note's map links.
 */
export const BLOCK_CLASS = 'address-map-links-block';
const ITEM_CLASS = 'address-map-links-item';
const LABEL_CLASS = 'address-map-links-label';
const LINK_CLASS = 'address-map-links-link';
const REFRESH_DELAY_IN_MILLISECONDS = 50;

/**
 * Shows a note's addresses as map links, in one block right after the note's properties.
 *
 * A Markdown view owns one properties container (`metadataEditor.containerEl`) and moves it on every mode
 * switch: into the editor's `.cm-sizer` for Live Preview, and into the Reading view renderer's header. The
 * block follows it, so it sits under the properties in both, and it is re-placed after every
 * `MarkdownView.setMode`. In Reading view the header is re-measured after a change, because the renderer
 * lays its sections out by their measured heights. Source mode hides the block through CSS.
 *
 * Nothing is written into the note: every link is built from the current property values on each refresh.
 */
export class AddressMapLinksComponent extends Component {
  private readonly app: App;
  private readonly blocks = new Map<MarkdownView, HTMLElement>();
  private readonly getSettings: () => AddressMapLinksSettings;
  private readonly monkeyAroundComponent = new MonkeyAroundComponent();
  private readonly requestRefresh = debounce(() => {
    this.refresh();
  }, REFRESH_DELAY_IN_MILLISECONDS);

  public constructor(params: AddressMapLinksComponentConstructorParams) {
    super();
    this.app = params.app;
    this.getSettings = params.getSettings;
  }

  public override onload(): void {
    this.addChild(this.monkeyAroundComponent);

    this.monkeyAroundComponent.registerMethodPatch({
      $object: MarkdownView.prototype,
      methodName: 'setMode',
      patchHandler: async ({ fallback, originalThis }) => {
        await fallback();
        this.refreshView(originalThis);
      }
    });

    const { metadataCache, workspace } = this.app;
    this.registerEvent(metadataCache.on('changed', this.requestRefresh));
    this.registerEvent(metadataCache.on('resolved', this.requestRefresh));
    this.registerEvent(workspace.on('layout-change', this.requestRefresh));
    this.registerEvent(workspace.on('file-open', this.requestRefresh));
    this.register(() => {
      this.requestRefresh.cancel();
    });

    workspace.onLayoutReady(() => {
      this.refresh();
    });
  }

  public override onunload(): void {
    for (const view of this.blocks.keys()) {
      this.removeBlock(view);
    }
  }

  /**
   * Renders and places the map links of every open note, and drops the links of notes that are gone.
   */
  public refresh(): void {
    const views = new Set<MarkdownView>();
    for (const leaf of this.app.workspace.getLeavesOfType(ViewType.Markdown)) {
      if (leaf.view instanceof MarkdownView) {
        views.add(leaf.view);
      }
    }

    for (const view of this.blocks.keys()) {
      if (!views.has(view)) {
        this.removeBlock(view);
      }
    }

    for (const view of views) {
      this.refreshView(view);
    }
  }

  private getLinks(file: TFile): RenderedLink[] {
    const { metadataCache } = this.app;
    const cache = metadataCache.getFileCache(file);
    const addresses: Address[] = getAddresses({
      frontmatter: cache?.frontmatter,
      frontmatterLinks: cache?.frontmatterLinks,
      resolveLinkTitle(link: string): null | string {
        const target = metadataCache.getFirstLinkpathDest(parseLinktext(link).path, file.path);
        if (!target) {
          return null;
        }
        const title: unknown = metadataCache.getFileCache(target)?.frontmatter?.['title'];
        return typeof title === 'string' && title.trim() ? title : target.basename;
      }
    });
    const { mapProvider } = this.getSettings();
    return addresses.map((address) => ({ ...address, url: buildMapUrl(mapProvider, address.query) }));
  }

  private refreshView(view: MarkdownView): void {
    const links = view.file ? this.getLinks(view.file) : [];
    if (links.length === 0) {
      this.removeBlock(view);
      return;
    }

    let blockEl = this.blocks.get(view);
    if (!blockEl) {
      blockEl = createDiv({ cls: BLOCK_CLASS });
      this.blocks.set(view, blockEl);
    }

    const signature = JSON.stringify(links);
    const isChanged = blockEl.dataset['signature'] !== signature;
    if (isChanged) {
      renderLinks(blockEl, links);
      blockEl.dataset['signature'] = signature;
    }

    const propertiesEl = view.metadataEditor.containerEl;
    const isMoved = propertiesEl.nextElementSibling !== blockEl;
    if (isMoved) {
      propertiesEl.after(blockEl);
    }

    if ((isChanged || isMoved) && view.getMode() === 'preview') {
      view.previewMode.renderer.updateHeader();
    }
  }

  private removeBlock(view: MarkdownView): void {
    const blockEl = this.blocks.get(view);
    if (!blockEl) {
      return;
    }
    this.blocks.delete(view);
    const wasInReadingView = blockEl.parentElement !== null && blockEl.parentElement !== view.editMode.sizerEl;
    blockEl.detach();
    if (wasInReadingView) {
      view.previewMode.renderer.updateHeader();
    }
  }
}

/**
 * Opens a map link outside Obsidian: the default browser on desktop, and on Android whatever app the system
 * picks for the URL, which is the Maps app for a Google Maps URL.
 *
 * @param clickEvent - The click.
 * @param url - The map URL.
 */
function openExternally(clickEvent: MouseEvent, url: string): void {
  clickEvent.preventDefault();
  window.open(url, '_blank');
}

function renderLinks(blockEl: HTMLElement, links: readonly RenderedLink[]): void {
  blockEl.empty();
  for (const { key, label, query, url } of links) {
    const itemEl = blockEl.createDiv({ attr: { 'data-address-key': key }, cls: ITEM_CLASS });
    itemEl.createSpan({ cls: LABEL_CLASS, text: label });
    const linkEl = itemEl.createEl('a', {
      attr: { 'aria-label': url, 'href': url, 'rel': 'noopener noreferrer', 'target': '_blank' },
      cls: ['external-link', LINK_CLASS],
      text: query
    });
    linkEl.addEventListener('click', (event_) => {
      openExternally(event_, url);
    });
  }
}
