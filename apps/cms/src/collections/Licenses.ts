import type { CollectionConfig } from 'payload'
import { isAdmin, isAuthenticatedField } from '../access.ts'
import { importKeyField } from '../fields/importKey.ts'
import { common, groups, label, options } from '../labels.ts'

export const LICENSE_TYPES = [
  'platform-terms',
  'platform-terms-nc',
  'cc-by',
  'cc-by-sa',
  'cc-by-nd',
  'cc-by-nc',
  'cc-by-nc-sa',
  'cc-by-nc-nd',
  'cc0',
  'public-domain',
  'direct-agreement',
] as const

export type LicenseType = (typeof LICENSE_TYPES)[number]

/**
 * Non-commercial licenses: their shorts can never be part of a sponsored collection. Besides the
 * CC NC licenses, an official embed whose uploader holds the rights only for non-commercial use
 * (a festival whose terms let it publish the entries «sin fines comerciales»).
 */
export function isNonCommercial(type: string | null | undefined): boolean {
  return typeof type === 'string' && (type.startsWith('cc-by-nc') || type === 'platform-terms-nc')
}

export const Licenses: CollectionConfig = {
  slug: 'licenses',
  labels: { singular: label('License', 'Licencia'), plural: label('Licenses', 'Licencias') },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'route', 'type'], group: groups.rights },
  access: {
    read: () => true,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'name',
      label: common.name,
      type: 'text',
      required: true,
      admin: { description: label('Internal name.', 'Nombre interno.') },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'route',
          label: label('Legal route', 'Vía legal'),
          type: 'select',
          required: true,
          options: options({
            embed: label('Official embed', 'Embed oficial'),
            open: label('Open license', 'Licencia abierta'),
            direct: label('Direct license', 'Licencia directa'),
          }),
        },
        {
          name: 'type',
          label: label('License type', 'Tipo de licencia'),
          type: 'select',
          required: true,
          options: options({
            'platform-terms': label(
              'Platform terms (embed)',
              'Condiciones de la plataforma (embed)',
            ),
            'platform-terms-nc': label(
              'Platform terms (embed), non-commercial use only',
              'Condiciones de la plataforma (embed), solo uso no comercial',
            ),
            'cc-by': label('CC BY', 'CC BY'),
            'cc-by-sa': label('CC BY-SA', 'CC BY-SA'),
            'cc-by-nd': label('CC BY-ND', 'CC BY-ND'),
            'cc-by-nc': label('CC BY-NC', 'CC BY-NC'),
            'cc-by-nc-sa': label('CC BY-NC-SA', 'CC BY-NC-SA'),
            'cc-by-nc-nd': label('CC BY-NC-ND', 'CC BY-NC-ND'),
            cc0: label('CC0', 'CC0'),
            'public-domain': label('Public domain', 'Dominio público'),
            'direct-agreement': label('Direct agreement', 'Acuerdo directo'),
          }),
        },
      ],
    },
    {
      name: 'attribution',
      label: label('Attribution', 'Atribución'),
      type: 'textarea',
      admin: {
        description: label(
          'The credit the license requires, word for word.',
          'El crédito que exige la licencia, palabra por palabra.',
        ),
      },
    },
    {
      name: 'signedDocument',
      label: label('Signed document', 'Documento firmado'),
      type: 'upload',
      relationTo: 'license-documents',
      access: { read: isAuthenticatedField },
    },
    {
      type: 'row',
      fields: [
        { name: 'startsAt', label: label('Starts', 'Inicio'), type: 'date' },
        { name: 'endsAt', label: label('Ends', 'Fin'), type: 'date' },
      ],
    },
    {
      name: 'notes',
      label: common.notes,
      type: 'textarea',
      access: { read: isAuthenticatedField },
      admin: { description: common.notesHelp },
    },
    importKeyField(),
  ],
}
