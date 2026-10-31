# Start here

This is an [Obsidian](https://obsidian.md/) vault that documents the [Address Map Links](https://github.com/mnaoumov/obsidian-address-map-links/) plugin by demonstrating it. Every feature has a note that says what it does and why you would want it, and a button you can press to watch it happen.

`Address Map Links` renders a note's address properties as clickable map links when the note is read, in Reading view and Live Preview. Nothing is written into the note, so the links always follow the current property values.

## Your first minute

Below this paragraph is a **code button** — a captioned rectangle. It is not a picture of a button: **clicking it runs the code**, and the result appears underneath it. The `</>` toggle beside the caption reveals the code it runs, so nothing here is a black box.

```code-button
---
caption: Open the sample person in Reading view
---
await require('/demoSetup.ts').openSamplePerson(app, 'preview');
```

Under the note's properties you now see two lines, **Work** and **Home**, each a link that opens the address in Google Maps.

Every button in this vault also states its **manual equivalent**, so you learn the real steps rather than depending on the buttons. This one is: open [Ada Example](<./Materials/01 Address links/Ada Example.md>).

## Features

| Note | What it covers |
| --- | --- |
| [01 Address links](<./01 Address links.md>) | The address properties the plugin reads, and the links it shows for them. |
| [02 Settings](<./02 Settings.md>) | Every setting, by the key it is stored under in `data.json`. |

## Materials

`Materials/` holds the notes the walkthroughs operate on, so you never have to build a fixture to see a feature working.
