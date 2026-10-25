import type { CollectionConfig } from 'payload'
import { isAdmin, isAuthenticatedField } from '../access.ts'
import { groups, label, options } from '../labels.ts'

export const STILL_ORIGINS = ['provider', 'author'] as const
export type StillOrigin = (typeof STILL_ORIGINS)[number]

/**
 * The only film stills Fenaki shows, always served from its own server (visitors never request
 * images from YouTube or Vimeo). A `provider` still is the provider's thumbnail, downloaded and
 * refreshed nightly by the embed checker. An `author` still was supplied by the rights holder:
 * the checker never replaces or deletes it.
 *
 * Decorative image: the page already names the short in text, so it has no alt text.
 */
export const Stills: CollectionConfig = {
  slug: 'stills',
  labels: { singular: label('Still', 'Fotograma'), plural: label('Stills', 'Fotogramas') },
  admin: {
    group: groups.catalog,
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'short', 'origin', 'fetchedAt'],
  },
  access: {
    read: () => true,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  upload: {
    staticDir: 'media/stills',
    mimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    imageSizes: [
      { name: 'hero', width: 1600, withoutEnlargement: true, formatOptions: { format: 'webp' } },
      // The thumbnail of a short card in rails and grids.
      { name: 'card', width: 640, withoutEnlargement: true, formatOptions: { format: 'webp' } },
    ],
  },
  fields: [
    {
      name: 'short',
      label: label('Short', 'Corto'),
      type: 'relationship',
      relationTo: 'shorts',
      required: true,
      index: true,
    },
    {
      name: 'origin',
      label: label('Origin', 'Origen'),
      type: 'select',
      required: true,
      defaultValue: 'author',
      options: options({
        provider: label('Provider thumbnail', 'Miniatura del proveedor'),
        author: label('Supplied by the author', 'Aportado por el autor'),
      }),
      admin: {
        description: label(
          'Provider stills are refreshed every night. Author stills are never touched by the checker.',
          'Las del proveedor se renuevan cada noche. La comprobación nunca toca las del autor.',
        ),
      },
    },
    {
      name: 'source',
      label: label('Source', 'Fuente'),
      type: 'relationship',
      relationTo: 'sources',
      admin: {
        condition: (data) => data?.origin === 'provider',
        description: label(
          'The source the thumbnail was downloaded from.',
          'La fuente de la que se descargó la miniatura.',
        ),
      },
    },
    {
      name: 'fetchedAt',
      label: label('Downloaded on', 'Descargada el'),
      type: 'date',
      admin: {
        condition: (data) => data?.origin === 'provider',
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
    {
      name: 'permissionNote',
      label: label('Permission', 'Permiso'),
      type: 'textarea',
      access: { read: isAuthenticatedField },
      admin: {
        condition: (data) => data?.origin === 'author',
        description: label(
          'Who granted the use of this still, and when. Internal.',
          'Quién concedió el uso de este fotograma, y cuándo. Interno.',
        ),
      },
    },
  ],
}
