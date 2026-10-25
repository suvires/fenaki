/**
 * The catalog import file: its shape, validation and the mapping to Payload documents.
 * Pure functions, no database: `index.ts` writes the result.
 *
 * Documents point to each other with stable string keys. Keys starting with `_import` carry
 * provenance for the human review and are not schema fields: only the decisions the schema
 * needs (`launch`, `brandedContent`, `brand`) are read from them.
 */

export interface ImportPerson {
  key: string
  name: string
  slug: string
}

export interface ImportLicense {
  key: string
  name: string
  route: 'embed' | 'open' | 'direct'
  type: string
  attribution?: string | null
  notes?: string | null
}

export interface ImportShort {
  key: string
  es: { title: string; slug: string; synopsis?: string | null }
  durationSeconds: number
  year?: number | null
  country?: string | null
  originalLanguage?: string | null
  type: 'fiction' | 'documentary' | 'animation' | 'experimental'
  noDialogue?: boolean
  credits?: { personKey: string; role: string }[]
  _import?: { launch?: boolean; brandedContent?: boolean; brand?: string | null }
}

export interface ImportSource {
  key: string
  shortKey: string
  provider: 'youtube' | 'vimeo' | 'bunny'
  externalId: string
  url?: string | null
  subtitles?: string[]
  embeddable?: boolean
  status?: 'unchecked' | 'ok' | 'broken' | 'private'
  lastCheckedAt?: string | null
  licenseKey: string
  /** The official channel and the evidence the catalog team recorded for it, in Spanish. */
  _import?: {
    channel?: string | null
    channelType?: string | null
    officialChannelEvidence?: string | null
  }
}

/** The catalog file names who runs a channel in Spanish. */
const CHANNEL_KINDS: Record<string, string> = {
  autor: 'author',
  productora: 'producer',
  distribuidora: 'distributor',
  festival: 'festival',
  escuela: 'school',
  institución: 'institution',
}

export interface ImportCollection {
  key: string
  es: { title: string; slug: string; description?: string | null }
  shortKeys: string[]
  featured?: boolean
  sponsorKey?: string | null
}

export interface ImportFile {
  version: number
  locale: string
  people: ImportPerson[]
  licenses: ImportLicense[]
  shorts: ImportShort[]
  sources: ImportSource[]
  collections: ImportCollection[]
}

const SECTIONS = ['people', 'licenses', 'shorts', 'sources', 'collections'] as const

/** Checks the parts of the file the import relies on and returns it typed. Throws on the first problem list. */
export function parseImportFile(raw: unknown, locale: string): ImportFile {
  const problems: string[] = []
  const file = raw as Partial<ImportFile> | null
  if (!file || typeof file !== 'object') throw new Error('The import file is not a JSON object')
  if (file.version !== 1) problems.push(`unsupported version ${String(file.version)} (expected 1)`)
  if (file.locale !== locale) problems.push(`locale is ${String(file.locale)}, expected ${locale}`)
  for (const section of SECTIONS) {
    if (!Array.isArray(file[section])) problems.push(`"${section}" must be an array`)
  }
  if (problems.length > 0) throw new Error(`Invalid import file: ${problems.join('; ')}`)

  const valid = file as ImportFile
  const keys = (section: (typeof SECTIONS)[number]) => {
    const seen = new Set<string>()
    for (const doc of valid[section]) {
      if (!doc.key) problems.push(`${section}: a document has no key`)
      else if (seen.has(doc.key)) problems.push(`${section}: duplicate key "${doc.key}"`)
      seen.add(doc.key)
    }
    return seen
  }
  const people = keys('people')
  const licenses = keys('licenses')
  const shorts = keys('shorts')
  keys('sources')
  keys('collections')

  const missing = (section: string, key: string, ref: string) =>
    problems.push(`${section} "${key}" points to unknown ${ref}`)
  for (const short of valid.shorts) {
    if (!short.es?.title || !short.es.slug)
      problems.push(`shorts "${short.key}" has no es title or slug`)
    for (const credit of short.credits ?? []) {
      if (!people.has(credit.personKey))
        missing('shorts', short.key, `person "${credit.personKey}"`)
    }
  }
  for (const source of valid.sources) {
    if (!shorts.has(source.shortKey)) missing('sources', source.key, `short "${source.shortKey}"`)
    if (!licenses.has(source.licenseKey))
      missing('sources', source.key, `license "${source.licenseKey}"`)
  }
  for (const collection of valid.collections) {
    if (!collection.es?.title || !collection.es.slug)
      problems.push(`collections "${collection.key}" has no es title or slug`)
    for (const key of collection.shortKeys) {
      if (!shorts.has(key)) missing('collections', collection.key, `short "${key}"`)
    }
    // Sponsors are commercial data: they are entered in the admin panel, never imported.
    if (collection.sponsorKey)
      problems.push(`collections "${collection.key}" has a sponsor; sponsors are not imported`)
  }
  if (problems.length > 0) throw new Error(`Invalid import file:\n- ${problems.join('\n- ')}`)
  return valid
}

