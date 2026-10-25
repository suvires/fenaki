/**
 * The organizations CSV import: parsing, mapping and the idempotent upsert. Pure over a small
 * `Store`, so it runs in tests with invented data; `import/organizations.ts` provides the
 * Payload store and reads the real file, which lives outside this repository.
 */
import type { LegalBasis } from './constants.ts'

export const COLUMNS = [
  'nombre',
  'tipo',
  'pais',
  'ciudad',
  'web',
  'proxima_edicion',
  'por_que_encaja',
  'producto_recomendado',
  'contacto_publico',
  'fuente',
  'prioridad',
  'notas',
] as const
export type Column = (typeof COLUMNS)[number]
export type OrganizationRow = Record<Column, string>

/** RFC 4180 CSV: quoted fields with commas, doubled quotes and line breaks; CRLF; a BOM. */
export function parseCsv(input: string): string[][] {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else quoted = false
      } else field += char
    } else if (char === '"') quoted = true
    else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += char
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''))
}

export function parseOrganizationsCsv(text: string): OrganizationRow[] {
  const [header, ...rows] = parseCsv(text)
  if (!header) throw new Error('The CSV is empty')
  const names = header.map((h) => h.trim())
  const missing = COLUMNS.filter((column) => !names.includes(column))
  if (missing.length > 0) throw new Error(`The CSV lacks the columns: ${missing.join(', ')}`)
  return rows.map((cells) => {
    const row = {} as OrganizationRow
    for (const column of COLUMNS) row[column] = (cells[names.indexOf(column)] ?? '').trim()
    return row
  })
}

const plain = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

const TYPES: Record<string, string> = {
  festival: 'festival',
  escuela: 'school',
  institucion: 'institution',
  'marca cultural': 'brand',
  marca: 'brand',
  distribuidora: 'distributor',
}
const PRODUCTS: Record<string, string> = {
  escaparate: 'showcase',
  coleccion: 'collection',
  'coleccion patrocinada': 'collection',
}

let countryNames: Map<string, string> | undefined
/** «España» → ES, using the Spanish region names of `Intl`. Unknown names stay as written. */
export function countryCode(name: string): string {
  if (!name) return ''
  if (!countryNames) {
    countryNames = new Map()
    const names = new Intl.DisplayNames('es', { type: 'region' })
    for (const a of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ')
      for (const b of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
        const code = a + b
        let display: string | undefined
        try {
          display = names.of(code)
        } catch {
          continue
        }
        if (display && display !== code) countryNames.set(plain(display), code)
      }
  }
  return countryNames.get(plain(name)) ?? name
}

/** A website as a comparison key: no protocol, `www.`, query, fragment or trailing slash. */
export function websiteKey(url: string): string {
  return url
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, '')
    .replace(/^www\./, '')
    .replace(/[?#].*$/, '')
    .replace(/\/+$/, '')
}

export const organizationKey = (name: string, website: string) =>
  `${plain(name)}|${websiteKey(website)}`

/** A single plain address (a `mailto:` prefix is tolerated); contact-form URLs are not emails. */
export function emailOf(value: string): string | null {
  const candidate = value.trim().replace(/^mailto:/i, '')
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(candidate) ? candidate.toLowerCase() : null
}

export interface OrganizationFields {
  name: string
  type: string
  country?: string
  city?: string
  website?: string
  nextEdition?: string
  whyFits?: string
  recommendedProduct?: string
  proposalsChannel?: string
  source?: string
  priority: 'A' | 'B' | 'C'
}

export function organizationFields(row: OrganizationRow): OrganizationFields {
  const priority = row.prioridad.toUpperCase()
  const orNothing = (value: string) => value || undefined
  return {
    name: row.nombre,
    type: TYPES[plain(row.tipo)] ?? 'other',
    country: orNothing(countryCode(row.pais)),
    city: orNothing(row.ciudad),
    website: orNothing(row.web),
    nextEdition: orNothing(row.proxima_edicion),
    whyFits: orNothing(row.por_que_encaja),
    recommendedProduct: row.producto_recomendado
      ? (PRODUCTS[plain(row.producto_recomendado)] ?? 'other')
      : undefined,
    proposalsChannel: orNothing(row.contacto_publico),
    source: orNothing(row.fuente),
    priority: priority === 'A' || priority === 'C' ? priority : 'B',
  }
}

export interface ExistingOrganization {
  id: number
  name: string
  website?: string | null
  notes?: string | null
}

export interface Store {
  organizations(): Promise<ExistingOrganization[]>
  createOrganization(data: Record<string, unknown>): Promise<number>
  updateOrganization(id: number, data: Record<string, unknown>): Promise<void>
  /** Lowercased addresses of every contact. */
  contactEmails(): Promise<Set<string>>
  createContact(data: {
    email: string
    organization: number
    legalBasis: LegalBasis
    legalEvidence: string
  }): Promise<void>
}

export interface ImportSummary {
  created: number
  updated: number
  contactsCreated: number
  contactsSkipped: number
  rowsSkipped: number
}

/**
 * Upserts every row, matched by name and website, so running it again changes nothing that was
 * edited since: the status, dates and (once set) notes are never overwritten. A Contact is
 * created only when «contacto_publico» is an email address: the organization published it to
 * receive proposals, and the source column is the evidence.
 */
export async function importOrganizations(
  rows: OrganizationRow[],
  store: Store,
): Promise<ImportSummary> {
  const summary: ImportSummary = {
    created: 0,
    updated: 0,
    contactsCreated: 0,
    contactsSkipped: 0,
    rowsSkipped: 0,
  }
  const index = new Map<string, ExistingOrganization>()
  for (const existing of await store.organizations())
    index.set(organizationKey(existing.name, existing.website ?? ''), existing)
  const emails = await store.contactEmails()

  for (const row of rows) {
    if (!row.nombre) {
      summary.rowsSkipped++
      continue
    }
    const fields = organizationFields(row)
    const key = organizationKey(row.nombre, row.web)
    const existing = index.get(key)
    let id: number
    if (existing) {
      id = existing.id
      await store.updateOrganization(id, {
        ...fields,
        ...(!existing.notes && row.notas ? { notes: row.notas } : {}),
      })
      summary.updated++
    } else {
      id = await store.createOrganization({
        ...fields,
        status: 'to_contact',
        ...(row.notas ? { notes: row.notas } : {}),
      })
      index.set(key, { id, name: row.nombre, website: row.web, notes: row.notas })
      summary.created++
    }

    const email = emailOf(row.contacto_publico)
    if (!email) continue
    if (emails.has(email)) {
      summary.contactsSkipped++
      continue
    }
    await store.createContact({
      email,
      organization: id,
      legalBasis: 'published_for_proposals',
      legalEvidence: row.fuente || row.web || 'Address published for proposals',
    })
    emails.add(email)
    summary.contactsCreated++
  }
  return summary
}
