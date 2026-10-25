/* eslint-disable @typescript-eslint/no-non-null-assertion -- fixtures are known to exist */
import { describe, expect, it } from 'vitest'
import {
  countryCode,
  emailOf,
  importOrganizations,
  organizationFields,
  parseCsv,
  parseOrganizationsCsv,
  websiteKey,
  type ExistingOrganization,
  type Store,
} from '../src/crm/organizationsImport.ts'

// Invented organizations only: none of these exists.
const HEADER =
  'nombre,tipo,pais,ciudad,web,proxima_edicion,por_que_encaja,producto_recomendado,contacto_publico,fuente,prioridad,notas'
const CSV = [
  HEADER,
  'Festival Ejemplo de Cortos,festival,España,Ciudad Ficticia,https://festival.example.org,"1–5 nov, 2027","Encaja, porque ""sí""",escaparate,propuestas@festival.example.org,https://festival.example.org/bases,A,Primera nota',
  'Escuela Imaginaria de Cine,escuela,México,Villa Inventada,https://escuela.example.org/,,,colección,https://escuela.example.org/contacto,https://escuela.example.org,B,',
  'Distribuidora de Prueba,distribuidora,Atlantis,,,,,,sin-contacto,,Z,',
].join('\r\n')

function memoryStore() {
  const organizations: (ExistingOrganization & Record<string, unknown>)[] = []
  const contacts: Record<string, unknown>[] = []
  let next = 1
  const store: Store = {
    organizations: async () => organizations,
    createOrganization: async (data) => {
      const id = next++
      organizations.push({ id, ...(data as { name: string }) })
      return id
    },
    updateOrganization: async (id, data) => {
      Object.assign(
        organizations.find((o) => o.id === id)!,
        data,
      )
    },
    contactEmails: async () => new Set(contacts.map((c) => String(c.email))),
    createContact: async (data) => {
      contacts.push(data)
    },
  }
  return { store, organizations, contacts }
}

describe('parseCsv', () => {
  it('handles quotes, commas, doubled quotes, line breaks, CRLF and a BOM', () => {
    expect(parseCsv('﻿a,"b,1","say ""hi""","x\ny"\r\nc,d,e,f\n')).toEqual([
      ['a', 'b,1', 'say "hi"', 'x\ny'],
      ['c', 'd', 'e', 'f'],
    ])
  })
})

describe('parseOrganizationsCsv', () => {
  it('reads rows by column name', () => {
    const rows = parseOrganizationsCsv(CSV)
    expect(rows).toHaveLength(3)
    expect(rows[0]).toMatchObject({
      nombre: 'Festival Ejemplo de Cortos',
      proxima_edicion: '1–5 nov, 2027',
      por_que_encaja: 'Encaja, porque "sí"',
    })
  })
  it('names the columns that are missing', () => {
    expect(() => parseOrganizationsCsv('nombre,tipo\nA,festival')).toThrow(/pais/)
  })
})

describe('mapping', () => {
  it('maps type, country, product and priority', () => {
    const [a, b, c] = parseOrganizationsCsv(CSV).map(organizationFields)
    expect(a).toMatchObject({
      type: 'festival',
      country: 'ES',
      recommendedProduct: 'showcase',
      priority: 'A',
    })
    expect(b).toMatchObject({
      type: 'school',
      country: 'MX',
      recommendedProduct: 'collection',
      priority: 'B',
    })
    expect(c).toMatchObject({ type: 'distributor', country: 'Atlantis', priority: 'B' })
    expect(a?.proposalsChannel).toBe('propuestas@festival.example.org')
    expect(b?.proposalsChannel).toBe('https://escuela.example.org/contacto')
  })
  it('knows the other kinds', () => {
    const type = (tipo: string) =>
      organizationFields({ ...parseOrganizationsCsv(CSV)[0]!, tipo }).type
    expect(type('institución')).toBe('institution')
    expect(type('marca cultural')).toBe('brand')
    expect(countryCode('Argentina')).toBe('AR')
  })
  it('tells emails from contact-form URLs', () => {
    expect(emailOf(' Info@Example.ORG ')).toBe('info@example.org')
    expect(emailOf('mailto:a@b.example')).toBe('a@b.example')
    expect(emailOf('https://x.example/contacto')).toBeNull()
    expect(emailOf('escribir a info@x.example')).toBeNull()
    expect(emailOf('')).toBeNull()
  })
  it('compares websites without protocol, www or trailing slash', () => {
    expect(websiteKey('HTTPS://www.Example.org/')).toBe(websiteKey('http://example.org'))
  })
})

describe('importOrganizations', () => {
  it('creates organizations, and contacts only for email addresses', async () => {
    const { store, organizations, contacts } = memoryStore()
    const summary = await importOrganizations(parseOrganizationsCsv(CSV), store)
    expect(summary).toMatchObject({
      created: 3,
      updated: 0,
      contactsCreated: 1,
      contactsSkipped: 0,
    })
    expect(organizations.every((o) => o.status === 'to_contact')).toBe(true)
    expect(contacts).toEqual([
      {
        email: 'propuestas@festival.example.org',
        organization: 1,
        legalBasis: 'published_for_proposals',
        legalEvidence: 'https://festival.example.org/bases',
      },
    ])
  })

  it('is idempotent and never overwrites what was worked on', async () => {
    const { store, organizations, contacts } = memoryStore()
    const rows = parseOrganizationsCsv(CSV)
    await importOrganizations(rows, store)
    organizations[0]!.status = 'negotiation'
    organizations[0]!.notes = 'Mi nota'
    organizations[1]!.notes = undefined

    const again = await importOrganizations(
      parseOrganizationsCsv(
        CSV.replace('Villa Inventada', 'Otra Villa').replace(
          'https://escuela.example.org/,',
          'http://www.escuela.example.org,',
        ),
      ),
      store,
    )
    expect(again).toMatchObject({ created: 0, updated: 3, contactsCreated: 0, contactsSkipped: 1 })
    expect(organizations).toHaveLength(3)
    expect(contacts).toHaveLength(1)
    expect(organizations[0]).toMatchObject({ status: 'negotiation', notes: 'Mi nota' })
    expect(organizations[1]).toMatchObject({ city: 'Otra Villa' })
  })

  it('skips rows without a name', async () => {
    const { store } = memoryStore()
    const rows = parseOrganizationsCsv(`${HEADER}\n,festival,,,,,,,,,,`)
    expect(await importOrganizations(rows, store)).toMatchObject({ created: 0, rowsSkipped: 1 })
  })

  it('does not give one address to two organizations', async () => {
    const { store, contacts } = memoryStore()
    const rows = parseOrganizationsCsv(
      `${HEADER}\nUna,festival,España,,https://una.example,,,,hola@mismo.example,,A,\nOtra,festival,España,,https://otra.example,,,,hola@mismo.example,,A,`,
    )
    expect(await importOrganizations(rows, store)).toMatchObject({
      contactsCreated: 1,
      contactsSkipped: 1,
    })
    expect(contacts).toHaveLength(1)
  })
})