export type ShortStatus = 'draft' | 'published' | 'withdrawn'

/**
 * Only shorts marked for launch are published; the rest stay drafts. A short withdrawn in the
 * admin panel (or hidden by the embed checker) stays withdrawn.
 */
export function shortStatus(short: ImportShort, current?: ShortStatus | null): ShortStatus {
  if (current === 'withdrawn') return 'withdrawn'
  return short._import?.launch === true ? 'published' : 'draft'
}

/** A collection is published when at least one of its shorts is. */
export function collectionStatus(
  collection: ImportCollection,
  launched: ReadonlySet<string>,
): 'draft' | 'published' {
  return collection.shortKeys.some((key) => launched.has(key)) ? 'published' : 'draft'
}

export function personData(person: ImportPerson) {
  return { name: person.name, slug: person.slug, importKey: person.key }
}

export function licenseData(license: ImportLicense) {
  return {
    name: license.name,
    route: license.route,
    type: license.type,
    attribution: license.attribution ?? null,
    notes: license.notes ?? null,
    importKey: license.key,
  }
}

export function shortData(
  short: ImportShort,
  personId: (key: string) => number,
  status: ShortStatus,
) {
  const branded = short._import?.brandedContent === true
  return {
    title: short.es.title,
    slug: short.es.slug,
    synopsis: short.es.synopsis ?? null,
    durationSeconds: short.durationSeconds,
    year: short.year ?? null,
    country: short.country ?? null,
    originalLanguage: short.originalLanguage ?? null,
    type: short.type,
    noDialogue: short.noDialogue ?? false,
    brandedContent: branded,
    brand: branded ? (short._import?.brand ?? null) : null,
    credits: (short.credits ?? []).map((credit) => ({
      person: personId(credit.personKey),
      role: credit.role,
    })),
    status,
    sample: false,
    importKey: short.key,
  }
}

export function sourceData(
  source: ImportSource,
  shortId: (key: string) => number,
  licenseId: (key: string) => number,
) {
  return {
    short: shortId(source.shortKey),
    provider: source.provider,
    externalId: source.externalId,
    url: source.url ?? null,
    subtitles: source.subtitles ?? [],
    embeddable: source.embeddable ?? true,
    status: source.status ?? 'unchecked',
    lastCheckedAt: source.lastCheckedAt ?? null,
    channel: {
      name: source._import?.channel ?? null,
      kind: CHANNEL_KINDS[source._import?.channelType ?? ''] ?? null,
    },
    officialEvidence: source._import?.officialChannelEvidence ?? null,
    license: licenseId(source.licenseKey),
    importKey: source.key,
  }
}

/**
 * The collection featured on the home hero and the landing page. When the file features none,
 * the first collection in the file (the editors' order) is featured when it is created; after
 * that, the admin panel decides.
 */
export function featuredKey(collections: ImportCollection[]): string | undefined {
  return collections.find((c) => c.featured)?.key ?? collections[0]?.key
}

export function collectionData(
  collection: ImportCollection,
  shortId: (key: string) => number,
  status: 'draft' | 'published',
  featured = collection.featured ?? false,
) {
  return {
    title: collection.es.title,
    slug: collection.es.slug,
    description: collection.es.description ?? null,
    shorts: collection.shortKeys.map(shortId),
    featured,
    status,
    sample: false,
    importKey: collection.key,
  }
}
