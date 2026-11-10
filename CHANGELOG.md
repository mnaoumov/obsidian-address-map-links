# CHANGELOG

## 1.0.1

This release has 1 fix and 2 documentation changes. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

### Fixed

- **deps:** override katex and moment past their audit advisories

### Documentation

- link the community directory listing
- link the changelog from the README

## 1.0.0

First release of `Address Map Links`: a note's address properties shown as clickable map links, right under the properties, in Reading view and Live Preview. Nothing is written into the note, so the link always follows the current values.

- **One map link per address**: every property whose name ends in `Address` and whose value is an object, such as `homeAddress`, `workAddress` or a `<type>Address` of your own, gets a link labelled `Home`, `Work` or the type in sentence case.
- **Partial addresses**: `street`, `city` and `country` are all optional, so a city and a country alone, or a street alone, still link.
- **Place notes**: a `city` or `country` that links to a note reads as that note's `title` property, or its name. A link to a missing note reads as its own text. Renaming a place note keeps the map link current.
- **Map provider**: Google Maps by default, OpenStreetMap as a setting, switched live. On Android a Google Maps link opens the Maps app.
- Works on desktop and mobile.
- A demo vault ships with the release, with an **Open demo vault** command and a **Report a bug** command.
