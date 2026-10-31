import type { FrontmatterLinkCache } from 'obsidian';

import {
  describe,
  expect,
  it
} from 'vitest';

import type { GetAddressesParams } from './address.ts';

import { getAddresses } from './address.ts';

const PLACE_TITLES: Record<string, string> = {
  'London': 'London',
  'Places/Mexico City#Centre': 'Ciudad de México'
};

function frontmatterLink(key: string, linkText: string, displayText?: string): FrontmatterLinkCache {
  return { key, link: linkText, original: `[[${linkText}]]`, ...(displayText !== undefined && { displayText }) };
}

function read(params: Partial<GetAddressesParams>): ReturnType<typeof getAddresses> {
  return getAddresses({ frontmatter: undefined, frontmatterLinks: undefined, resolveLinkTitle, ...params });
}

function resolveLinkTitle(link: string): null | string {
  return PLACE_TITLES[link] ?? null;
}

describe('getAddresses', () => {
  it('finds nothing in a note without frontmatter', () => {
    expect(read({})).toStrictEqual([]);
  });

  it('joins street, city and country with a comma, and labels each address by its type', () => {
    expect(read({
      frontmatter: {
        homeAddress: { city: 'Paris', country: 'France', street: '1 Rue de Rivoli' },
        title: 'Someone',
        workAddress: { city: 'London', country: 'United Kingdom', street: '10 Downing Street' }
      }
    })).toStrictEqual([
      { key: 'homeAddress', label: 'Home', query: '1 Rue de Rivoli, Paris, France' },
      { key: 'workAddress', label: 'Work', query: '10 Downing Street, London, United Kingdom' }
    ]);
  });

  it('labels any other address type by its key\'s prefix in sentence case', () => {
    expect(
      read({
        frontmatter: {
          'Address': { city: 'Rome' },
          'otherAddress': { city: 'Oslo' },
          'secondHomeAddress': { city: 'Nice' },
          'summer2Address': { city: 'Bergen' },
          'Ünder-scoreAddress': { city: 'Graz' }
        }
      }).map(({ label }) => label)
    ).toStrictEqual(['Address', 'Other', 'Second home', 'Summer2', 'Ünder-score']);
  });

  it('leaves out the parts that are empty or missing, and links a city and a country alone', () => {
    expect(
      read({
        frontmatter: {
          homeAddress: { city: 'Mexico City', country: 'Mexico', street: ' '.repeat(3) },
          workAddress: { country: 'Mexico' }
        }
      }).map(({ query }) => query)
    ).toStrictEqual(['Mexico City, Mexico', 'Mexico']);
  });

  it('skips an address with no usable part, and keys that are not address objects', () => {
    expect(read({
      frontmatter: {
        address: { city: 'Lowercase key' },
        emptyAddress: {},
        listAddress: ['London'],
        nullAddress: null,
        objectAddress: { city: true, country: { name: 'France' }, street: '' },
        textAddress: '10 Downing Street'
      }
    })).toStrictEqual([]);
  });

  it('reads a number as its text', () => {
    expect(read({ frontmatter: { homeAddress: { city: 'Springfield', street: 742 } } }).map(({ query }) => query)).toStrictEqual(['742, Springfield']);
  });

  it('reads a linked part as the title of the place note it resolves to', () => {
    expect(
      read({
        frontmatter: {
          workAddress: { city: '[[Places/Mexico City#Centre|CDMX]]', country: '[[London]]', street: 'Ángel Urraza 1201' }
        },
        frontmatterLinks: [
          frontmatterLink('workAddress.city', 'Places/Mexico City#Centre', 'CDMX'),
          frontmatterLink('workAddress.country', 'London')
        ]
      }).map(({ query }) => query)
    ).toStrictEqual(['Ángel Urraza 1201, Ciudad de México, London']);
  });

  it('reads a link that resolves to no note as its display text, then its link text', () => {
    expect(
      read({
        frontmatter: {
          homeAddress: { city: '[[Nowhere|Somewhere]]', country: '[[Atlantis]]' }
        },
        frontmatterLinks: [
          frontmatterLink('homeAddress.city', 'Nowhere', 'Somewhere'),
          frontmatterLink('homeAddress.country', 'Atlantis')
        ]
      }).map(({ query }) => query)
    ).toStrictEqual(['Somewhere, Atlantis']);
  });

  it('ignores links indexed under other keys', () => {
    expect(
      read({
        frontmatter: { homeAddress: { city: 'Paris' }, related: '[[London]]' },
        frontmatterLinks: [frontmatterLink('related', 'London'), frontmatterLink('homeAddressX.city', 'London')]
      }).map(({ query }) => query)
    ).toStrictEqual(['Paris']);
  });
});
