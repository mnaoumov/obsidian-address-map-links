---
homeAddress:
  street: Rua das Flores 12
  city: "[[Porto]]"
  country: Portugal
holidayHomeAddress:
  city: Funchal
  country: Portugal
studioAddress:
  street: Avenida da Liberdade 100, Lisbon
emailAddress: bruno@example.com
obsidian-dev-toolkit:
  demo-vault-validation:
    allow-wikilinks: Obsidian indexes a link in a property only as a wikilink, and this one is left unresolved on purpose to show what an address link reads for it.
---

# Bruno Example

A sample person with the remaining address shapes. The map links show right under the properties above. Back to [Address links](<../../01 Address links.md>).

- `homeAddress` links its city to `Porto`, which has no note in this vault, so the link reads as its link text, `Porto`.
- `holidayHomeAddress` is a type of your own: its label is `Holiday home`.
- `studioAddress` has only a street, which is enough for a link.
- `emailAddress` ends in `Address` but holds text, not an object, so it gets no link.
