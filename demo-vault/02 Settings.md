# Settings

Every setting `Address Map Links` stores, listed by the **key it is written under in `data.json`** rather than by its display label — that is what you see when you open the file, hit a sync conflict, or read a support thread.

Find them in Obsidian under **Settings → Community plugins → `Address Map Links`**.

## General

- `mapProvider`
  - the map service an address link opens, shown in the settings tab as **Map provider**.
  - `googleMaps` (the default) opens a Google Maps search, which Android hands to the Maps app.
  - `openStreetMap` opens an OpenStreetMap search in the browser.

## Try it

Change the setting without leaving this note. The change applies live — every open note's links are rebuilt, so there is no reload.

```code-button
---
caption: Set mapProvider to OpenStreetMap
---
await require('/demoSetup.ts').setMapProvider(app, 'openStreetMap');
```

Manual equivalent: pick **OpenStreetMap** under **Map provider** in the settings tab.

Open [Ada Example](<./Materials/01 Address links/Ada Example.md>) now and hover a link: it points at `openstreetmap.org`. When you are done, put it back:

```code-button
---
caption: Reset mapProvider to Google Maps
---
await require('/demoSetup.ts').setMapProvider(app, 'googleMaps');
```

Manual equivalent: pick **Google Maps** again.
