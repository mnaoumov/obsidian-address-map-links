import type { FrontmatterLinkCache } from 'obsidian';

/**
 * One address of a note, ready to link.
 */
export interface Address {
  /**
   * The frontmatter key the address is under, such as `workAddress`.
   */
  readonly key: string;

  /**
   * The address type in sentence case, such as `Work`.
   */
  readonly label: string;

  /**
   * The non-empty parts, joined with a comma and a space: `street, city, country`.
   */
  readonly query: string;
}

/**
 * What {@link getAddresses} reads.
 */
export interface GetAddressesParams {
  /**
   * The note's frontmatter.
   */
  readonly frontmatter: Record<string, unknown> | undefined;

  /**
   * The links Obsidian indexed in the frontmatter, each keyed by its dotted path (`workAddress.city`).
   */
  readonly frontmatterLinks: readonly FrontmatterLinkCache[] | undefined;

  /**
   * Resolves a link's text to the title of the note it points to.
   *
   * @param link - The link text, such as `London` or `Places/London#Centre`.
   * @returns The note's title, or `null` when the link resolves to no note.
   */
  readonly resolveLinkTitle: (this: void, link: string) => null | string;
}

const ADDRESS_KEY_SUFFIX = 'Address';
const ADDRESS_PARTS = ['street', 'city', 'country'] as const;
const QUERY_SEPARATOR = ', ';

/**
 * Finds a note's addresses: every frontmatter key ending in `Address` whose value is an object with at least
 * one non-empty `street`, `city` or `country`.
 *
 * A part that Obsidian indexed as a link reads as the title of the note it resolves to, and as the link's
 * display text, then its link text, when it resolves to none. Any other part reads as its own text.
 *
 * @param params - The frontmatter, its links and a link resolver.
 * @returns The addresses, in frontmatter order.
 */
export function getAddresses(params: GetAddressesParams): Address[] {
  const { frontmatter, frontmatterLinks, resolveLinkTitle } = params;
  if (!frontmatter) {
    return [];
  }

  const linksByKey = new Map<string, FrontmatterLinkCache>();
  for (const link of frontmatterLinks ?? []) {
    linksByKey.set(link.key, link);
  }

  const addresses: Address[] = [];
  for (const [key, value] of Object.entries(frontmatter)) {
    if (!key.endsWith(ADDRESS_KEY_SUFFIX) || !isRecord(value)) {
      continue;
    }

    const parts: string[] = [];
    for (const partName of ADDRESS_PARTS) {
      const link = linksByKey.get(`${key}.${partName}`);
      const text = link ? resolveLinkTitle(link.link) ?? link.displayText ?? link.link : toText(value[partName]);
      const trimmedText = text.trim();
      if (trimmedText) {
        parts.push(trimmedText);
      }
    }

    if (parts.length > 0) {
      addresses.push({ key, label: getLabel(key), query: parts.join(QUERY_SEPARATOR) });
    }
  }
  return addresses;
}

/**
 * Turns an address key into its label: the key's prefix split at its capitals and in sentence case.
 * `homeAddress` is `Home`, `secondHomeAddress` is `Second home`, and a bare `Address` is `Address`.
 *
 * @param key - The frontmatter key, ending in `Address`.
 * @returns The label.
 */
function getLabel(key: string): string {
  const prefix = key.slice(0, -ADDRESS_KEY_SUFFIX.length);
  const words = prefix.replaceAll(/(?<lower>[\p{Ll}\d])(?<upper>\p{Lu})/gu, '$<lower> $<upper>').toLowerCase();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : ADDRESS_KEY_SUFFIX;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toText(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  return typeof value === 'number' ? String(value) : '';
}
