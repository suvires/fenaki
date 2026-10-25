import type { CollectionConfig } from 'payload'
import { isAdmin } from '../access.ts'
import { groups, label } from '../labels.ts'

/** Public images: organization logos for showcases. Film stills live in the Stills collection. */
export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: label('Image', 'Imagen'), plural: label('Images', 'Imágenes') },
  admin: { group: groups.sponsorship, useAsTitle: 'alt' },
  access: {
    read: () => true,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  upload: {
    staticDir: 'media',
    mimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    imageSizes: [{ name: 'logo', width: 480, withoutEnlargement: true }],
  },
  fields: [
    {
      name: 'alt',
      label: label('Alternative text', 'Texto alternativo'),
      type: 'text',
      required: true,
      localized: true,
      admin: {
        description: label(
          'What the image says, for people who cannot see it. For a logo, the organization’s name.',
          'Lo que dice la imagen, para quien no puede verla. En un logo, el nombre de la organización.',
        ),
      },
    },
  ],
}
