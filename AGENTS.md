# AGENTS.md

This file provides guidance to AI coding agents working with code in this repository.

## Overview

`Address Map Links` renders a note's address properties as a clickable map link when the note is read, in Reading view and Live Preview. Nothing is written into the note: no stored URL, no `map_link` property, no coordinates. The note stays valid and readable without the plugin, and the link is always built from the current property values.

What already exists, so the plugin does not rebuild it:

- **`Geocoding Properties`** writes a map link into the frontmatter when a command is run, so the link is stored and goes stale when the address changes.
- **`Geo Capture`** (`geo-capture`), **`Corduroy`** (`corduroy`) and **`Geocode Note`** (`geocode-note`) look an address up and store coordinates in the note.

None of them renders a live link from address properties the note already has. That is this plugin's whole scope.

## Current state

The repo was generated on 2026-10-29 with `create-obsidian-plugin` (preset `all-in-one`, desktop and mobile, the unofficial API subset, no editor extensions). Its answers are in `.create-obsidian-plugin.json`. The plugin (`src/main.ts`, `src/plugin*.ts`) is still the generated sample; nothing below is built yet.

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

- **Reading view:** a markdown post-processor on the properties section, or a small block after the frontmatter, listing one link per address.
- **Live Preview:** the same block in the editor. Decide between a CodeMirror widget after the properties and a decoration of the Properties panel's nested-object row by what the panel actually renders for an object value; record the decision here.
- Read the values from `metadataCache.getFileCache(file).frontmatter`, and re-render on `metadataCache` `changed` for the file.

### Settings

- Map provider: Google Maps (default) or OpenStreetMap, an enum dropdown.
