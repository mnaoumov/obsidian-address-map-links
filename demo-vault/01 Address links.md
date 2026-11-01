# Address links

`Address Map Links` reads each address of a note from its properties and shows it as a map link right under the properties, in Reading view and in Live Preview. Source mode shows the raw properties and no links.

## The properties it reads

Every property whose name ends in `Address` and whose value is an object is one address: `homeAddress`, `workAddress`, `otherAddress`, or any other `<type>Address`. Each holds up to three keys, all optional:

```yaml
workAddress:
  street: 10 Downing Street
  city: "[[London]]"
  country: "[[United Kingdom]]"
```

- `street` is plain text.
- `city` and `country` are links to place notes, or plain text. A link reads as its place note's `title` property, or the note's name when it has none. A link to a note that does not exist reads as its alias, then its link text.

The link text is the non-empty parts joined with a comma, so an address with only a city and a country still gets a link. Each link is labelled by its type: `Work`, `Home`, or the property name's prefix in sentence case, such as `Second home` for `secondHomeAddress`.

The Properties panel does not edit an object value. Edit addresses in Source mode, or with the `Nested Properties` plugin.

## See it

[Ada Example](<./Materials/01 Address links/Ada Example.md>) has a work address with all three parts, and a home address with only a city and a country. Her work city links to [London](<./Materials/01 Address links/Places/London.md>), whose `title` is `City of London`, so the link reads `City of London`. Her work country links to [United Kingdom](<./Materials/01 Address links/Places/United Kingdom.md>), which has no `title`, so it reads as the note's name.

```code-button
---
caption: Open the sample person in Live Preview
---
await require('/demoSetup.ts').openSamplePerson(app, 'source');
```

Manual equivalent: open `Ada Example` and switch to Live Preview (`Ctrl+E` / `Cmd+E` toggles Reading view).

Click a link: it opens in your browser on desktop, and in the Maps app on Android.

## Every other shape

[Bruno Example](<./Materials/01 Address links/Bruno Example.md>) shows the rest:

- a `homeAddress` whose city links to `Porto`, a note that does not exist, so the link reads `Porto`;
- a `holidayHomeAddress`, a type of your own, labelled `Holiday home`;
- a `studioAddress` with only a street;
- an `emailAddress` that holds text, not an object, so it is not an address and gets no link.

```code-button
---
caption: Open the second sample person in Reading view
---
await require('/demoSetup.ts').openSecondSamplePerson(app, 'preview');
```

Manual equivalent: open `Bruno Example`.

## Nothing is stored

Change a property, and the link follows as soon as Obsidian re-reads the note. Rename a place note, and Obsidian updates the links in every address that points to it, so the map link follows too. Disable the plugin, and the note is still plain, readable properties.
