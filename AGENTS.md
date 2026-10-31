# AGENTS.md

This file provides guidance to AI coding agents working with code in this repository.

## Overview

`Address Map Links` renders a note's address properties as a clickable map link when the note is read, in Reading view and Live Preview. Nothing is written into the note: no stored URL, no `map_link` property, no coordinates. The note stays valid and readable without the plugin, and the link is always built from the current property values.

What already exists, so the plugin does not rebuild it:

- **`Geocoding Properties`** writes a map link into the frontmatter when a command is run, so the link is stored and goes stale when the address changes.
- **`Geo Capture`** (`geo-capture`), **`Corduroy`** (`corduroy`) and **`Geocode Note`** (`geocode-note`) look an address up and store coordinates in the note.

None of them renders a live link from address properties the note already has. That is this plugin's whole scope.

## Current state

The repo was generated on 2026-10-29 with `create-obsidian-plugin` (preset `all-in-one`, desktop and mobile, the unofficial API subset, no editor extensions). Its answers are in `.create-obsidian-plugin.json`.

**Built: the address links.** `src/address/address.ts` reads a note's addresses from its frontmatter and indexed frontmatter links (pure, no `App`). `src/map-provider.ts` builds the URL for each provider. `src/address/address-map-links-component.ts` puts one block of links (`.address-map-links-block`) right after the properties of every open `MarkdownView` and keeps it current. The `mapProvider` setting picks the provider. The scaffold's sample commands and sample setting are gone.

**Built: the demo vault.** `01 Address links` shows the shape and the links on `Materials/01 Address links/Ada Example.md`, `02 Settings` the provider. The demo-vault coverage suite checks every `PluginSettings` field is documented.

**Tests:** unit tests at 100% coverage, and `src/address/address-map-links.cross-platform.integration.test.ts` drives Live Preview, the click, a property edit, Reading view, the provider setting and the way back, on desktop and Android.

**Not yet:** the public repo, the README's prior-art table and screenshots, the release and the directory listing.

## Design

### The address shape it reads

One nested object per address type, named `<type>Address`: `homeAddress`, `workAddress`, `otherAddress`, and any other key ending in `Address` whose value is an object. Each object holds up to three keys:

```yaml
workAddress:
  street: 10 Downing Street
  city: "[[London]]"
  country: "[[United Kingdom]]"
```

- `street` is plain text.
- `city` and `country` are links to place notes, or plain text. A link is resolved to its note, and the query uses that note's title (its `title` property when present, otherwise its base name). A link that resolves to nothing uses its display text, then its link text.
- Every key is optional. The plugin renders a link when at least one of the three is non-empty, so a city and a country alone still link.

Obsidian indexes a link at a nested path: `frontmatterLinks` entries carry the dotted key (`workAddress.city`), so backlinks and the graph see them, and the rename updater writes the new link back through `key.split('.')`. Verified in `app.js` of Obsidian 1.14.5 and catalyst 1.15.0 on 2026-10-29. So a renamed place note keeps every address that links to it current without this plugin.

The Properties panel does not edit nested objects; they are edited in Source mode or with `Nested Properties`. That is a deliberate trade for several addresses per note, not something this plugin works around.

### The link

- The query is `street, city, country`, the non-empty parts joined with a comma and a space.
- Google Maps by default: `https://www.google.com/maps/search/?api=1&query=<url-encoded query>`. OpenStreetMap as the alternative provider setting: `https://www.openstreetmap.org/search?query=<url-encoded query>`.
- The link opens externally: the default browser on desktop, and on Android the system hands a Google Maps URL to the Maps app.
- One link per address object, labelled by its type (`Home`, `Work`, or the key's prefix in sentence case for other types).

### Where it renders

**Decided (2026-10-31): one block placed right after the view's properties container, in both modes.** Neither a post-processor nor a CodeMirror widget:

- A `MarkdownView` owns one properties container, `metadataEditor.containerEl`, and moves it on every mode switch: `editMode.show()` prepends it to `editMode.sizerEl` (`.cm-sizer`), and `previewMode.show()` appends it to `renderer.header.el` (`.mod-header`). The same placement `Sibling Notes` uses for its bars. So one element, inserted as the container's next sibling, sits under the properties in Live Preview and in Reading view, and is re-placed after every `MarkdownView.setMode`, which the component patches.
- A Reading view post-processor renders inside the note's sections and a CodeMirror widget inside the document's lines, so neither would sit under the properties, and the two modes would need two implementations.
- The block sits outside `.cm-content`, so CodeMirror never treats a click on it as an edit. In Reading view `renderer.updateHeader()` re-measures the header after the block moves or changes, because the renderer lays sections out by their measured heights.
- Source mode hides it through CSS (`.markdown-source-view:not(.is-live-preview)`), since the frontmatter shows as text there.
- Values come from `metadataCache.getFileCache(file)`: `frontmatter` for the parts, `frontmatterLinks` (dotted keys) for which part is a link and its target. A link resolves with `getFirstLinkpathDest`. Every open view is refreshed, debounced 50 ms, on `metadataCache` `changed` and `resolved`, `layout-change`, `file-open` and a settings change. A block is re-rendered only when its links changed.
- A click opens the URL with `window.open`, which Obsidian sends to the system browser on desktop and to the system on Android. The integration test checks the call on both platforms; that Android then picks the Maps app is the system's choice and is not tested.

### Settings

- Map provider: Google Maps (default) or OpenStreetMap, an enum dropdown.
